export interface Observation { date: string; price: number }
interface PriceRecord {
  currentPrice: number;
  checkedAt?: string;
  history?: Observation[];
}

const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' });
export const observationDate = (date: string) => new Intl.DateTimeFormat('es-SV', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/El_Salvador',
}).format(new Date(date));
export const captureDate = (date?: string) => date && Number.isFinite(Date.parse(date))
  ? new Intl.DateTimeFormat('es-SV', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/El_Salvador',
  }).format(new Date(date)) : 'Fecha no disponible';

export function priceEvidence(deal: PriceRecord, now = Date.now()) {
  const captured = Date.parse(deal.checkedAt ?? '');
  const end = Number.isFinite(captured) ? Math.min(now, captured) : now;
  const unique = new Map<number, number>();
  for (const point of deal.history ?? []) {
    const time = Date.parse(point.date);
    if (Number.isFinite(time) && time <= end && time >= now - 90 * 86400000
      && Number.isFinite(point.price) && point.price > 0) unique.set(time, point.price);
  }
  const points = [...unique].sort(([a], [b]) => a - b)
    .map(([time, price]) => ({ date: new Date(time).toISOString(), price }));
  const days = new Set(points.map(p => day.format(new Date(p.date)))).size;
  const first = points[0];
  const last = points.at(-1);
  const sufficient = days >= 2;
  const currentMatches = last?.price === deal.currentPrice && Date.parse(last.date) === captured;
  const minimum = points.length ? Math.min(...points.map(p => p.price)) : null;
  const changed = points.some(p => p.price !== first?.price);
  const isObservedLow = sufficient && currentMatches && changed && last.price === minimum;
  const trend = !sufficient || !currentMatches ? 'insufficient'
    : isObservedLow ? 'historic_low' : last.price < first.price ? 'good_discount'
    : last.price > first.price ? 'higher' : 'stable';
  const label = {
    insufficient: 'Historial en formación', historic_low: 'Mínimo del periodo',
    good_discount: 'Bajó desde la primera captura', higher: 'Subió desde la primera captura',
    stable: 'Sin cambio entre extremos',
  }[trend];
  return { points, days, sufficient, currentMatches, minimum, isObservedLow, trend, label };
}
