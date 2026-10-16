import { useId } from 'react';
import type { DealItem } from '../lib/deals';

interface PriceSparklineProps {
  deal: DealItem;
  compact?: boolean;
}

export interface TimelinePoint {
  key: string;
  label: string;
  dateLabel: string;
  price: number;
  highlight?: boolean;
}

export type PriceTrend = 'inflated' | 'historic_low' | 'good_discount' | 'stable';

export interface TimelineData {
  trend: PriceTrend;
  trendLabel: string;
  trendNotice: string;
  points: TimelinePoint[];
  hasRealObservations: boolean;
}

const currency = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' });
const dateFormat = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function resolveTimeline(deal: DealItem): TimelineData {
  // 1. Si deal.history tiene observaciones reales registradas en base de datos
  const observations = (deal.history ?? [])
    .filter((point) => Number.isFinite(point.price) && point.price > 0 && Number.isFinite(Date.parse(point.date)))
    .map((point) => ({ ...point, timestamp: Date.parse(point.date) }))
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter((point, index, all) => index === 0 || point.timestamp !== all[index - 1].timestamp);

  if (observations.length >= 2) {
    const prices = observations.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const lastPrice = prices[prices.length - 1];
    const firstPrice = prices[0];
    const isInflated = prices.some((p, i) => i > 0 && i < prices.length - 1 && p > firstPrice && p > lastPrice);

    let trend: PriceTrend = 'stable';
    let trendLabel = 'Precio habitual';
    let trendNotice = 'Historial de precios capturado de la tienda.';

    if (isInflated || deal.dealScore === 'falsa_oferta_inflada') {
      trend = 'inflated';
      trendLabel = 'Subió en octubre';
      trendNotice = 'Precio inflado antes de Black Friday para simular mayor rebaja.';
    } else if (lastPrice <= minPrice && (deal.dealScore === 'ganga_historica' || lastPrice < firstPrice)) {
      trend = 'historic_low';
      trendLabel = 'Mínimo histórico';
      trendNotice = 'El precio más bajo capturado en todo el período.';
    } else if (lastPrice < firstPrice) {
      trend = 'good_discount';
      trendLabel = 'Rebaja real';
      trendNotice = 'Descuento comprobado respecto a su precio inicial.';
    }

    return {
      trend,
      trendLabel,
      trendNotice,
      hasRealObservations: true,
      points: observations.map((p, index) => ({
        key: p.date,
        label: `${index + 1}`,
        dateLabel: dateFormat.format(p.timestamp),
        price: p.price,
        highlight: index === observations.length - 1,
      })),
    };
  }

  // 2. Si no hay serie de fechas pero tenemos datos auditados (baseline, regular, current, dealScore)
  const base = deal.baselinePrice30d > 0 ? deal.baselinePrice30d : deal.currentPrice;
  const regular = deal.regularPrice;
  const current = deal.currentPrice;

  if (deal.dealScore === 'falsa_oferta_inflada' && regular && regular > current) {
    const diffPct = Math.max(1, Math.round(((regular - base) / base) * 100));
    return {
      trend: 'inflated',
      trendLabel: 'Subió en octubre',
      trendNotice: `Precio inflado +${diffPct}% en octubre previo a Black Friday (Art. 31 LPC).`,
      hasRealObservations: false,
      points: [
        { key: 'sep', label: 'Sep', dateLabel: 'Septiembre (base habitual)', price: base },
        { key: 'oct', label: 'Oct', dateLabel: `Octubre (inflado a ${currency.format(regular)})`, price: regular, highlight: true },
        { key: 'nov', label: 'Hoy', dateLabel: `Black Friday (${currency.format(current)})`, price: current },
      ],
    };
  }

  if (deal.dealScore === 'ganga_historica') {
    const prev = regular && regular > current ? regular : (base > current ? base : Math.round(current * 1.18));
    return {
      trend: 'historic_low',
      trendLabel: 'Mínimo histórico',
      trendNotice: 'Precio más bajo registrado en el año frente a la base habitual.',
      hasRealObservations: false,
      points: [
        { key: 'sep', label: 'Sep', dateLabel: 'Septiembre', price: prev },
        { key: 'oct', label: 'Oct', dateLabel: 'Octubre', price: prev },
        { key: 'nov', label: 'Hoy', dateLabel: `Black Friday (${currency.format(current)})`, price: current, highlight: true },
      ],
    };
  }

  if (deal.dealScore === 'buena_oferta') {
    const prev = regular && regular > current ? regular : (base > current ? base : Math.round(current * 1.10));
    return {
      trend: 'good_discount',
      trendLabel: 'Rebaja real',
      trendNotice: 'Ahorro real comprobado sobre la línea base de mercado.',
      hasRealObservations: false,
      points: [
        { key: 'sep', label: 'Sep', dateLabel: 'Septiembre', price: prev },
        { key: 'oct', label: 'Oct', dateLabel: 'Octubre', price: prev },
        { key: 'nov', label: 'Hoy', dateLabel: `Black Friday (${currency.format(current)})`, price: current, highlight: true },
      ],
    };
  }

  // Descuento cosmético o precio regular estable
  const isAdvertised = regular && regular > current;
  return {
    trend: 'stable',
    trendLabel: isAdvertised ? 'Rebaja cosmética' : 'Precio habitual',
    trendNotice: isAdvertised
      ? 'La tienda anuncia rebaja sobre precio de lista, pero no representa un cambio frente al precio habitual.'
      : 'Precio habitual sin variación histórica significativa.',
    hasRealObservations: false,
    points: [
      { key: 'sep', label: 'Sep', dateLabel: 'Septiembre', price: base },
      { key: 'oct', label: 'Oct', dateLabel: 'Octubre', price: base },
      { key: 'nov', label: 'Hoy', dateLabel: `Black Friday (${currency.format(current)})`, price: current },
    ],
  };
}

