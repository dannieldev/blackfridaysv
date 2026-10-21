import { fileURLToPath } from 'node:url';
import { simanScraper } from './stores/siman.js';
import { walmartScraper } from './stores/walmart.js';
import { curacaoScraper } from './stores/curacao.js';
import { pradoScraper } from './stores/prado.js';
import { omnisportScraper } from './stores/omnisport.js';
import { prismamodaScraper } from './stores/prismamoda.js';
import { radioshackScraper } from './stores/radioshack.js';
import { rafScraper } from './stores/raf.js';
import { getSupabaseClient, readPriceHistory, syncProductsToDatabase } from './db/supabase.js';
import { mergeCatalog, type Observation, type StoreResult } from './core/catalog.js';
import { readSnapshot, writeJsonAtomic, writeSnapshot } from './core/snapshot.js';
import type { StoreScraper } from './types.js';
import dotenv from 'dotenv';

dotenv.config();

const scrapers: Record<string, StoreScraper> = {
  siman: simanScraper, walmart: walmartScraper, curacao: curacaoScraper,
  prado: pradoScraper, omnisport: omnisportScraper,
  prismamoda: prismamodaScraper, radioshack: radioshackScraper, raf: rafScraper,
};
const reportPath = fileURLToPath(new URL('../../../.reports/crawler.json', import.meta.url));

async function main(): Promise<number> {
  const startedAt = new Date().toISOString();
  if (process.env.SCRAPER_MODE && !['dry-run', 'snapshot', 'production'].includes(process.env.SCRAPER_MODE)) {
    throw new Error('Modo no reconocido; usa production, snapshot o dry-run.');
  }
  const dryRun = process.env.SCRAPER_MODE === 'dry-run';
  const snapshotOnly = process.env.SCRAPER_MODE === 'snapshot';
  const selected = process.env.SCRAPER_STORE;
  if (selected && !scrapers[selected]) throw new Error('Tienda no reconocida; no se ejecutará otra por defecto.');
  const maxItems = Number(process.env.SCRAPE_MAX_ITEMS_PER_CATEGORY ?? 50);
  if (!Number.isInteger(maxItems) || maxItems < 1) throw new Error('Límite de extracción inválido.');
  if (!dryRun && !snapshotOnly && !getSupabaseClient()) throw new Error('Faltan credenciales de Supabase. No se simulará una ejecución de producción.');
  const previous = readSnapshot();
  const results: StoreResult[] = [];
  for (const scraper of selected ? [scrapers[selected]] : Object.values(scrapers)) {
    const result: StoreResult = { storeId: scraper.storeId, products: [] };
    try {
      result.products = await scraper.scrape({
        maxItemsPerCategory: maxItems,
        onIssue: () => { result.failed = true; },
      });
    } catch {
      result.failed = true;
      console.error(`[${scraper.storeId}] Falló la extracción; se conservarán las capturas anteriores.`);
    }
    results.push(result);
  }
  const capturedAt = new Date().toISOString();
  let history: Record<string, Observation[]> = {};
  let historyStatus = dryRun ? 'not_requested' : snapshotOnly ? 'snapshot_only' : 'loaded';
  if (!dryRun && !snapshotOnly) {
    try { history = await readPriceHistory(capturedAt); }
    catch { historyStatus = 'unavailable'; }
  }
  const merged = mergeCatalog(previous, results, capturedAt, history);
  const stats = await syncProductsToDatabase(merged.acceptedProducts, { dryRun: dryRun || snapshotOnly, capturedAt });
  const degraded = merged.stores.some(store => store.status !== 'updated')
    || historyStatus === 'unavailable' || stats.errors > 0;
  const status = !merged.acceptedProducts.length ? 'failed' : degraded ? 'partial' : 'complete';
  if (!dryRun && merged.items.length) writeSnapshot(merged.items);
  const report = {
    startedAt, finishedAt: new Date().toISOString(), mode: dryRun ? 'dry-run' : snapshotOnly ? 'snapshot' : 'production',
    status, historyStatus, stores: merged.stores, database: stats,
    catalogProducts: merged.items.length, published: !dryRun && merged.items.length > 0,
  };
  writeJsonAtomic(reportPath, report);
  console.log(JSON.stringify(report, null, 2));
  // CI publishes the preserved catalog first, then marks partial runs as needing attention.
  return status === 'complete' ? 0 : 2;
}

main().then(code => process.exit(code)).catch(error => {
  writeJsonAtomic(reportPath, {
    status: 'failed', published: false, finishedAt: new Date().toISOString(),
    message: error instanceof Error ? error.message : 'Error inesperado',
  });
  console.error(error instanceof Error ? error.message : 'Error inesperado');
  process.exit(1);
});
