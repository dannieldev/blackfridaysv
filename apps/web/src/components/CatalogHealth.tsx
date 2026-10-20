import { useEffect, useState } from 'react';
import { storeLabel, type DealItem } from '../lib/deals';
import { freshness, freshnessLabel, type Capture } from '../lib/freshness';
import { captureDate } from '../lib/priceHistory';

function useCurrentTime() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function CaptureStatus({ item }: { item: Capture }) {
  const now = useCurrentTime();
  const state = freshness(item, now);
  return (
    <span className={`capture-status capture-${state}`}>
      {freshnessLabel(item, now)} · {captureDate(item.checkedAt)}
    </span>
  );
}

export function CatalogHealth({ deals, onReload }: { deals: DealItem[]; onReload: () => void }) {
  const now = useCurrentTime();
  const stores = [...new Set(deals.map(d => storeLabel(d.store)))];
  const pending = deals.filter(d => freshness(d, now) !== 'recent').length;
  return (
    <details className={`catalog-health ${pending ? 'needs-update' : ''}`}>
      <summary>
        <span>{pending ? `${pending} de ${deals.length} precios necesitan una nueva captura` : 'Precios capturados en las últimas 24 horas'}</span>
        <span>Estado por tienda</span>
      </summary>
      <div className="catalog-health-content">
        <p>Conservamos el último precio conocido cuando no hay una captura nueva. Confirma precio y disponibilidad en la tienda antes de comprar.</p>
        <ul>{stores.map(store => {
          const products = deals.filter(d => storeLabel(d.store) === store);
          const outdated = products.filter(d => freshness(d, now) !== 'recent').length;
          const dates = products.flatMap(d => d.checkedAt ? [d.checkedAt] : []).sort();
          return <li key={store}>
            <strong>{store}</strong>
            <span>{products.length - outdated} recientes · {outdated} pendientes</span>
            <small>Captura más antigua: {captureDate(dates[0])}</small>
          </li>;
        })}</ul>
        <button className="btn btn-secondary" onClick={onReload}>Volver a consultar el catálogo</button>
        <p>Esta consulta carga el catálogo disponible; no inicia una extracción en las tiendas. Horas de El Salvador.</p>
      </div>
    </details>
  );
}
