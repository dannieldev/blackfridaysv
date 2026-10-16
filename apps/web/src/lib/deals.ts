import { fetchLiveDeals, type SupabaseDeal } from './supabase.ts';

export type DataSource = 'snapshot' | 'database' | 'demo';

export interface DealItem {
  id: string;
  store: string;
  storeLogo?: string;
  brand: string;
  modelCode: string;
  title: string;
  category: string;
  currentPrice: number;
  regularPrice: number | null;
  baselinePrice30d: number;
  dealScore: 'ganga_historica' | 'buena_oferta' | 'falsa_oferta_inflada' | 'descuento_cosmetico';
  verdictMessage: string;
  productUrl: string;
  imageUrl?: string | null;
  inStock: boolean | null;
  competitors?: Array<{ store: string; price: number; productUrl?: string; inStock?: boolean | null }>;
  dataSource: DataSource;
  checkedAt?: string;
  history?: { date: string; price: number }[];
}

export interface Catalog {
  deals: DealItem[];
  source: DataSource;
  updatedAt?: string;
}

export interface ComparableOffer {
  store: string;
  price: number;
  productUrl?: string;
  inStock: boolean | null;
  isCurrent: boolean;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const money = (value: number): string => currency.format(value);

export function storeLabel(store: string): string {
  const labels: [string, string][] = [
    ['siman', 'Siman'], ['walmart', 'Walmart'], ['curacao', 'La Curacao'],
    ['prado', 'Prado'], ['omnisport', 'Omnisport'],
  ];
  return labels.find(([name]) => store.toLowerCase().includes(name))?.[1] ?? store;
}

/** Discount against the store's advertised reference, not a historical baseline. */
export function discountPercent(deal: Pick<DealItem, 'currentPrice' | 'regularPrice'>): number | null {
  if (!deal.regularPrice || !Number.isFinite(deal.regularPrice) || !Number.isFinite(deal.currentPrice)
    || deal.currentPrice < 0 || deal.regularPrice <= deal.currentPrice) return null;
  return Math.round((1 - deal.currentPrice / deal.regularPrice) * 100);
}

export function comparableOffers(deal: DealItem): ComparableOffer[] {
  const offers: ComparableOffer[] = [
    { store: deal.store, price: deal.currentPrice, productUrl: deal.productUrl, inStock: deal.inStock, isCurrent: true },
    ...(deal.competitors ?? []).map(offer => ({ ...offer, inStock: offer.inStock ?? null, isCurrent: false })),
  ];
  const stores = new Set<string>();
  return offers.filter(offer => offer.inStock !== false && Number.isFinite(offer.price) && offer.price > 0)
    .sort((a, b) => a.price - b.price || Number(b.isCurrent) - Number(a.isCurrent))
    .filter(offer => {
      const key = storeLabel(offer.store).toLowerCase();
      if (stores.has(key)) return false;
      stores.add(key);
      return true;
    });
}

const entities: Record<string, string> = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', deg: '°',
  ndash: '–', mdash: '—', times: '×', reg: '®', trade: '™', copy: '©',
};

function cleanText(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (!code.startsWith('#')) return entities[code] ?? entity;
    const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
      ? String.fromCodePoint(point) : entity;
  }).replace(/\s+/g, ' ').trim();
}

function modelKey(deal: DealItem): string | null {
  const brand = deal.brand.trim().toUpperCase();
  let model = deal.modelCode.trim().toUpperCase();
  if (!brand || ['GENÉRICO', 'GENERICO', 'N/A', 'UNKNOWN', 'SIN MARCA'].includes(brand)
    || !/[A-Z]/.test(model) || !/\d/.test(model) || model.length < 5
    || !/^[A-Z0-9][A-Z0-9./-]+$/.test(model)) return null;
  // Only the known regional suffix of Samsung televisions is interchangeable.
  if (brand === 'SAMSUNG' && /^UN\d{2}[A-Z]\d{4}FPXPA$/.test(model)) model = model.replace(/FPXPA$/, '');
  return `${brand}:${deal.category}:${model}`;
}

