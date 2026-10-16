interface NotFoundPageProps {
  onReturnHome?: () => void;
}

export function NotFoundPage({ onReturnHome }: NotFoundPageProps) {
  return (
    <main className="empty-state not-found-page">
      <a className="wordmark" href="/" aria-label="Black Friday SV, inicio">blackfriday<span>sv</span></a>
      <p className="eyebrow">Página no encontrada · 404</p>
      <h1>Esta página se nos escapó.</h1>
      <p>El enlace puede haber cambiado. Vuelve al catálogo para encontrar y comparar ofertas.</p>
      {onReturnHome ? <button type="button" className="btn btn-primary" onClick={onReturnHome}>Volver a las ofertas</button> : <a className="btn btn-primary" href="/">Volver a las ofertas</a>}
    </main>
  );
}
