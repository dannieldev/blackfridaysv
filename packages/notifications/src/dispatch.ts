import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { Database, isConfigured, type ServiceEnvironment } from './service.js';
import { deliverNotifications } from './delivery.js';
import type { CatalogProduct } from './contracts.js';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });
async function main() {
  const send = process.env.EMAIL_SEND === 'true';
  const env = { ...process.env, SUBSCRIPTIONS_ENABLED: process.env.SUBSCRIPTIONS_ENABLED ?? 'false' } as unknown as ServiceEnvironment;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Falta la conexión privada a Supabase.');
  if (send && !isConfigured(env)) throw new Error('Envíos desactivados: configura Resend, remitente, URL, secreto y SUBSCRIPTIONS_ENABLED.');
  const limit = Number(process.env.EMAIL_BATCH_LIMIT ?? 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('EMAIL_BATCH_LIMIT debe estar entre 1 y 1000.');
  const catalog = JSON.parse(readFileSync(new URL('../../../apps/web/public/data/deals-snapshot.json', import.meta.url), 'utf8')) as CatalogProduct[];
  const report = await deliverNotifications(new Database(env), env, catalog, send, limit);
  const directory = new URL('../../../.reports/', import.meta.url);
  mkdirSync(directory, { recursive: true });
  writeFileSync(new URL('notifications.json', directory), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  return report.failed ? 2 : 0;
}
main().then(code => process.exit(code)).catch(error => {
  console.error(error instanceof Error ? error.message : 'No se pudo completar el proceso de avisos.');
  process.exit(1);
});
