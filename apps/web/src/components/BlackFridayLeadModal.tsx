import { useState, useId, useEffect, type FormEvent } from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Dialog } from './Dialog';
import { CATEGORY_LABELS } from '../../../../packages/notifications/src/contracts';
import { trackWishlistJoin } from '../lib/analytics';

interface BlackFridayLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCookies: () => void;
}

export function BlackFridayLeadModal({ isOpen, onClose, onOpenCookies }: BlackFridayLeadModalProps) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    fetch('/api/subscriptions/config', { signal: controller.signal })
      .then(response => response.ok ? response.json() : { enabled: false })
      .then(data => setAvailable(data.enabled === true))
      .catch(() => setAvailable(false))
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [isOpen]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!available || state === 'sending') return;
    setState('sending');
    setError('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          consent: true,
          newsletter: true,
          categories,
          maxBudget: null,
          alert: null,
          website,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No pudimos registrar tu suscripción.');
      setState('sent');
      trackWishlistJoin(categories);
      try {
        localStorage.setItem('blackfridaysv_lead_popup_dismissed', Date.now().toString());
      } catch {
        // noop
      }
    } catch (err) {
      setError(
        err instanceof Error && err.name !== 'AbortError'
          ? err.message
          : 'La solicitud tardó demasiado. Revisa tu buzón de correo antes de intentar nuevamente.'
      );
      setState('idle');
    } finally {
      clearTimeout(timer);
    }
  }

  function handleDismiss() {
    try {
      localStorage.setItem('blackfridaysv_lead_popup_dismissed', Date.now().toString());
    } catch {
      // noop
    }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <Dialog onClose={handleDismiss} labelledBy={`${id}-title`} className="lead-capture-modal">
      <header className="lead-capture-header">
        <div className="lead-capture-badge">
          <Sparkles size={14} className="lead-badge-icon" aria-hidden="true" />
          <span>Acceso Anticipado · Wishlist Black Friday 2026</span>
        </div>
        <button
          type="button"
          className="icon-button modal-close"
          onClick={handleDismiss}
          aria-label="Cerrar ventana de ofertas"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div className="lead-capture-body">
        {state === 'sent' ? (
          <div role="status" className="lead-capture-success">
            <div className="lead-success-icon-wrapper">
              <CheckCircle2 size={44} className="lead-success-icon" aria-hidden="true" />
            </div>
            <h3>¡Ya estás en la Wishlist oficial!</h3>
            <p>
              Te enviamos un enlace de confirmación seguro a <strong>{email}</strong> (Double Opt-In vía Resend).
            </p>
            <p className="lead-success-note">
              Haz clic en el botón del correo para confirmar tu lugar y recibir las primeras alertas de ofertas auténticas cuando lancemos.
            </p>
            <button type="button" className="btn btn-primary" onClick={handleDismiss}>
              Continuar navegando el catálogo
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="lead-capture-form">
            <div className="lead-capture-intro">
              <h2 id={`${id}-title`}>
                Bienvenido a BlackFridaySV
              </h2>
              <p>
                Muy pronto recibirás las mejores comparativas de precios de todos los almacenes de El Salvador y todas las ofertas de Black Friday para una compra verdadera y sin inflaciones.
              </p>
            </div>

            {available === false && (
              <p role="status" className="subscription-notice">
                El servicio de correo se encuentra en mantenimiento temporal. Puedes guardar productos directamente con el botón de Guardados.
              </p>
            )}

            <div className="lead-field-group">
              <label htmlFor={`${id}-email`} className="lead-field-label">
                Correo electrónico
                <input
                  id={`${id}-email`}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  required
                  autoFocus
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="lead-input"
                />
              </label>
            </div>

            <fieldset className="lead-categories-fieldset">
              <legend className="lead-categories-legend">
                ¿Qué buscas en este Black Friday? <small>(Opcional, sin selección te enviaremos lo más destacado)</small>
              </legend>
              <div className="lead-categories-grid">
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                  const isChecked = categories.includes(key);
                  return (
                    <label key={key} className={`lead-category-chip ${isChecked ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e =>
                          setCategories(current =>
                            e.target.checked ? [...current, key] : current.filter(c => c !== key)
                          )
                        }
                        className="sr-only"
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Honeypot anti-spam para bots */}
            <div className="subscription-honeypot" aria-hidden="true">
              <label>
                Sitio web
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                />
              </label>
            </div>

            <label className="subscription-check lead-consent-check">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
              />
              <span>
                Acepto unirme a la Wishlist y recibir alertas comerciales de Black Friday según la{' '}
                <button
                  type="button"
                  className="legal-inline-link"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenCookies();
                  }}
                >
                  Política de Cookies y Publicidad
                </button>.
              </span>
            </label>

            {error && <p role="alert" className="subscription-error">{error}</p>}

            <div className="lead-actions">
              <button
                type="submit"
                className="btn btn-primary lead-submit-btn"
                disabled={available === false || state === 'sending' || !email.trim() || !consent}
              >
                {state === 'sending' ? 'Registrando en la Wishlist…' : 'Unirme a la Wishlist oficial'}
              </button>
            </div>

            <div className="lead-footer-notes">
              <div className="lead-trust-item">
                <ShieldCheck size={14} aria-hidden="true" />
                <span>Cero spam · Baja en 1 clic en cada correo · Resend Double Opt-In</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
