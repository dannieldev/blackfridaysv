import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })
  : null;

export interface SupabaseDeal {
  store_product_id: string;
  store_sku: string;
  store_title: string;
  product_url: string;
  product_image: string | null;
  in_stock: boolean;
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
}

/**
 * Consulta de ofertas con estrategia híbrida anti-colapso:
 * 1. Intenta leer snapshot estático de Cloudflare Edge (/data/deals-snapshot.json) si existe (0% costo Supabase).
 * 2. Si no hay snapshot, consulta la base de datos Supabase en tiempo real.
 * 3. En caso de error de red o saturación, devuelve null para activar el dataset de contingencia.
 */
export async function fetchLiveDeals(): Promise<SupabaseDeal[] | null> {
  // Plan B: Intentar leer snapshot estático de Cloudflare Edge primero (ultra rápido, soporta millones de visitas)
  try {
    const staticRes = await fetch('/data/deals-snapshot.json', {
      headers: { 'Cache-Control': 'max-age=300' }
    });
    if (staticRes.ok) {
      const staticData = await staticRes.json();
      if (Array.isArray(staticData) && staticData.length > 0) {
        return staticData.map((item: any) => ({
          store_product_id: item.id,
          store_sku: item.id,
          store_title: item.title,
          product_url: item.productUrl,
          product_image: item.imageUrl || null,
          in_stock: true,
          store_id: item.store.toLowerCase().includes('siman')
            ? 'siman'
            : item.store.toLowerCase().includes('walmart')
            ? 'walmart'
            : item.store.toLowerCase().includes('curacao')
            ? 'curacao'
            : item.store.toLowerCase().includes('prado')
            ? 'prado'
            : 'omnisport',
          store_name: item.store,
          canonical_id: null,
          model_code: item.modelCode,
          brand: item.brand,
          canonical_title: item.title,
          category: item.category,
          current_regular_price: item.regularPrice,
          current_offer_price: item.currentPrice,
          min_historic_price: item.currentPrice,
          avg_historic_price: item.baselinePrice30d,
          baseline_price_30d: item.baselinePrice30d,
          is_inflated: item.dealScore === 'falsa_oferta_inflada',
          is_all_time_low: item.dealScore === 'ganga_historica',
          real_discount_percent: item.regularPrice ? Math.round((1 - item.currentPrice / item.regularPrice) * 100) : 0,
          deal_score: item.dealScore,
        }));
      }
    }
  } catch {
    // Si no hay snapshot estático, proceder a Supabase
  }

  // Plan A: Consulta directa a Supabase (con timeout seguro)
  if (!supabase) {
    return null;
  }

  try {
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout de consulta Supabase')), 3500)
    );

    const queryPromise = supabase
      .from('view_deal_radar')
      .select('*')
      .limit(100)
      .then(({ data, error }) => {
        if (error) throw error;
        return data as SupabaseDeal[];
      });

    const result = await Promise.race([queryPromise, timeoutPromise]);
    return result;
  } catch {
    return null;
  }
}
