import { useEffect, useState } from 'react';
import { Dialog } from './Dialog';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { storeLabel, money, type DealItem } from '../lib/deals';

interface RedirectTransitionModalProps {
  deal: DealItem | null;
  targetUrl: string | null;
  onClose: () => void;
}

const REDIRECT_STORAGE_KEY = 'bfsv_skip_redirect_screen';

export function RedirectTransitionModal({
  deal,
  targetUrl,
  onClose,
}: RedirectTransitionModalProps) {
  const [progress, setProgress] = useState(0);
  const [skipFuture, setSkipFuture] = useState(false);

  useEffect(() => {
    if (!deal || !targetUrl) return;

    // Si el usuario ya eligió no volver a ver esta pantalla en la sesión
    if (sessionStorage.getItem(REDIRECT_STORAGE_KEY) === 'true') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      onClose();
      return;
    }

    setProgress(0);
    const startTime = Date.now();
    const duration = 1400; // 1.4 segundos para lectura cómoda

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        handleProceed();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [deal, targetUrl]);

  if (!deal || !targetUrl) return null;

  const handleProceed = () => {
    if (skipFuture) {
      sessionStorage.setItem(REDIRECT_STORAGE_KEY, 'true');
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const store = storeLabel(deal.store);

  return (
    <Dialog onClose={onClose} labelledBy="redirect-modal-title" className="redirect-modal-shell">
      <div className="redirect-modal-content">
        <div className="redirect-badge">
          <ShieldCheck aria-hidden="true" />
          <span>Auditoría Cívica Verificada</span>
        </div>

        <h2 id="redirect-modal-title">Te estamos redirigiendo a {store}</h2>

        <p className="redirect-product-name">{deal.title}</p>

        <div className="redirect-deal-summary">
          <div className="redirect-price-row">
            <span>Precio auditado:</span>
            <strong>{money(deal.currentPrice)}</strong>
          </div>
          {deal.dealScore === 'ganga_historica' && (
            <span className="redirect-verdict verdict-green">Mínimo histórico comprobado en El Salvador</span>
          )}
          {deal.dealScore === 'buena_oferta' && (
            <span className="redirect-verdict verdict-green">Rebaja real frente a su línea base de octubre</span>
          )}
          {deal.dealScore === 'falsa_oferta_inflada' && (
            <span className="redirect-verdict verdict-warning">Alerta: la tienda infló la referencia previa a Black Friday</span>
          )}
        </div>

        {/* Barra de progreso de redirección */}
        <div className="redirect-progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="redirect-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <p className="redirect-hint">Redirigiendo de forma segura a la página oficial de compra…</p>

        <div className="redirect-footer">
          <label className="redirect-skip-checkbox">
            <input
              type="checkbox"
              checked={skipFuture}
              onChange={(e) => setSkipFuture(e.target.checked)}
            />
            <span>No volver a mostrar en esta sesión</span>
          </label>

          <button className="btn btn-primary redirect-instant-btn" onClick={handleProceed}>
            Ir ya a {store}
            <ArrowUpRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </Dialog>
  );
}
