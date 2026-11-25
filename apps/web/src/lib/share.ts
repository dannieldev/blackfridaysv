import { money, storeLabel, type DealItem } from './deals.ts';
import type { OfferSignal } from './offerSignal.ts';

const DEFAULT_ORIGIN = 'https://blackfridaysv.dannieldev.com';

export function buildDealShareUrl(deal: Pick<DealItem, 'id'>, origin?: string): string {
  const base = origin && /^https?:\/\//i.test(origin) ? origin : DEFAULT_ORIGIN;
  const url = new URL('/', base);
  url.searchParams.set('deal', deal.id);
  return url.href;
}

export function buildDealShareMessage(
  deal: Pick<DealItem, 'id' | 'title' | 'store' | 'currentPrice'>,
  signal?: Pick<OfferSignal, 'level' | 'reason' | 'savingPercent'>,
  origin?: string,
): string {
  const store = storeLabel(deal.store);
  const shareUrl = buildDealShareUrl(deal, origin);
  const verdict =
    signal?.level === 'worth'
      ? `✅ Bajó ${Math.round(signal.savingPercent)}% real (${signal.reason})`
      : signal?.level === 'wait'
        ? `⚠️ Precio aumentado (${signal.reason})`
        : signal?.level === 'regular'
          ? '🔎 Precio habitual (para comparar)'
          : '🔎 Precio verificado hoy';

  return `${deal.title} a ${money(deal.currentPrice)} en ${store} — ${verdict}.\nAudítalo en Radar Black Friday SV: ${shareUrl}`;
}

export function buildWhatsAppShareUrl(
  deal: Pick<DealItem, 'id' | 'title' | 'store' | 'currentPrice'>,
  signal?: Pick<OfferSignal, 'level' | 'reason' | 'savingPercent'>,
  origin?: string,
): string {
  const text = buildDealShareMessage(deal, signal, origin);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
