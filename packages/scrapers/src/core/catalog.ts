import type { ScrapedProduct } from '../types.js';
import { STORE_METADATA } from '../stores/metadata.js';
import { isExcludedFromCatalog } from './catalog-policy.js';

export interface Observation { date: string; price: number }
export interface SnapshotItem {
  id: string;
  store: string;
  storeId?: string;
  brand: string;
  modelCode: string;
  title: string;
  category: string;
  currentPrice: number;
  regularPrice: number | null;
  productUrl: string;
  imageUrl?: string | null;
  inStock?: boolean | null;
  updatedAt: string;
  history?: Observation[];
  refreshStatus?: 'updated' | 'retained';
  lastAttemptAt?: string;
}
export interface StoreResult {
  storeId: string;
  products: ScrapedProduct[];
  failed?: boolean;
}
export interface StoreReport {
  storeId: string;
  status: 'updated' | 'partial' | 'retained';
  received: number;
  accepted: number;
  retained: number;
  reason?: 'fetch_failed' | 'low_coverage' | 'invalid_products';
}

export const STORE_NAMES: Record<string, string> = Object.fromEntries(STORE_METADATA.map(store => [store.id, store.name]));

export function storeIdOf(item: SnapshotItem): string {
  return item.storeId ?? Object.keys(STORE_NAMES).find(id => item.id.startsWith(`${id}-`)) ?? '';
}

export function mergeHistory(points: Observation[], capturedAt: string): Observation[] {
  const end = Date.parse(capturedAt);
  const start = end - 90 * 86400000;
  const dates = new Map<string, number>();
  for (const point of points) {
    const time = Date.parse(point.date);
    if (Number.isFinite(time) && time <= end && time >= start && Number.isFinite(point.price) && point.price > 0) {
      dates.set(new Date(time).toISOString(), point.price);
    }
  }
  return [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, price]) => ({ date, price }));
}

export function validProduct(product: ScrapedProduct, storeId: string): boolean {
  try {
    return product.storeId === storeId && Boolean(product.storeSku?.trim() && product.title?.trim())
      && Number.isFinite(product.offerPrice) && product.offerPrice > 0
      && ['https:', 'http:'].includes(new URL(product.productUrl).protocol);
  } catch { return false; }
}

/** A limited or failed crawl must never replace the last known catalog with a subset. */
export function mergeCatalog(
  previous: SnapshotItem[],
  results: StoreResult[],
  capturedAt: string,
  databaseHistory: Record<string, Observation[]> = {},
): { items: SnapshotItem[]; stores: StoreReport[]; acceptedProducts: ScrapedProduct[] } {
  const items = new Map<string, SnapshotItem>();
  for (const item of previous) {
    if (!item.id || !Number.isFinite(item.currentPrice) || item.currentPrice <= 0 || isExcludedFromCatalog(item)) continue;
    // Copy only supported fields: legacy scores and estimated baselines are not evidence.
    items.set(item.id, {
      id: item.id, store: item.store, storeId: storeIdOf(item), brand: item.brand,
      modelCode: item.modelCode, title: item.title, category: item.category,
      currentPrice: item.currentPrice, regularPrice: item.regularPrice,
      productUrl: item.productUrl, imageUrl: item.imageUrl, inStock: item.inStock ?? null,
      updatedAt: item.updatedAt, refreshStatus: item.refreshStatus, lastAttemptAt: item.lastAttemptAt,
      history: mergeHistory([
        ...(item.history ?? []), ...(databaseHistory[item.id] ?? []),
        { date: item.updatedAt, price: item.currentPrice },
      ], item.updatedAt),
    });
  }
  const stores: StoreReport[] = [];
  const acceptedProducts: ScrapedProduct[] = [];
  for (const result of results) {
    const old = [...items.values()].filter(item => storeIdOf(item) === result.storeId);
    const eligible = result.products.filter(p => !isExcludedFromCatalog(p));
    const valid = new Map(eligible.filter(p => validProduct(p, result.storeId)).map(p => [p.storeSku, p]));
    const lowCoverage = valid.size === 0 || (old.length >= 10 && valid.size < old.length * 0.5);
    const reason = result.failed ? 'fetch_failed' : lowCoverage ? 'low_coverage'
      : eligible.some(p => !validProduct(p, result.storeId)) ? 'invalid_products' : undefined;
    const accept = !lowCoverage;
    for (const item of old) {
      items.set(item.id, { ...item, refreshStatus: 'retained', lastAttemptAt: capturedAt });
    }
    if (accept) {
      for (const product of valid.values()) {
        const id = `${product.storeId}-${product.storeSku}`;
        const oldItem = items.get(id);
        const history = mergeHistory([
          ...(oldItem?.history ?? []), ...(databaseHistory[id] ?? []),
          { date: capturedAt, price: product.offerPrice },
        ], capturedAt);
        items.set(id, {
          id, storeId: product.storeId, store: STORE_NAMES[product.storeId] ?? product.storeId,
          brand: product.brand, modelCode: product.modelCode || 'N/A', title: product.title,
          category: product.category, currentPrice: product.offerPrice, regularPrice: product.regularPrice,
          productUrl: product.productUrl, imageUrl: product.imageUrl, inStock: product.inStock,
          updatedAt: capturedAt, history, refreshStatus: 'updated', lastAttemptAt: capturedAt,
        });
        acceptedProducts.push(product);
      }
    }
    stores.push({
      storeId: result.storeId, status: !accept ? 'retained' : reason ? 'partial' : 'updated',
      received: result.products.length, accepted: accept ? valid.size : 0,
      retained: old.filter(item => !accept || !valid.has(item.id.slice(result.storeId.length + 1))).length,
      ...(reason ? { reason } : {}),
    });
  }
  return { items: [...items.values()], stores, acceptedProducts };
}
