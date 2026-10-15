import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ScrapedProduct } from '../types.js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  supabaseInstance = createClient(url, key, {
    auth: { persistSession: false },
  });

  return supabaseInstance;
}

export interface SyncStats {
  total: number;
  canonicalMatched: number;
  productsSynced: number;
  pricesRecorded: number;
  dryRun: boolean;
}

/**
 * Guarda o sincroniza una lista de productos extraídos con Supabase
 */
export async function syncProductsToDatabase(
  products: ScrapedProduct[],
  options?: { dryRun?: boolean }
): Promise<SyncStats> {
  const isDryRun = options?.dryRun ?? (process.env.SCRAPER_MODE === 'dry-run');
  const stats: SyncStats = {
    total: products.length,
    canonicalMatched: 0,
    productsSynced: 0,
    pricesRecorded: 0,
    dryRun: isDryRun,
  };

  if (isDryRun) {
    console.log(`[DRY-RUN] Modo de prueba activo. Se simula la inserción de ${products.length} productos.`);
    for (const p of products) {
      if (p.modelCode) stats.canonicalMatched++;
      stats.productsSynced++;
      stats.pricesRecorded++;
    }
    return stats;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('[AVISO] No se encontraron credenciales de Supabase. Corriendo en modo DRY-RUN automático.');
    stats.dryRun = true;
    return stats;
  }

  for (const prod of products) {
    try {
      let canonicalId: string | null = null;

      // 1. Si tenemos código de modelo, crear o recuperar el producto canónico
      if (prod.modelCode) {
        stats.canonicalMatched++;
        const { data: canonical } = await supabase
          .from('canonical_products')
          .upsert(
            {
              model_code: prod.modelCode,
              brand: prod.brand,
              canonical_title: `${prod.brand} ${prod.modelCode}`,
              category: prod.category,
              image_url: prod.imageUrl,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'model_code' }
          )
          .select('id')
          .single();

        if (canonical) {
          canonicalId = canonical.id;
        }
      }

      // 2. Upsert del producto específico de la tienda
      const { data: storeProd, error: storeProdErr } = await supabase
        .from('store_products')
        .upsert(
          {
            store_id: prod.storeId,
            store_sku: prod.storeSku,
            canonical_id: canonicalId,
            title: prod.title,
            product_url: prod.productUrl,
            image_url: prod.imageUrl,
            in_stock: prod.inStock,
            last_scraped_at: new Date().toISOString(),
          },
          { onConflict: 'store_id,store_sku' }
        )
        .select('id')
        .single();

      if (storeProdErr || !storeProd) {
        console.error(`Error guardando store_product ${prod.storeSku}:`, storeProdErr?.message);
        continue;
      }

      stats.productsSynced++;

      // 3. Registrar el precio en el histórico inmutable
      const { error: priceErr } = await supabase.from('price_history').insert({
        store_product_id: storeProd.id,
        regular_price: prod.regularPrice,
        offer_price: prod.offerPrice,
        captured_at: new Date().toISOString(),
      });

      if (!priceErr) {
        stats.pricesRecorded++;
      }
    } catch (err) {
      console.error(`Error en pipeline para ${prod.title}:`, err);
    }
  }

  return stats;
}
