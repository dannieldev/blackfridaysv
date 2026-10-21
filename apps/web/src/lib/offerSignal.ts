import { comparableOffers, money, storeLabel, type DealItem } from './deals';
import { freshness } from './freshness';
import { priceEvidence } from './priceHistory';

export type SignalLevel = 'worth' | 'regular' | 'wait' | 'unknown';
export interface OfferSignal { level: SignalLevel; reason: string; savingPercent: number }
export const SIGNALS = [
  { id: 'worth', label: 'Vale la pena', description: 'Bajada comprobada de al menos 10%' },
  { id: 'regular', label: 'Para comparar', description: 'Sin una ventaja destacada' },
  { id: 'wait', label: 'Mejor esperar', description: 'Vimos un precio bastante menor' },
  { id: 'unknown', label: 'Por verificar', description: 'Faltan datos recientes o historial' },
] as const;
const localDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' });
const result = (level: SignalLevel, reason: string, savingPercent = 0): OfferSignal => ({ level, reason, savingPercent });

export function offerSignal(deal: DealItem, now = Date.now()): OfferSignal {
  if (deal.dataSource === 'demo') return result('unknown', 'Es un ejemplo de demostración, no una oferta evaluada.');
  if (!Number.isFinite(deal.currentPrice) || deal.currentPrice <= 0) return result('unknown', 'No hay un precio válido para evaluar.');
  if (freshness(deal, now) !== 'recent') return result('unknown', 'Necesitamos una captura de las últimas 24 horas para evaluar este precio.');
  if (deal.inStock === false) return result('unknown', 'La fuente lo reporta agotado. Confirma disponibilidad antes de decidir.');

  const cheaper = deal.category !== 'moda_calzado' ? comparableOffers(deal).find(offer => !offer.isCurrent
    && offer.inStock === true && freshness(offer, now) === 'recent'
    && Math.round(offer.price * 100) * 10 <= Math.round(deal.currentPrice * 100) * 9) : undefined;
  if (cheaper) return result('wait', `El mismo modelo aparece a ${money(cheaper.price)} en ${storeLabel(cheaper.store)}, al menos 10% menos. Revisa variante y envío.`);

  const evidence = priceEvidence(deal, now);
  if (!evidence.currentMatches) return result('unknown', 'Todavía no hay una serie de capturas que respalde el precio actual.');
  const capture = Date.parse(deal.checkedAt!);
  const today = localDay.format(new Date(capture));
  const prices = new Map<number, Set<string>>();
  for (const point of evidence.points) {
    const time = Date.parse(point.date);
    const date = localDay.format(new Date(time));
    if (date === today || time < capture - 30 * 86400000) continue;
    const amount = Math.round(point.price * 100) / 100;
    const entry = prices.get(amount) ?? new Set<string>();
    entry.add(date);
    prices.set(amount, entry);
  }
  const stable = [...prices].filter(([, days]) => days.size >= 2);
  if (!stable.length) return result('unknown', 'Necesitamos repetir un precio en al menos dos días anteriores. El porcentaje anunciado no basta para calificarlo.');

  const lower = stable.filter(([price]) => Math.round(deal.currentPrice * 100) * 10 >= Math.round(price * 100) * 11).sort(([a], [b]) => a - b)[0];
  if (lower) return result('wait', `Lo capturamos a ${money(lower[0])} en al menos dos días de los últimos 30. Ahora cuesta al menos 10% más.`);
  const reference = stable.filter(([price]) => price > deal.currentPrice).sort(([a], [b]) => a - b)[0]?.[0];
  const reduction = reference ? (1 - deal.currentPrice / reference) * 100 : 0;
  if (reference && Math.round(deal.currentPrice * 100) * 10 <= Math.round(reference * 100) * 9 && evidence.isObservedLow) {
    return result('worth', `Bajó ${Math.round(reduction)}% frente a ${money(reference)}, capturados en al menos dos días anteriores. Es el mínimo del periodo observado.`, reduction);
  }
  return result('regular', 'Con el historial disponible, no cumple el criterio de bajada destacada ni el de un precio al menos 10% más alto. Compara condiciones y envío.');
}

export function compareSignals(a: OfferSignal, b: OfferSignal): number {
  const order = { worth: 0, regular: 1, unknown: 2, wait: 3 };
  return order[a.level] - order[b.level] || b.savingPercent - a.savingPercent;
}
