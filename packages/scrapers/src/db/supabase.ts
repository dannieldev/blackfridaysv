import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ScrapedProduct } from '../types.js';
import dotenv from 'dotenv';
import type { Observation } from '../core/catalog.js';

dotenv.config();

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  errors: number;
  dryRun: boolean;
}

/**
 * Guarda o sincroniza una lista de productos extraídos con Supabase
 */
export async function syncProductsToDatabase(
  products: ScrapedProduct[],
  options?: { dryRun?: boolean; capturedAt?: string }
): Promise<SyncStats> {
  const isDryRun = options?.dryRun ?? (process.env.SCRAPER_MODE === 'dry-run');
  const stats: SyncStats = {
    total: products.length,
    canonicalMatched: 0,
    productsSynced: 0,
    pricesRecorded: 0,
    errors: 0,
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
    throw new Error('Faltan credenciales de escritura. Usa SCRAPER_MODE=dry-run para una simulación explícita.');
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
          .abortSignal(AbortSignal.timeout(20000)).single();

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
            last_scraped_at: options?.capturedAt ?? new Date().toISOString(),
          },
          { onConflict: 'store_id,store_sku' }
        )
        .select('id')
        .abortSignal(AbortSignal.timeout(20000)).single();

      if (storeProdErr || !storeProd) {
        stats.errors++;
        console.error(`Error guardando store_product ${prod.storeSku}:`, storeProdErr?.message);
        continue;
      }

      stats.productsSynced++;

      // 3. Registrar el precio en el histórico inmutable
      const { error: priceErr } = await supabase.from('price_history').insert({
        store_product_id: storeProd.id,
        regular_price: prod.regularPrice,
        offer_price: prod.offerPrice,
        captured_at: options?.capturedAt ?? new Date().toISOString(),
      }).abortSignal(AbortSignal.timeout(20000));

      if (!priceErr) {
        stats.pricesRecorded++;
      } else {
        stats.errors++;
        console.error(`No se pudo registrar el precio de ${prod.storeId}/${prod.storeSku}.`);
      }
    } catch (err) {
      stats.errors++;
      console.error(`Error en pipeline para ${prod.title}:`, err);
    }
  }

  return stats;
}

/** Export observations in batches; browsers keep reading the cacheable snapshot. */
export async function readPriceHistory(
  now = new Date().toISOString(),
  client = getSupabaseClient(),
): Promise<Record<string, (Observation & { regularPrice: number | null })[]>> {
  if (!client) throw new Error('No hay acceso a la fuente histórica.');
  const products: { id: string; store_id: string; store_sku: string }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from('store_products')
      .select('id,store_id,store_sku').order('id').range(offset, offset + 999)
      .abortSignal(AbortSignal.timeout(20000));
    if (error) throw new Error('No se pudo leer el catálogo histórico.');
    products.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const history: Record<string, (Observation & { regularPrice: number | null })[]> = {};
  const since = new Date(Date.parse(now) - 90 * 86400000).toISOString();
  for (let index = 0; index < products.length; index += 100) {
    const batch = products.slice(index, index + 100);
    const ids = new Map(batch.map(p => [p.id, `${p.store_id}-${p.store_sku}`]));
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from('price_history')
        .select('id,store_product_id,offer_price,regular_price,captured_at')
        .in('store_product_id', [...ids.keys()]).gte('captured_at', since).lte('captured_at', now)
        .order('id').range(offset, offset + 999).abortSignal(AbortSignal.timeout(20000));
      if (error) throw new Error('No se pudieron leer todas las observaciones; se conserva el historial del snapshot.');
      for (const point of data ?? []) {
        const id = ids.get(point.store_product_id);
        if (id) (history[id] ??= []).push({
          date: point.captured_at, price: Number(point.offer_price),
          regularPrice: point.regular_price === null ? null : Number(point.regular_price),
        });
      }
      if (!data || data.length < 1000) break;
    }
  }
  return history;
}
