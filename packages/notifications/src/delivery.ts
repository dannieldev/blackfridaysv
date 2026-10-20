import type { CatalogProduct, DeliveryPayload, Subscriber } from './contracts.js';
import { notificationEmail, selectMatches } from './matches.js';
import { Database, type ServiceEnvironment } from './service.js';
import { sendEmail } from './email.js';

export async function deliverNotifications(db: Database, env: ServiceEnvironment, catalog: CatalogProduct[], send = false, limit = 50) {
  const report = { mode: send ? 'send' : 'preview', subscribers: 0, matchingSubscribers: 0, queued: 0, acceptedByProvider: 0, failed: 0 };
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date());
  let cursor = '';
  if (send) await db.rpc('bf_email_cleanup', {});
  for (;;) {
    const rows = await db.request<Subscriber[]>(`email_subscribers?select=id,email,newsletter,categories,max_budget,digest_prices,price_alerts:email_price_alerts(product_id,target_price,last_notified_price,enabled)&status=eq.active&order=id&limit=100${cursor ? `&id=gt.${cursor}` : ''}`);
    for (const subscriber of rows) {
      report.subscribers++;
      if (!selectMatches(subscriber, catalog).length) continue;
      report.matchingSubscribers++;
      if (!send) continue;
      const payload = await notificationEmail(subscriber, catalog, env.SITE_URL, env.EMAIL_TOKEN_SECRET);
      if (!payload) continue;
      const id = await db.rpc<string | null>('bf_enqueue_email', { p_subscriber: subscriber.id, p_day: day, p_payload: payload });
      if (id) report.queued++;
    }
    if (rows.length < 100) break;
    cursor = rows.at(-1)!.id;
  }
  if (!send) return report;
  for (let i = 0; i < limit; i++) {
    const rows = await db.rpc<{ id: string; lease: string; email: string; payload: DeliveryPayload }[]>('bf_claim_email', {});
    const job = rows[0];
    if (!job) break;
    try {
      const providerId = await sendEmail(env, job.email, job.payload.mail, `notification/${job.id}`);
      const finished = await db.rpc<boolean>('bf_finish_email', { p_id: job.id, p_lease: job.lease, p_provider: providerId });
      if (finished) report.acceptedByProvider++;
    } catch (error) {
      report.failed++;
      const code = error instanceof Error && /^(email|database)_\w+$/.test(error.message) ? error.message : 'delivery_failed';
      await db.rpc('bf_retry_email', { p_id: job.id, p_lease: job.lease, p_error: code });
    }
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return report;
}
