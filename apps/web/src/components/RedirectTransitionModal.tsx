import { useEffect, useRef, useState } from 'react';
import { Dialog } from './Dialog';
import { ShieldCheck, ArrowUpRight, X, AlertCircle } from 'lucide-react';
import { storeLabel, money, type DealItem } from '../lib/deals';

interface RedirectTransitionModalProps {
  deal: DealItem | null;
  targetUrl: string | null;
  onClose: () => void;
}

export const REDIRECT_STORAGE_KEY = 'bfsv_skip_redirect_screen';

export function RedirectTransitionModal({
  deal,
  targetUrl,
  onClose,
}: RedirectTransitionModalProps) {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [skipFuture, setSkipFuture] = useState(false);
  const skipFutureRef = useRef(skipFuture);
  skipFutureRef.current = skipFuture;
  const hasProceededRef = useRef(false);
  const proceedBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!deal || !targetUrl) return;

    // Si el usuario ya eligió no volver a ver esta pantalla en la sesión
    try {
      if (sessionStorage.getItem(REDIRECT_STORAGE_KEY) === 'true') {
        const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
        if (!win) {
          window.location.assign(targetUrl);
          return;
        }
        onClose();
        return;
      }
    } catch {
      // sessionStorage no disponible
    }

    setProgress(0);
    hasProceededRef.current = false;
    const duration = 2600; // 2.6 segundos para lectura cómoda y cívica
    let elapsed = 0;
    const step = 40;

    const interval = setInterval(() => {
      if (isPaused || skipFutureRef.current || hasProceededRef.current) return;

      elapsed += step;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        handleProceed(false);
      }
    }, step);

    return () => clearInterval(interval);
  }, [deal, targetUrl, isPaused]);

  if (!deal || !targetUrl) return null;

  const handleProceed = (isUserGesture = true) => {
    if (hasProceededRef.current) return;

    if (skipFutureRef.current) {
      try {
        sessionStorage.setItem(REDIRECT_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
    }

    const opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (opened) {
      hasProceededRef.current = true;
      onClose();
      return;
    }

    // Si la apertura automática fue bloqueada por el navegador (común en timers asíncronos),
    // no interrumpimos abruptamente la pestaña actual del usuario. Le pedimos tocar el botón.
    if (!isUserGesture) {
      setPopupBlocked(true);
      proceedBtnRef.current?.focus();
      return;
    }

    // Si fue un clic explícito del usuario y aún así se bloqueó (ej. webviews cerradas)
    hasProceededRef.current = true;
    window.location.assign(targetUrl);
  };

  const store = storeLabel(deal.store);

  return (
    <Dialog onClose={onClose} labelledBy="redirect-modal-title" className="redirect-modal-shell">
      <div
        className="redirect-modal-content"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <button
          type="button"
          className="icon-button redirect-close-btn"
          onClick={onClose}
          aria-label="Cancelar redirección"
        >
          <X aria-hidden="true" />
        </button>

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
          {deal.dealScore === 'descuento_cosmetico' && (
            <span className="redirect-verdict">Precio estándar de mercado en El Salvador</span>
          )}
        </div>

        {/* Barra de progreso de redirección */}
        {!popupBlocked && (
          <div
            className="redirect-progress-bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso de redirección automática"
          >
            <div className="redirect-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {popupBlocked ? (
          <div className="redirect-blocked-alert" role="status">
            <AlertCircle aria-hidden="true" />
            <span>Tu navegador requiere confirmación directa para abrir enlaces externos:</span>
          </div>
        ) : (
          <p className="redirect-hint">
            {isPaused || skipFuture
              ? 'Conteo pausado mientras revisas la información.'
              : 'Redirigiendo de forma segura a la página oficial de compra…'}
          </p>
        )}

        <div className="redirect-footer">
          <label className="redirect-skip-checkbox">
            <input
              type="checkbox"
              checked={skipFuture}
              onChange={(e) => {
                setSkipFuture(e.target.checked);
                if (e.target.checked) setIsPaused(true);
              }}
            />
            <span>No volver a mostrar en esta sesión</span>
          </label>

          <div className="redirect-footer-actions">
            <button
              type="button"
              className="btn btn-secondary redirect-cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              ref={proceedBtnRef}
              type="button"
              className="btn btn-primary redirect-instant-btn"
              onClick={() => handleProceed(true)}
            >
              Ir ya a {store}
              <ArrowUpRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
