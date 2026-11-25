import { comparableOffers, storeLabel, type DealItem } from './deals.ts';
import { offerSignal, type OfferSignal } from './offerSignal.ts';

export interface TopRealDrop {
  deal: DealItem;
  signal: OfferSignal;
  referencePrice: number;
  savingsUsd: number;
  dropPercent: number;
}

export interface TopStoreGap {
  deal: DealItem;
  cheapestStore: string;
  cheapestPrice: number;
  highestStore: string;
  highestPrice: number;
  savingsUsd: number;
  savingsPercent: number;
  storeCount: number;
}

function dedupeKey(deal: DealItem): string {
  const model = deal.modelCode?.trim().toUpperCase();
  if (model && model !== 'N/A') return `${deal.brand.toUpperCase()}:${model}`;
  return `${storeLabel(deal.store).toLowerCase()}:${deal.title.toLowerCase().slice(0, 48)}`;
}

/**
 * Selecciona las mayores rebajas reales comprobadas (semáforo verde 'worth'),
 * ordenadas por porcentaje real de caída y ahorro en dólares, sin duplicados.
 */
export function selectTopRealDrops(
  deals: DealItem[],
  now = Date.now(),
  limit = 5,
): TopRealDrop[] {
  const candidates: TopRealDrop[] = [];

  for (const deal of deals) {
    if (deal.dataSource === 'demo' || deal.inStock === false) continue;
    const signal = offerSignal(deal, now);
    if (signal.level !== 'worth' || signal.savingPercent < 10) continue;

    const dropPercent = Math.round(signal.savingPercent);
    const referencePrice =
      Math.round((deal.currentPrice / (1 - signal.savingPercent / 100)) * 100) / 100;
    const savingsUsd = Math.round((referencePrice - deal.currentPrice) * 100) / 100;
    if (savingsUsd <= 0) continue;

    candidates.push({
      deal,
      signal,
      referencePrice,
      savingsUsd,
      dropPercent,
    });
  }

  candidates.sort(
    (a, b) =>
      b.dropPercent - a.dropPercent ||
      b.savingsUsd - a.savingsUsd ||
      a.deal.currentPrice - b.deal.currentPrice,
  );

  const seen = new Set<string>();
  const result: TopRealDrop[] = [];
  for (const item of candidates) {
    const key = dedupeKey(item.deal);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }

  return result;
}

/**
 * Selecciona los modelos exactos con la mayor brecha de precio real entre dos
 * o más tiendas salvadoreñas activas, mostrando siempre la tienda más barata.
 */
export function selectTopStoreGaps(
  deals: DealItem[],
  now = Date.now(),
  limit = 5,
): TopStoreGap[] {
  const bestByModel = new Map<string, TopStoreGap>();

  for (const deal of deals) {
    if (deal.dataSource === 'demo' || deal.inStock === false) continue;
    if (!deal.competitors?.length) continue;

    const offers = comparableOffers(deal).filter((o) => {
      if (o.inStock === false) return false;
      if (o.checkedAt) {
        const ageMs = now - Date.parse(o.checkedAt);
        if (Number.isFinite(ageMs) && ageMs > 7 * 86400000) return false;
      }
      return true;
    });

    if (offers.length < 2) continue;
    const cheapest = offers[0];
    const highest = offers[offers.length - 1];
    if (!cheapest.isCurrent) continue;

    const savingsUsd = Math.round((highest.price - cheapest.price) * 100) / 100;
    const savingsPercent = Math.round((savingsUsd / highest.price) * 100);
    if (savingsUsd < 15 || savingsPercent < 8) continue;

    const key = dedupeKey(deal);
    const existing = bestByModel.get(key);
    if (!existing || savingsUsd > existing.savingsUsd) {
      bestByModel.set(key, {
        deal,
        cheapestStore: storeLabel(cheapest.store),
        cheapestPrice: cheapest.price,
        highestStore: storeLabel(highest.store),
        highestPrice: highest.price,
        savingsUsd,
        savingsPercent,
        storeCount: offers.length,
      });
    }
  }

  return [...bestByModel.values()]
    .sort((a, b) => b.savingsUsd - a.savingsUsd || b.savingsPercent - a.savingsPercent)
    .slice(0, limit);
}