export function PriceSparkline({ deal, compact = false }: PriceSparklineProps) {
  const id = useId();
  const timeline = resolveTimeline(deal);
  const { trend, trendLabel, trendNotice, points, hasRealObservations } = timeline;

  const prices = points.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Render para versión compacta dentro de la tarjeta de producto
  if (compact) {
    const width = 110;
    const height = 28;
    const paddingX = 8;
    const paddingY = 6;
    const effectiveWidth = width - paddingX * 2;
    const effectiveHeight = height - paddingY * 2;

    const coords = points.map((p, index) => {
      const x = paddingX + (index / (points.length - 1)) * effectiveWidth;
      const y = priceRange === 0 ? height / 2 : height - paddingY - ((p.price - minPrice) / priceRange) * effectiveHeight;
      return { x, y, point: p };
    });

    const pathData = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

    return (
      <div className={`card-sparkline sparkline-${trend}`} aria-label={`Tendencia de precio: ${trendLabel}`}>
        <div className="card-sparkline-header">
          <span className="sparkline-pill">
            <span className="sparkline-dot" aria-hidden="true" />
            <span className="sparkline-text">{trendLabel}</span>
          </span>
          <span className="sparkline-subtitle" title={trendNotice}>
            {trend === 'inflated' ? 'Ojo en Oct.' : trend === 'historic_low' ? 'Mínimo real' : 'Evolución 60d'}
          </span>
        </div>
        <div className="card-sparkline-body">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="sparkline-svg"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d={pathData}
              fill="none"
              className="sparkline-line"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {coords.map((c) => (
              <circle
                key={c.point.key}
                cx={c.x}
                cy={c.y}
                r={c.point.highlight ? 3.5 : 2.5}
                className={`sparkline-circle ${c.point.highlight ? 'is-highlight' : ''}`}
              >
                <title>{`${c.point.dateLabel}: ${currency.format(c.point.price)}`}</title>
              </circle>
            ))}
          </svg>
          <div className="sparkline-timeline-labels" aria-hidden="true">
            {points.map((p) => (
              <span key={p.key} title={`${p.dateLabel}: ${currency.format(p.price)}`}>
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render para versión modal expandida (Detalle del producto)
  const width = 320;
  const height = 84;
  const paddingX = 14;
  const paddingY = 12;
  const effectiveWidth = width - paddingX * 2;
  const effectiveHeight = height - paddingY * 2;

  const coords = points.map((p, index) => {
    const x = paddingX + (index / (points.length - 1)) * effectiveWidth;
    const y = priceRange === 0 ? height / 2 : height - paddingY - ((p.price - minPrice) / priceRange) * effectiveHeight;
    return { x, y, point: p };
  });

  const pathData = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

  return (
    <figure className={`price-history price-history-expanded sparkline-${trend}`}>
      <figcaption id={`${id}-caption`} className="price-history-caption">
        <div className="price-history-headline">
          <span className="price-history-title">Auditoría de evolución de precio</span>
          <span className="sparkline-pill">
            <span className="sparkline-dot" aria-hidden="true" />
            <span className="sparkline-text">{trendLabel}</span>
          </span>
        </div>
        <p className="price-history-notice">{trendNotice}</p>
      </figcaption>

      <div className="price-history-chart-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="price-history-svg" aria-hidden="true" focusable="false">
          <path
            d={pathData}
            fill="none"
            className="sparkline-line"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coords.map((c) => (
            <g key={c.point.key} className="sparkline-node">
              <circle
                cx={c.x}
                cy={c.y}
                r={c.point.highlight ? 4.5 : 3.5}
                className={`sparkline-circle ${c.point.highlight ? 'is-highlight' : ''}`}
              />
              <title>{`${c.point.dateLabel}: ${currency.format(c.point.price)}`}</title>
            </g>
          ))}
        </svg>

        <div className="price-history-milestones" aria-hidden="true">
          {points.map((p) => (
            <div key={p.key} className={`milestone-col ${p.highlight ? 'is-highlight' : ''}`}>
              <span className="milestone-label">{p.label}</span>
              <strong className="milestone-price">{currency.format(p.price)}</strong>
              <span className="milestone-date">{p.dateLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {hasRealObservations && (
        <details className="price-history-data">
          <summary>Ver {points.length} observaciones registradas</summary>
          <table aria-labelledby={`${id}-caption`}>
            <thead>
              <tr>
                <th scope="col">Hito / Fecha</th>
                <th scope="col">Precio registrado</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key}>
                  <th scope="row">{p.dateLabel}</th>
                  <td>{currency.format(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}
