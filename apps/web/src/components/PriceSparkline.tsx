import { useId } from 'react';
import type { DealItem } from '../lib/deals';

interface PriceSparklineProps {
  deal: DealItem;
  compact?: boolean;
}

const money = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' });
const date = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function PriceSparkline({ deal, compact = false }: PriceSparklineProps) {
  const id = useId();
  const observations = (deal.history ?? [])
    .filter((point) => Number.isFinite(point.price) && point.price > 0 && Number.isFinite(Date.parse(point.date)))
    .map((point) => ({ ...point, timestamp: Date.parse(point.date) }))
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter((point, index, all) => index === 0 || point.timestamp !== all[index - 1].timestamp);

  if (observations.length < 2) {
    return (
      <div className={`price-history price-history-empty${compact ? ' is-compact' : ''}`}>
        <p>Historial aún no disponible</p>
        {!compact && <span>Se necesitan al menos dos precios registrados en fechas distintas para mostrar su evolución.</span>}
      </div>
    );
  }

  const first = observations[0];
  const last = observations[observations.length - 1];
  const prices = observations.map((point) => point.price);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const priceRange = maximum - minimum;
  const timeRange = last.timestamp - first.timestamp;
  const points = observations.map((point) => ({
    x: 8 + ((point.timestamp - first.timestamp) / timeRange) * 304,
    y: priceRange === 0 ? 44 : 76 - ((point.price - minimum) / priceRange) * 64,
  }));

  return (
    <figure className={`price-history${compact ? ' is-compact' : ''}`}>
      <figcaption id={`${id}-caption`}>Precios registrados</figcaption>
      <svg viewBox="0 0 320 88" aria-hidden="true" focusable="false">
        <polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => <circle key={observations[index].date} cx={point.x} cy={point.y} r="3" fill="currentColor" />)}
      </svg>
      <div className="price-history-range" aria-hidden="true">
        <span>{date.format(first.timestamp)}</span>
        <span>{date.format(last.timestamp)}</span>
      </div>
      <details className="price-history-data">
        <summary>Ver {observations.length} registros</summary>
        <table aria-labelledby={`${id}-caption`}>
          <thead><tr><th scope="col">Fecha</th><th scope="col">Precio</th></tr></thead>
          <tbody>{observations.map((point) => <tr key={point.date}><th scope="row"><time dateTime={point.date}>{date.format(point.timestamp)}</time></th><td>{money.format(point.price)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
