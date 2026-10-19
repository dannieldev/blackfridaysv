import { simanScraper } from './stores/siman.js';
import { walmartScraper } from './stores/walmart.js';
import { curacaoScraper } from './stores/curacao.js';
import { pradoScraper } from './stores/prado.js';
import { omnisportScraper } from './stores/omnisport.js';
import { syncProductsToDatabase } from './db/supabase.js';
import { generateDealsSnapshot } from './core/snapshot.js';
import { StoreScraper, ScrapedProduct } from './types.js';
import dotenv from 'dotenv';

dotenv.config();

const ALL_SCRAPERS: Record<string, StoreScraper> = {
  siman: simanScraper,
  walmart: walmartScraper,
  curacao: curacaoScraper,
  prado: pradoScraper,
  omnisport: omnisportScraper,
};

async function main() {
  console.log('====================================================');
  console.log('🛒 RADAR BLACK FRIDAY EL SALVADOR 2026 - SCRAPER CLI');
  console.log('====================================================\n');

  const selectedStore = process.env.SCRAPER_STORE; // 'siman', 'walmart', o undefined (todos)
  const maxItems = process.env.SCRAPE_MAX_ITEMS_PER_CATEGORY 
    ? parseInt(process.env.SCRAPE_MAX_ITEMS_PER_CATEGORY, 10) 
    : 15;

  const scrapersToRun = selectedStore && ALL_SCRAPERS[selectedStore]
    ? [ALL_SCRAPERS[selectedStore]]
    : Object.values(ALL_SCRAPERS);

  console.log(`Tiendas a procesar: ${scrapersToRun.map(s => s.storeName).join(', ')}`);
  console.log(`Límite por término: ${maxItems}`);
  console.log(`Modo: ${process.env.SCRAPER_MODE === 'dry-run' ? 'DRY-RUN (Simulado)' : 'PRODUCCIÓN (Supabase)'}\n`);

  const startTime = Date.now();
  let totalProducts: ScrapedProduct[] = [];

  for (const scraper of scrapersToRun) {
    try {
      console.log(`\n▶ Iniciando extracción: ${scraper.storeName}`);
      const prods = await scraper.scrape({ maxItemsPerCategory: maxItems });
      totalProducts = totalProducts.concat(prods);
      console.log(`✔ Completado ${scraper.storeName} (${prods.length} productos)`);
    } catch (err) {
      console.error(`✖ Error en ${scraper.storeName}:`, err);
    }
  }

  console.log('\n----------------------------------------------------');
  console.log(`📦 Sincronizando ${totalProducts.length} productos con la base de datos...`);
  const stats = await syncProductsToDatabase(totalProducts);

  // Plan B: Generar snapshot estático para Cloudflare Pages
  try {
    await generateDealsSnapshot(totalProducts);
  } catch (err) {
    console.warn('No se pudo generar el snapshot estático:', err);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n====================================================');
  console.log('📊 RESUMEN DE EJECUCIÓN:');
  console.log(`- Duración total: ${durationSec}s`);
  console.log(`- Total productos extraídos: ${stats.total}`);
  console.log(`- Modelos identificados (MPN): ${stats.canonicalMatched}`);
  console.log(`- Productos sincronizados: ${stats.productsSynced}`);
  console.log(`- Precios históricos registrados: ${stats.pricesRecorded}`);
  console.log(`- Estado: ${stats.dryRun ? '✔ Simulación completada (Dry-run)' : '✔ Sincronizado en Supabase'}`);
  console.log('====================================================\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error fatal en el runner:', err);
  process.exit(1);
});
