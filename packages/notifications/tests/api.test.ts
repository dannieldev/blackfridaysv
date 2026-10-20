import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { handleRequest, type Env } from '../../../apps/web/worker/index.js';
import { hashToken, unsubscribeToken } from '../src/service.js';

const site = 'https://site.example.invalid';
const env: Env = {
  SUPABASE_URL: 'https://db.example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-server-key',
  EMAIL_TOKEN_SECRET: 's'.repeat(64), RESEND_API_KEY: 'test-key', EMAIL_FROM: 'sender@example.invalid',
  SITE_URL: site, SUBSCRIPTIONS_ENABLED: 'true',
  ASSETS: { fetch: async () => Response.json([{ id: 'siman-tv', title: 'Televisor' }]) },
};
const input = { email: 'buyer@example.invalid', consent: true, newsletter: true, categories: ['gaming'], maxBudget: 100, alert: null };
const post = (body: unknown = input, origin = site) => new Request(`${site}/api/subscriptions`, {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' }, body: JSON.stringify(body),
});
afterEach(() => { mock.restoreAll(); });

test('disabled configuration is explicit and does not save an email', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected external request'); });
  const disabled = { ...env, SUBSCRIPTIONS_ENABLED: 'false' };
  const config = await handleRequest(new Request(`${site}/api/subscriptions/config`), disabled);
  assert.deepEqual(await config.json(), { enabled: false });
  assert.equal(config.headers.get('Cache-Control'), 'no-store');
  assert.equal((await handleRequest(post(), disabled)).status, 503);
});

test('foreign origins, missing consent and bots never reach the database or Resend', async () => {
  let calls = 0;
  mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('Unexpected request'); });
  assert.equal((await handleRequest(post(input, 'https://foreign.example.invalid'), env)).status, 403);
  assert.equal((await handleRequest(post({ ...input, consent: false }), env)).status, 400);
  assert.equal((await handleRequest(post({ ...input, website: 'bot' }), env)).status, 202);
  assert.equal((await handleRequest(post({ ...input, email: 'x'.repeat(9000) }), env)).status, 400);
  assert.equal(calls, 0);
});

test('signup persists a hashed token and requested interests before sending confirmation', async () => {
  let pending: Record<string, unknown> | undefined;
  let mail: { text: string; to: string[] } | undefined;
  const calls: string[] = [];
  mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    calls.push(url);
    const body = JSON.parse(String(init.body));
    if (url.endsWith('/bf_email_rate_limit')) {
      assert.match(body.p_key, /^[a-f0-9]{64}$/);
      assert.ok(!String(init.body).includes(input.email));
      return Response.json(true);
    }
    if (url.endsWith('/email_opt_ins')) { pending = body; return Response.json([{ id: 'pending-id' }]); }
    if (url === 'https://api.resend.com/emails') {
      assert.ok(pending); mail = body;
      assert.equal(new Headers(init.headers).get('Idempotency-Key'), 'confirm/pending-id');
      return Response.json({ id: 'provider-id' });
    }
    throw new Error('Unexpected request');
  });
  const response = await handleRequest(post(), env);
  assert.equal(response.status, 202);
  assert.deepEqual(pending?.payload, { newsletter: true, categories: ['gaming'], maxBudget: 100, alert: null });
  const token = mail!.text.match(/token=([a-f0-9]{64})/)![1];
  assert.equal(pending!.token_hash, await hashToken(token));
  assert.ok(!JSON.stringify(pending).includes(token));
  assert.deepEqual(mail!.to, [input.email]);
  assert.equal(calls.some(path => path.includes('email_subscribers')), false);
});

test('rate limits stop the request early and unknown products are never stored', async () => {
  let calls = 0;
  mock.method(globalThis, 'fetch', async () => { calls++; return Response.json(false); });
  assert.equal((await handleRequest(post(), env)).status, 429); assert.equal(calls, 1);
  mock.restoreAll();
  mock.method(globalThis, 'fetch', async (url: string) => {
    assert.ok(url.endsWith('/bf_email_rate_limit')); return Response.json(true);
  });
  assert.equal((await handleRequest(post({ ...input, alert: { productId: 'siman-missing', targetPrice: 100 } }), env)).status, 400);
});

test('mail provider failure is reported honestly without exposing its response or activating subscribers', async () => {
  mock.method(globalThis, 'fetch', async (url: string) => {
    if (url.endsWith('/bf_email_rate_limit')) return Response.json(true);
    if (url.endsWith('/email_opt_ins')) return Response.json([{ id: 'pending-id' }]);
    if (url === 'https://api.resend.com/emails') return new Response('sensitive provider response', { status: 500 });
    throw new Error('Unexpected request');
  });
  const response = await handleRequest(post(), env);
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /sensitive provider|test-key|test-server/);
});

test('email scanners cannot activate a subscription by visiting its link', async () => {
  let calls = 0;
  mock.method(globalThis, 'fetch', async () => { calls++; return Response.json('subscriber-id'); });
  const token = 'a'.repeat(64);
  const response = await handleRequest(new Request(`${site}/api/subscriptions/confirm?token=${token}`), env);
  assert.equal(response.status, 200); assert.equal(calls, 0);
  assert.match(await response.text(), /form method="post"/);
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  const confirm = await handleRequest(new Request(`${site}/api/subscriptions/confirm`, {
    method: 'POST', headers: { Origin: site }, body: new URLSearchParams({ token }),
  }), env);
  assert.equal(confirm.status, 200); assert.equal(calls, 1);
});

test('unsubscribe requires a signed link; GET is safe and provider one-click POST works without cookies', async () => {
  let calls = 0;
  const id = '11111111-1111-1111-1111-111111111111';
  const token = await unsubscribeToken(id, env.EMAIL_TOKEN_SECRET);
  mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    calls++; assert.ok(url.endsWith('/bf_unsubscribe')); assert.deepEqual(JSON.parse(String(init.body)), { p_subscriber: id });
    return Response.json(true);
  });
  const link = `${site}/api/subscriptions/unsubscribe?token=${token}`;
  assert.equal((await handleRequest(new Request(link), env)).status, 200); assert.equal(calls, 0);
  assert.equal((await handleRequest(new Request(link.replace(token, 'invalid')), env)).status, 400);
  assert.equal((await handleRequest(new Request(link, { method: 'POST', body: 'List-Unsubscribe=One-Click' }), { ...env, SUBSCRIPTIONS_ENABLED: 'false' })).status, 204);
  assert.equal(calls, 1);
});

test('expired confirmations return an actionable page and assets remain independent of the API', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json(null));
  const response = await handleRequest(new Request(`${site}/api/subscriptions/confirm`, {
    method: 'POST', headers: { Origin: site }, body: new URLSearchParams({ token: 'a'.repeat(64) }),
  }), env);
  assert.equal(response.status, 410);
  const asset = await handleRequest(new Request(`${site}/data/deals-snapshot.json`), { ...env, ASSETS: { fetch: async () => new Response('static catalog') } });
  assert.equal(await asset.text(), 'static catalog');
});
