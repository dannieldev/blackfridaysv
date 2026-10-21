import type { SupabaseClient } from '@supabase/supabase-js';
import { isExcludedFromCatalog } from '../../../../packages/scrapers/src/core/catalog-policy';

const environment = import.meta.env ?? {};
const supabaseUrl = environment.VITE_SUPABASE_URL;
const supabaseKey = environment.VITE_SUPABASE_ANON_KEY;

let clientPromise: Promise<SupabaseClient> | undefined;

function getSupabaseClient(): Promise<SupabaseClient> {
  clientPromise ??= import('@supabase/supabase-js')
    .then(({ createClient }) => createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }))
    .catch(error => {
      clientPromise = undefined;
      throw error;
    });
  return clientPromise;
}

export interface SupabaseDeal {
  store_product_id: string;
  store_sku: string;
  store_title: string;
  product_url: string;
  product_image: string | null;
  in_stock: boolean | null;
  store_id: string;
  store_name: string;
  canonical_id: string | null;
  model_code: string | null;
  brand: string | null;
  canonical_title: string | null;
  category: string;
  current_regular_price: number | null;
  current_offer_price: number;
  min_historic_price: number | null;
  avg_historic_price: number | null;
  baseline_price_30d: number | null;
  is_inflated: boolean;
  is_all_time_low: boolean;
  real_discount_percent: number;
  deal_score: 'ganga_historica' | 'buena_oferta' | 'falsa_oferta_inflada' | 'descuento_cosmetico' | 'precio_regular';
  source: 'snapshot' | 'database';
  updated_at?: string;
  refresh_status?: 'updated' | 'retained';
  history?: { date: string; price: number }[];
}

type Row = Record<string, unknown>;
const scores = new Set<SupabaseDeal['deal_score']>([
  'ganga_historica', 'buena_oferta', 'falsa_oferta_inflada', 'descuento_cosmetico', 'precio_regular',
]);

function string(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function price(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function url(value: unknown): string | null {
  try {
    const parsed = new URL(string(value));
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function timestamp(value: unknown): string | undefined {
  const input = string(value);
  const time = Date.parse(input);
  return input && Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

function normalizeRows(data: unknown, source: SupabaseDeal['source']): SupabaseDeal[] {
  if (!Array.isArray(data)) return [];
  const normalized: SupabaseDeal[] = [];
  const seen = new Set<string>();

  for (const value of data) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const item = value as Row;
    const snapshot = source === 'snapshot';
    const id = string(snapshot ? item.id : item.store_product_id);
    const title = string(snapshot ? item.title : item.store_title);
    const store = string(snapshot ? item.store : item.store_name);
    const productUrl = url(snapshot ? item.productUrl : item.product_url);
    const currentPrice = price(snapshot ? item.currentPrice : item.current_offer_price);
    if (!id || !title || !store || !productUrl || currentPrice === null || seen.has(id)) continue;
    if (isExcludedFromCatalog({ title, category: string(item.category), productUrl })) continue;

    const score = (snapshot ? item.dealScore : item.deal_score) as SupabaseDeal['deal_score'];
    const stock = snapshot ? item.inStock : item.in_stock;
    const history = Array.isArray(item.history) ? item.history.flatMap((point: unknown) => {
      if (!point || typeof point !== 'object') return [];
      const entry = point as Row;
      const date = timestamp(entry.date);
      const amount = price(entry.price);
      return date && amount !== null ? [{ date, price: amount }] : [];
    }).sort((a, b) => a.date.localeCompare(b.date)) : undefined;

    normalized.push({
      store_product_id: id,
      store_sku: string(item.store_sku) || (snapshot ? id : ''),
      store_title: title,
      product_url: productUrl,
      product_image: url(snapshot ? item.imageUrl : item.product_image),
      in_stock: typeof stock === 'boolean' ? stock : null,
      store_id: string(item.store_id) || string(item.storeId) || (snapshot ? ['siman', 'walmart', 'curacao', 'prado', 'omnisport', 'radioshack', 'raf', 'prismamoda']
        .find(name => store.toLowerCase().includes(name)) || store.toLowerCase() : ''),
      store_name: store,
      canonical_id: string(item.canonical_id) || null,
      model_code: string(snapshot ? item.modelCode : item.model_code) || null,
      brand: string(item.brand) || null,
      canonical_title: string(snapshot ? item.title : item.canonical_title) || null,
      category: string(item.category) || 'otros',
      current_regular_price: price(snapshot ? item.regularPrice : item.current_regular_price),
      current_offer_price: currentPrice,
      // Legacy snapshots derive this baseline from list prices, not observations.
      min_historic_price: snapshot ? null : price(item.min_historic_price),
      avg_historic_price: snapshot ? null : price(item.avg_historic_price),
      baseline_price_30d: snapshot ? null : price(item.baseline_price_30d),
      is_inflated: !snapshot && item.is_inflated === true,
      is_all_time_low: !snapshot && item.is_all_time_low === true,
      real_discount_percent: !snapshot && typeof item.real_discount_percent === 'number'
        && Number.isFinite(item.real_discount_percent) ? item.real_discount_percent : 0,
      deal_score: scores.has(score) ? score : 'precio_regular',
      source,
      updated_at: timestamp(snapshot ? item.updatedAt : item.latest_captured_at),
      refresh_status: snapshot && item.refreshStatus === 'retained' ? 'retained' : undefined,
      ...(history?.length ? { history } : {}),
    });
    seen.add(id);
  }
  return normalized;
}

export async function fetchLiveDeals(): Promise<SupabaseDeal[] | null> {
  const snapshotController = new AbortController();
  const snapshotTimer = setTimeout(() => snapshotController.abort(), 3500);
  try {
    const response = await fetch('/data/deals-snapshot.json', {
      signal: snapshotController.signal,
      headers: { 'Cache-Control': 'max-age=300' },
    });
    if (response.ok) {
      const snapshot = normalizeRows(await response.json(), 'snapshot');
      if (snapshot.length) return snapshot;
    }
  } catch {
    // Continue to the database when the cached catalog is unavailable.
  } finally {
    clearTimeout(snapshotTimer);
  }

  if (!supabaseUrl || !supabaseKey) return null;

  const databaseController = new AbortController();
  let databaseTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    const query = (async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('view_deal_radar')
        .select('*')
        .limit(100)
        .abortSignal(databaseController.signal);
      if (error) return null;
      const deals = normalizeRows(data, 'database');
      return deals.length ? deals : null;
    })();
    // Bound the lazy SDK download as well as the database request.
    const timeout = new Promise<null>(resolve => {
      databaseTimer = setTimeout(() => { databaseController.abort(); resolve(null); }, 3500);
    });
    return await Promise.race([query, timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(databaseTimer);
  }
}