function enrichComparisons(deals: DealItem[]): DealItem[] {
  const models = new Map<string, DealItem[]>();
  for (const deal of deals) {
    const key = modelKey(deal);
    if (key) models.set(key, [...(models.get(key) ?? []), deal]);
  }
  return deals.map(deal => {
    const key = modelKey(deal);
    const matches = key ? models.get(key) ?? [] : [];
    const competitors = matches.filter(other => storeLabel(other.store) !== storeLabel(deal.store))
      .map(other => ({ store: other.store, price: other.currentPrice, productUrl: other.productUrl, inStock: other.inStock }))
      .sort((a, b) => a.price - b.price);
    return competitors.length ? { ...deal, competitors } : deal;
  });
}

export function catalogProductId(item: Pick<SupabaseDeal, 'source' | 'store_id' | 'store_sku' | 'store_product_id'>): string {
  // The database and snapshot writers use the same store slug and original SKU.
  return item.source === 'database' && /^(siman|walmart|curacao|prado|omnisport|epa)$/.test(item.store_id) && item.store_sku
    ? `${item.store_id}-${item.store_sku}`
    : item.store_product_id;
}

function toDeal(item: SupabaseDeal): DealItem {
  const history = item.history;
  const reference = item.current_regular_price;
  return {
    id: catalogProductId(item),
    store: cleanText(item.store_name),
    brand: cleanText(item.brand || 'Sin marca'),
    modelCode: cleanText(item.model_code || 'N/A'),
    title: cleanText(item.store_title),
    category: item.category,
    currentPrice: item.current_offer_price,
    regularPrice: reference,
    baselinePrice30d: item.baseline_price_30d ?? item.current_offer_price,
    dealScore: item.deal_score === 'precio_regular' ? 'descuento_cosmetico' : item.deal_score,
    verdictMessage: reference && reference > item.current_offer_price
      ? `La tienda anuncia ${money(item.current_offer_price)} frente a una referencia de ${money(reference)}. Esa diferencia no demuestra un ahorro histórico.`
      : 'Precio publicado por la tienda. No hay una rebaja anunciada que podamos comparar.',
    productUrl: item.product_url,
    imageUrl: item.product_image,
    inStock: item.in_stock,
    dataSource: item.source,
    checkedAt: item.updated_at,
    ...(history?.length ? { history } : {}),
  };
}

function demoDeals(): DealItem[] {
  return [
    { id: 'demo-tv', title: 'Ejemplo de catálogo · Televisor de 55 pulgadas', category: 'tv_audio', currentPrice: 399 },
    { id: 'demo-laptop', title: 'Ejemplo de catálogo · Computadora portátil', category: 'computacion', currentPrice: 599 },
    { id: 'demo-fridge', title: 'Ejemplo de catálogo · Refrigeradora', category: 'linea_blanca', currentPrice: 449 },
  ].map(item => ({
    ...item,
    store: 'Demostración',
    brand: 'Ejemplo',
    modelCode: 'N/A',
    regularPrice: null,
    baselinePrice30d: item.currentPrice,
    dealScore: 'descuento_cosmetico',
    verdictMessage: 'Ejemplo ilustrativo. No es una oferta real ni un precio disponible para comprar.',
    productUrl: '',
    inStock: null,
    dataSource: 'demo',
  }));
}

export async function loadCatalog(): Promise<Catalog> {
  try {
    const rows = await fetchLiveDeals();
    if (rows?.length) {
      const deals = enrichComparisons(rows.map(toDeal));
      // Report the oldest capture so partial refreshes do not imply all prices are fresh.
      const dates = deals.flatMap(deal => deal.checkedAt ? [deal.checkedAt] : []).sort();
      return { deals, source: rows[0].source, updatedAt: dates[0] };
    }
  } catch {
    // Keep the interface usable when both catalog sources fail.
  }
  return { deals: demoDeals(), source: 'demo' };
}
