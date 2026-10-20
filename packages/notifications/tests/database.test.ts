import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db: PGlite;
before(async () => {
  db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await db.exec(await readFile(new URL('../../../supabase/migrations/20261020000000_email_subscriptions.sql', import.meta.url), 'utf8'));
});
beforeEach(async () => { await db.exec('TRUNCATE public.email_subscribers, public.email_opt_ins, public.email_rate_limits CASCADE;'); });
after(async () => { await db.close(); });

const hash = (n = 1) => n.toString(16).padStart(64, '0');
async function pending(n = 1, payload: unknown = { newsletter: true, categories: ['gaming'], maxBudget: 200, alert: null }) {
  await db.query(`INSERT INTO public.email_opt_ins(email, token_hash, payload, consent_version, source)
    VALUES ('buyer@example.invalid', $1, $2, 'test-v1', 'newsletter')`, [hash(n), JSON.stringify(payload)]);
}
async function confirm(n = 1) {
  return (await db.query<{ id: string | null }>('SELECT public.bf_confirm_subscription($1) AS id', [hash(n)])).rows[0].id;
}
async function subscriber() { await pending(); return (await confirm())!; }
const payload = () => ({ validUntil: new Date(Date.now() + 3600000).toISOString(), mail: { subject: 'test', text: 'test', html: '<p>test</p>' }, alertPrices: { 'siman-tv': 100 }, digestPrices: { 'siman-tv': 100 } });
async function enqueue(id: string, body = payload()) {
  return (await db.query<{ id: string | null }>("SELECT public.bf_enqueue_email($1, (now() AT TIME ZONE 'America/El_Salvador')::date, $2) AS id", [id, JSON.stringify(body)])).rows[0].id;
}
async function claim() { return (await db.query<{ id: string; lease: string; payload: unknown }>('SELECT * FROM public.bf_claim_email()')).rows; }

test('confirmation creates private interests once; pending requests do not alter preferences', async () => {
  await pending();
  assert.equal((await db.query('SELECT * FROM public.email_subscribers')).rows.length, 0);
  const id = await confirm();
  assert.ok(id);
  assert.equal(await confirm(), null);
  await pending(2, { newsletter: true, categories: ['tv_audio'], maxBudget: 900 });
  const active = (await db.query<{ categories: string[]; max_budget: string; consent_version: string }>('SELECT * FROM public.email_subscribers')).rows[0];
  assert.deepEqual(active.categories, ['gaming']);
  assert.equal(Number(active.max_budget), 200);
  assert.equal(active.consent_version, 'test-v1');
  assert.equal(await confirm(2), id);
  assert.deepEqual((await db.query<{ categories: string[] }>('SELECT categories FROM public.email_subscribers')).rows[0].categories, ['tv_audio']);
});

test('unknown and expired confirmation tokens never create subscribers', async () => {
  assert.equal(await confirm(80), null);
  await pending();
  await db.exec("UPDATE public.email_opt_ins SET expires_at = now() - interval '1 second'");
  assert.equal(await confirm(), null);
  assert.equal((await db.query('SELECT * FROM public.email_subscribers')).rows.length, 0);
});

test('unsubscribe cancels queued mail, disables alerts and invalidates previous requests', async () => {
  await pending(1, { newsletter: false, alert: { productId: 'siman-tv', targetPrice: 100 } });
  const id = (await confirm())!;
  await pending(2);
  await enqueue(id);
  await db.query('SELECT public.bf_unsubscribe($1)', [id]);
  assert.equal(await confirm(2), null);
  assert.deepEqual(await claim(), []);
  assert.equal(await enqueue(id), null);
  assert.equal((await db.query<{ enabled: boolean }>('SELECT enabled FROM public.email_price_alerts')).rows[0].enabled, false);
  await pending(3);
  assert.equal(await confirm(3), id);
  assert.equal((await db.query<{ enabled: boolean }>('SELECT enabled FROM public.email_price_alerts')).rows[0].enabled, false);
});

test('a confirmed subscriber has at most twenty enabled product alerts, including reactivation', async () => {
  const id = await subscriber();
  await db.query(`INSERT INTO public.email_price_alerts(subscriber_id, product_id, target_price)
    SELECT $1, 'siman-' || n, 100 FROM generate_series(1,20) n`, [id]);
  await db.query("INSERT INTO public.email_price_alerts VALUES ($1, 'siman-old', 100, NULL, false, now())", [id]);
  await pending(2, { newsletter: false, alert: { productId: 'siman-old', targetPrice: 50 } });
  await assert.rejects(confirm(2), /alert_limit/);
  assert.equal((await db.query('SELECT * FROM public.email_price_alerts WHERE enabled')).rows.length, 20);
  assert.equal((await db.query<{ consumed_at: null }>('SELECT consumed_at FROM public.email_opt_ins WHERE token_hash = $1', [hash(2)])).rows[0].consumed_at, null);
});

