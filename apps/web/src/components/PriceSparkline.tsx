import { useId } from 'react';
import { money, type DealItem } from '../lib/deals';
import { captureDate, observationDate, priceEvidence } from '../lib/priceHistory';

export function PriceSparkline({ deal, compact = false }: { deal: DealItem; compact?: boolean }) {
  const id = useId();
  const evidence = priceEvidence(deal);
  const { points, sufficient, label, trend } = evidence;
  const first = points[0];
  const last = points.at(-1);
  const period = first && last
    ? `${observationDate(first.date)} al ${observationDate(last.date)}` : '';
  const canChart = sufficient && points.length > 1;
  const width = 320;
  const height = compact ? 40 : 90;
  const prices = points.map(p => p.price);
  const low = Math.min(...prices);
  const range = Math.max(...prices) - low;
  const duration = first && last ? Date.parse(last.date) - Date.parse(first.date) : 0;
  const coordinates = canChart ? points.map(p => ({
    x: 12 + ((Date.parse(p.date) - Date.parse(first.date)) / duration) * (width - 24),
    y: range === 0 ? height / 2 : height - 12 - ((p.price - low) / range) * (height - 24),
  })) : [];
  const chart = canChart && (
    <svg viewBox={`0 0 ${width} ${height}`} className={compact ? 'sparkline-svg' : 'price-history-svg'} aria-hidden="true">
      <path d={coordinates.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')}
        fill="none" className="sparkline-line" strokeWidth="2" strokeLinejoin="round" />
      {[coordinates[0], coordinates.at(-1)!].map((p, i) =>
        <circle key={i} cx={p.x} cy={p.y} r="3" className="sparkline-circle" />)}
    </svg>
  );
  if (compact) return (
    <div className={`card-sparkline sparkline-${trend}`} title={period || 'Aún no hay una serie de precios registrada.'}>
      <span className="sparkline-pill">{label}</span>
      {chart}
      <span className="history-period">{canChart ? period : 'Se necesitan capturas de días distintos.'}</span>
    </div>
  );

  return (
    <figure className={`price-history sparkline-${trend}`}>
      <figcaption id={id} className="price-history-caption">
        <div className="price-history-headline">
          <span className="price-history-title">Historial registrado en esta tienda</span>
          <span className="sparkline-pill">{label}</span>
        </div>
        <p className="price-history-notice">
          {canChart
            ? `${period}. ${points.length} capturas en ${evidence.days} días. Mínimo observado: ${money(evidence.minimum!)}.`
            : 'Todavía no hay capturas de al menos dos días distintos para comparar la evolución.'}
          {' '}El precio de lista anunciado no se usa para reconstruir el pasado.
        </p>
      </figcaption>
      {canChart ? (
        <div className="price-history-chart-wrap">
          {chart}
          <div className="history-endpoints">
            <span>{observationDate(first.date)}<strong>{money(first.price)}</strong></span>
            <span>{observationDate(last!.date)}<strong>{money(last!.price)}</strong></span>
          </div>
        </div>
      ) : (
        <div className="price-history-empty">
          <p>El historial se construye con cada captura.</p>
          <span>Mostraremos la gráfica cuando haya suficientes registros. No podemos afirmar un mínimo histórico todavía.</span>
        </div>
      )}
      {points.length > 0 && (
        <details className="price-history-data">
          <summary>Ver {points.length} {points.length === 1 ? 'captura registrada' : 'capturas registradas'}</summary>
          <div className="history-table-scroll" tabIndex={0} role="region" aria-label="Capturas de precio">
            <table aria-labelledby={id}>
              <thead><tr><th scope="col">Fecha y hora · El Salvador</th><th scope="col">Precio</th></tr></thead>
              <tbody>{points.map(p => (
                <tr key={p.date}><th scope="row">{captureDate(p.date)}</th><td>{money(p.price)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      )}
      {canChart && <p className="price-history-notice">La línea conecta capturas; no conocemos los cambios entre ellas. El mínimo corresponde únicamente a este periodo observado.</p>}
    </figure>
  );
}
