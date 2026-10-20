import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateSubscription, type CatalogProduct, type Subscriber } from '../src/contracts.js';
import { confirmationEmail, sendEmail } from '../src/email.js';
import { notificationEmail, selectMatches } from '../src/matches.js';
import { Database, hashToken, randomToken, unsubscribeToken, verifyUnsubscribe, type ServiceEnvironment } from '../src/service.js';
import { deliverNotifications } from '../src/delivery.js';

const now = Date.parse('2026-10-20T15:00:00Z');
const product: CatalogProduct = { id: 'siman-tv', title: '<script>TV</script>', store: 'Siman', category: 'tv_audio', currentPrice: 100,
  updatedAt: new Date(now - 3600000).toISOString(), history: [
    { date: new Date(now - 86400000).toISOString(), price: 120 }, { date: new Date(now - 3600000).toISOString(), price: 100 },
  ] };
const subscriber: Subscriber = { id: '11111111-1111-1111-1111-111111111111', email: 'buyer@example.invalid', newsletter: true, categories: [], max_budget: null, digest_prices: {}, price_alerts: [] };
const env: ServiceEnvironment = { SUPABASE_URL: 'https://db.example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'server-key',
  SITE_URL: 'https://site.example.invalid', EMAIL_TOKEN_SECRET: 's'.repeat(64), RESEND_API_KEY: 'test-key', EMAIL_FROM: 'test@example.invalid', SUBSCRIPTIONS_ENABLED: 'true' };
const input = { email: ' Buyer@Example.invalid ', consent: true, newsletter: true, categories: ['gaming', 'gaming'], maxBudget: 100.126, alert: null };

test('subscription input requires affirmative consent, known interests and valid prices', () => {
  const parsed = validateSubscription(input);
  assert.equal(parsed.email, subscriber.email); assert.deepEqual(parsed.categories, ['gaming']); assert.equal(parsed.maxBudget, 100.13);
  for (const changes of [{ consent: false }, { consent: 'true' }, { email: 'a\r\nb@c.test' }, { categories: ['unknown'] }, { newsletter: false },
    { maxBudget: 0.001 }, { maxBudget: Infinity }, { alert: { productId: 'unknown-1', targetPrice: 2 } }, { alert: { productId: 'siman-1', targetPrice: 0.001 } }]) {
    assert.throws(() => validateSubscription({ ...input, ...changes }));
  }
});

test('digest only includes recent observed drops in the selected category and budget', () => {
  assert.equal(selectMatches(subscriber, [product], now).length, 1);
  for (const changes of [{ history: [] }, { currentPrice: 120 }, { updatedAt: new Date(now + 1000).toISOString() },
    { updatedAt: new Date(now - 86400001).toISOString() }, { refreshStatus: 'retained' }, { inStock: false }]) {
    assert.equal(selectMatches(subscriber, [{ ...product, ...changes }], now).length, 0);
  }
  assert.equal(selectMatches({ ...subscriber, categories: ['gaming'] }, [product], now).length, 0);
  assert.equal(selectMatches({ ...subscriber, max_budget: 99 }, [product], now).length, 0);
  assert.equal(selectMatches({ ...subscriber, digest_prices: { [product.id]: 100 } }, [product], now).length, 0);
});

test('price targets work without history and notify again only below the last notified price', () => {
  const watch = { ...subscriber, newsletter: false, price_alerts: [{ product_id: product.id, target_price: 100, last_notified_price: null, enabled: true }] };
  assert.equal(selectMatches(watch, [{ ...product, history: [] }], now).length, 1);
  assert.equal(selectMatches(watch, [{ ...product, currentPrice: 101 }], now).length, 0);
  const notified = { ...watch, price_alerts: [{ ...watch.price_alerts[0], last_notified_price: 100 }] };
  assert.equal(selectMatches(notified, [product], now).length, 0);
  assert.equal(selectMatches(notified, [{ ...product, currentPrice: 99 }], now).length, 1);
});

test('mail escapes catalog text, links to the exact product and contains a signed one-click unsubscribe', async () => {
  const payload = (await notificationEmail(subscriber, [product], env.SITE_URL, env.EMAIL_TOKEN_SECRET, now))!;
  assert.match(payload.mail.html, /&lt;script&gt;TV&lt;\/script&gt;/); assert.doesNotMatch(payload.mail.html, /<script>/);
  assert.match(payload.mail.text, /#deal-siman-tv/);
  const url = new URL(payload.mail.headers!['List-Unsubscribe'].slice(1, -1));
  assert.equal(await verifyUnsubscribe(url.searchParams.get('token')!, env.EMAIL_TOKEN_SECRET), subscriber.id);
  assert.equal(payload.mail.headers!['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.equal(Date.parse(payload.validUntil), Date.parse(product.updatedAt) + 86400000);
  const confirmation = confirmationEmail(validateSubscription({ ...input, alert: { productId: product.id, targetPrice: 90 } }), 'https://site.example.invalid/confirm', product.title);
  assert.doesNotMatch(confirmation.html, /<script>/); assert.match(confirmation.text, /24 horas/);
});

test('tokens are random, stored as hashes and unsubscribe signatures reject tampering', async () => {
  const token = randomToken(); assert.match(token, /^[a-f0-9]{64}$/); assert.notEqual(token, randomToken()); assert.notEqual(await hashToken(token), token);
  const signed = await unsubscribeToken(subscriber.id, env.EMAIL_TOKEN_SECRET);
  assert.equal(await verifyUnsubscribe(signed.replace(/^1/, '2'), env.EMAIL_TOKEN_SECRET), null);
  assert.equal(await verifyUnsubscribe(signed, 'x'.repeat(64)), null);
});

test('Resend requests preserve the durable idempotency key and do not leak provider errors', async () => {
  const transport: typeof fetch = async (_url, init) => {
    assert.equal(new Headers(init?.headers).get('Idempotency-Key'), 'notification/job');
    assert.deepEqual(JSON.parse(String(init?.body)).to, [subscriber.email]);
    return Response.json({ id: 'provider-id' });
  };
  assert.equal(await sendEmail(env, subscriber.email, { subject: 'test', text: 'test', html: '<p>test</p>' }, 'notification/job', transport), 'provider-id');
  await assert.rejects(sendEmail(env, subscriber.email, { subject: '', text: '', html: '' }, 'x', async () => new Response('private provider error', { status: 429 })), /^Error: email_429$/);
});

test('preview only reads confirmed subscribers and never queues or sends messages', async () => {
  const requests: string[] = [];
  const db = new Database(env, async (url, init) => {
    requests.push(String(url)); assert.equal(init?.method, undefined);
    return Response.json([subscriber]);
  });
  const recent = { ...product, updatedAt: new Date().toISOString(), history: [] };
  const report = await deliverNotifications(db, env, [recent], false);
  assert.equal(report.mode, 'preview'); assert.equal(report.queued, 0); assert.equal(report.acceptedByProvider, 0);
  assert.equal(requests.length, 1); assert.match(requests[0], /status=eq.active/);
});