test('daily delivery is unique and a retry keeps its payload and id with a new lease', async () => {
  const id = await subscriber();
  const jobId = await enqueue(id);
  assert.ok(jobId);
  assert.equal(await enqueue(id), null);
  const first = (await claim())[0];
  assert.equal(first.id, jobId);
  assert.deepEqual(await claim(), []);
  await db.query("SELECT public.bf_retry_email($1,$2,'email_429')", [first.id, first.lease]);
  assert.deepEqual(await claim(), []);
  await db.exec("UPDATE public.email_deliveries SET available_at = now() - interval '1 second'");
  const retry = (await claim())[0];
  assert.equal(retry.id, first.id);
  assert.notEqual(retry.lease, first.lease);
  assert.deepEqual(retry.payload, first.payload);
  assert.equal((await db.query<{ ok: boolean }>("SELECT public.bf_finish_email($1,$2,'provider') AS ok", [first.id, first.lease])).rows[0].ok, false);
  await db.query("INSERT INTO public.email_price_alerts(subscriber_id,product_id,target_price) VALUES ($1,'siman-tv',100)", [id]);
  assert.equal((await db.query<{ ok: boolean }>("SELECT public.bf_finish_email($1,$2,'provider') AS ok", [retry.id, retry.lease])).rows[0].ok, true);
  assert.equal(Number((await db.query<{ last_notified_price: string }>('SELECT last_notified_price FROM public.email_price_alerts')).rows[0].last_notified_price), 100);
  assert.deepEqual((await db.query<{ digest_prices: unknown }>('SELECT digest_prices FROM public.email_subscribers')).rows[0].digest_prices, { 'siman-tv': 100 });
});

test('worker crash can be retried after its lease expires, within the provider idempotency window', async () => {
  await enqueue(await subscriber());
  const first = (await claim())[0];
  await db.exec("UPDATE public.email_deliveries SET locked_at = now() - interval '11 minutes'");
  const second = (await claim())[0];
  assert.equal(first.id, second.id);
  assert.notEqual(first.lease, second.lease);
  await db.exec("UPDATE public.email_deliveries SET created_at = now() - interval '21 hours', locked_at = now() - interval '11 minutes'");
  assert.deepEqual(await claim(), []);
  await db.exec('SELECT public.bf_email_cleanup()');
  assert.equal((await db.query<{ status: string }>('SELECT status FROM public.email_deliveries')).rows[0].status, 'cancelled');
});

test('mail based on a now-stale capture is never claimed', async () => {
  await enqueue(await subscriber(), { ...payload(), validUntil: new Date(Date.now() - 1000).toISOString() });
  assert.deepEqual(await claim(), []);
  await db.exec('SELECT public.bf_email_cleanup()');
  assert.equal((await db.query<{ status: string }>('SELECT status FROM public.email_deliveries')).rows[0].status, 'cancelled');
});

test('a previous-day retry cannot compete with today’s digest and send two daily summaries', async () => {
  const id = await subscriber();
  const yesterday = await enqueue(id);
  await db.exec("UPDATE public.email_deliveries SET delivery_day = delivery_day - 1");
  assert.deepEqual(await claim(), []);
  const today = await enqueue(id);
  assert.notEqual(today, yesterday);
  assert.equal((await claim())[0].id, today);
  assert.deepEqual(await claim(), []);
});

test('rate counters enforce and reset the limit atomically', async () => {
  const check = async () => (await db.query<{ ok: boolean }>("SELECT public.bf_email_rate_limit('test',2,3600) AS ok")).rows[0].ok;
  assert.equal(await check(), true); assert.equal(await check(), true); assert.equal(await check(), false);
  await db.exec("UPDATE public.email_rate_limits SET expires_at = now() - interval '1 second'");
  assert.equal(await check(), true);
});

test('all subscriber tables use RLS and public roles have no table or RPC access', async () => {
  const tables = await db.query<{ name: string; rls: boolean }>("SELECT relname AS name, relrowsecurity AS rls FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname LIKE 'email_%'");
  assert.equal(tables.rows.length, 5);
  for (const table of tables.rows) {
    assert.ok(table.rls);
    for (const role of ['anon', 'authenticated']) {
      const check = await db.query<{ allowed: boolean }>("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') AS allowed", [role, `public.${table.name}`]);
      assert.equal(check.rows[0].allowed, false);
    }
  }
  const functions = await db.query<{ allowed: boolean }>("SELECT has_function_privilege('anon',oid,'EXECUTE') AS allowed FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'bf_%'");
  assert.equal(functions.rows.length, 8);
  assert.ok(functions.rows.every(f => !f.allowed));
  await db.exec('SET ROLE anon');
  await assert.rejects(db.query('SELECT * FROM public.email_subscribers'), /permission denied/);
  await db.exec('RESET ROLE');
});

test('cleanup expires pending contacts and old delivery records', async () => {
  await enqueue(await subscriber());
  await db.exec("UPDATE public.email_opt_ins SET created_at = now() - interval '8 days'; UPDATE public.email_deliveries SET created_at = now() - interval '91 days'; SELECT public.bf_email_cleanup()");
  assert.equal((await db.query('SELECT * FROM public.email_opt_ins')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM public.email_deliveries')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM public.email_subscribers')).rows.length, 1);
});

test('the service role can complete the flow with RLS enabled', async () => {
  await db.exec('SET ROLE service_role');
  try {
    const id = await subscriber();
    assert.ok(await enqueue(id));
    assert.equal((await claim()).length, 1);
    await db.query('SELECT public.bf_unsubscribe($1)', [id]);
    assert.deepEqual(await claim(), []);
  } finally { await db.exec('RESET ROLE'); }
});
