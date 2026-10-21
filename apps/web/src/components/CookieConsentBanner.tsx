import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import { updateAnalyticsConsent } from '../lib/analytics';

interface CookieConsentBannerProps {
  onOpenCookies: () => void;
}

const STORAGE_KEY = 'blackfridaysv_cookie_consent';

export function CookieConsentBanner({ onOpenCookies }: CookieConsentBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        // Mostrar con un pequeño retraso para no bloquear el primer render
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignorar fallos de acceso a localStorage en navegadores en modo estricto
    }
  }, []);

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // noop
    }
    updateAnalyticsConsent('granted');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      className="cookie-banner"
      role="region"
      aria-label="Aviso de cookies y almacenamiento local"
    >
      <div className="cookie-banner-content page-width">
        <div className="cookie-banner-text">
          <Cookie className="cookie-icon" size={20} aria-hidden="true" />
          <p>
            Usamos almacenamiento local para guardar tus favoritos y el Radar sin rastreadores invasivos. Conoce nuestra{' '}
            <button
              type="button"
              className="cookie-link-button"
              onClick={onOpenCookies}
            >
              Política de Cookies y Publicidad
            </button>.
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button
            type="button"
            className="btn btn-secondary cookie-btn-sm"
            onClick={onOpenCookies}
          >
            Ver detalles
          </button>
          <button
            type="button"
            className="btn btn-primary cookie-btn-sm"
            onClick={handleAccept}
          >
            Entendido
          </button>
          <button
            type="button"
            className="icon-button cookie-close-btn"
            onClick={handleAccept}
            aria-label="Cerrar aviso de cookies"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
