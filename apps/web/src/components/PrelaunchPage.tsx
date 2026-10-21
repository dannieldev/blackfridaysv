import { useState, useId, useEffect, type FormEvent } from "react";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingDown,
  Layers,
  Scale,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { trackWishlistJoin } from "../lib/analytics";

interface PrelaunchPageProps {
  isAdminUnlocked: boolean;
  onEnterAdmin: () => void;
  onOpenLegal: (type: "terminos" | "metodologia" | "privacidad" | "cookies") => void;
}

const CATEGORY_ITEMS = [
  { id: "tv_audio", label: "TV y audio" },
  { id: "smartphones", label: "Celulares" },
  { id: "computacion", label: "Computación" },
  { id: "linea_blanca", label: "Electrodomésticos" },
  { id: "gaming", label: "Videojuegos" },
  { id: "moda_calzado", label: "Moda y calzado" },
  { id: "fotografia", label: "Fotografía" },
];

const STORES = [
  "Siman",
  "Walmart",
  "La Curacao",
  "Prado",
  "Omnisport",
  "RadioShack",
  "RAF",
  "Prisma Moda",
];

export function PrelaunchPage({
  isAdminUnlocked,
  onEnterAdmin,
  onOpenLegal,
}: PrelaunchPageProps) {
  const formId = useId();
  const [email, setEmail] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // Honeypot anti-bot
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);

  // Modal para ingresar clave de admin desde el footer
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    fetch("/api/subscriptions/config", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data) => setAvailable(data.enabled === true))
      .catch(() => setAvailable(false))
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const toggleCategory = (catId: string) => {
    setCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError("");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
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
      if (!response.ok) {
        throw new Error(result.error || "No pudimos registrar tu suscripción.");
      }

      setState("sent");
      trackWishlistJoin(categories);
      try {
        localStorage.setItem("blackfridaysv_lead_popup_dismissed", Date.now().toString());
      } catch {
        // noop
      }
    } catch (err) {
      setError(
        err instanceof Error && err.name !== "AbortError"
          ? err.message
          : "La solicitud tardó demasiado. Por favor revisa tu buzón de correo."
      );
      setState("idle");
    } finally {
      clearTimeout(timer);
    }
  };

  const handleAdminSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (adminKey.trim().toLowerCase() === "dannieldev") {
      try {
        localStorage.setItem("bfsv_admin_access", "true");
      } catch {
        // noop
      }
      setAdminModalOpen(false);
      setAdminError("");
      onEnterAdmin();
    } else {
      setAdminError("Clave de administrador incorrecta.");
    }
  };

  return (
    <div className="prelaunch-root">
      {/* Header Prelanzamiento */}
      <header className="prelaunch-header">
        <div className="prelaunch-header-inner page-width">
          <div className="prelaunch-brand">
            <span className="brand-title">
              blackfriday<strong>sv</strong>
              <span className="brand-dot">.</span>
            </span>
            <span className="prelaunch-badge">
              <Sparkles size={12} aria-hidden="true" />
              <span>Lista de Espera 2026</span>
            </span>
          </div>

          <div className="prelaunch-nav">
            <button
              type="button"
              className="prelaunch-nav-btn"
              onClick={() => onOpenLegal("metodologia")}
            >
              Cómo comparamos
            </button>
            <button
              type="button"
              className="prelaunch-nav-btn"
              onClick={() => onOpenLegal("terminos")}
            >
              Términos
            </button>
            {isAdminUnlocked && (
              <button
                type="button"
                className="prelaunch-admin-return-btn"
                onClick={onEnterAdmin}
              >
                <Lock size={13} aria-hidden="true" />
                <span>Ir al Catálogo (Admin)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="prelaunch-main">
        {/* Hero Section */}
        <section className="prelaunch-hero page-width">
          <div className="prelaunch-hero-badge">
            <Sparkles size={14} className="hero-badge-sparkle" aria-hidden="true" />
            <span>Acceso Anticipado Exclusivo · Black Friday El Salvador</span>
          </div>

          <h1 className="prelaunch-hero-title">
            El buen precio no se adivina. <br />
            <span className="highlight-text">Se compara con datos.</span>
          </h1>

          <p className="prelaunch-hero-desc">
            Monitoreamos diariamente Siman, Walmart, Prado, La Curacao, Omnisport y más
            para advertirte de precios inflados y mostrarte ofertas reales. Muy pronto
            abriremos el catálogo completo al público.
          </p>

          {/* Formulario Wishlist Destacado */}
          <div className="prelaunch-form-card" id="wishlist">
            {state === "sent" ? (
              <div className="prelaunch-success" role="status">
                <div className="success-icon-box">
                  <CheckCircle2 size={44} className="success-check-icon" aria-hidden="true" />
                </div>
                <h2>¡Ya estás en la Wishlist oficial!</h2>
                <p>
                  Te enviamos un correo de confirmación seguro a <strong>{email}</strong>{" "}
                  (Double Opt-In vía Resend).
                </p>
                <div className="success-instructions">
                  <Check size={16} aria-hidden="true" />
                  <span>
                    Abre el enlace de tu correo para activar tus alertas antes del lanzamiento.
                  </span>
                </div>
                <button
                  type="button"
                  className="prelaunch-reset-btn"
                  onClick={() => {
                    setState("idle");
                    setEmail("");
                    setCategories([]);
                    setConsent(false);
                  }}
                >
                  Registrar otro correo
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="prelaunch-form">
                <div className="form-card-header">
                  <div className="form-header-badge">
                    <Sparkles size={13} aria-hidden="true" />
                    <span>Únete a la Wishlist oficial</span>
                  </div>
                  <h3>Asegura tu acceso anticipado</h3>
                  <p>
                    Recibirás las mejores comparativas de precios de todos los almacenes de El
                    Salvador y las verdaderas ofertas de Black Friday en cuanto se liberen.
                  </p>
                </div>

                {/* Email input */}
                <div className="prelaunch-field">
                  <label htmlFor={`${formId}-email`} className="prelaunch-label">
                    Tu correo electrónico
                  </label>
                  <input
                    id={`${formId}-email`}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="prelaunch-input"
                    disabled={state === "sending"}
                  />
                </div>

                {/* Categories selector */}
                <div className="prelaunch-field">
                  <label className="prelaunch-label">
                    ¿Qué buscas en este Black Friday?{" "}
                    <span className="label-sub">(Opcional, te enviaremos lo más relevante)</span>
                  </label>
                  <div className="prelaunch-chips-grid">
                    {CATEGORY_ITEMS.map((cat) => {
                      const isSelected = categories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleCategory(cat.id)}
                          className={`prelaunch-chip ${isSelected ? "prelaunch-chip-active" : ""}`}
                          disabled={state === "sending"}
                        >
                          {isSelected && <Check size={12} aria-hidden="true" />}
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Honeypot anti-bot */}
                <div style={{ display: "none" }} aria-hidden="true">
                  <label htmlFor={`${formId}-website`}>Sitio web</label>
                  <input
                    id={`${formId}-website`}
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                {/* Consent checkbox */}
                <div className="prelaunch-consent-row">
                  <input
                    id={`${formId}-consent`}
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="prelaunch-checkbox"
                    disabled={state === "sending"}
                  />
                  <label htmlFor={`${formId}-consent`} className="consent-text">
                    Acepto unirme a la Wishlist oficial y recibir alertas comerciales según la{" "}
                    <button
                      type="button"
                      className="consent-link-btn"
                      onClick={() => onOpenLegal("cookies")}
                    >
                      Política de Cookies y Publicidad
                    </button>
                    .
                  </label>
                </div>

                {error && (
                  <div className="prelaunch-error-box" role="alert">
                    {error}
                  </div>
                )}

                {/* Action button */}
                <button
                  type="submit"
                  disabled={state === "sending" || available === false}
                  className="prelaunch-submit-btn"
                >
                  {state === "sending" ? (
                    <span>Registrando tu lugar...</span>
                  ) : (
                    <>
                      <span>Unirme a la Wishlist oficial</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </button>

                <div className="prelaunch-form-footer">
                  <ShieldCheck size={14} className="security-icon" aria-hidden="true" />
                  <span>
                    Cero spam · Baja en 1 clic en cualquier momento · Verificación Double Opt-In
                  </span>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Tiendas Rastreadas */}
        <section className="prelaunch-stores-section page-width">
          <p className="stores-label">Monitoreamos el catálogo real de los almacenes del país:</p>
          <div className="stores-list">
            {STORES.map((store) => (
              <span key={store} className="store-tag">
                {store}
              </span>
            ))}
          </div>
        </section>

        {/* Pilares del Proyecto */}
        <section className="prelaunch-pillars page-width">
          <div className="pillar-card">
            <div className="pillar-icon-box">
              <TrendingDown size={22} aria-hidden="true" />
            </div>
            <h4>Detección de Precios Inflados</h4>
            <p>
              Guardamos capturas históricas de precios. Si un almacén subió el precio días antes
              para simular un falso 50% de descuento, el semáforo te lo advertirá al instante
              (Art. 31-32 Ley de Protección al Consumidor).
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box">
              <Scale size={22} aria-hidden="true" />
            </div>
            <h4>Comparador Cross-Store</h4>
            <p>
              No pierdas tiempo navegando entre 8 sitios web lentos. Comparamos el mismo modelo de
              televisor, laptop o teléfono en todos los comercios de El Salvador en una sola vista.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box">
              <Layers size={22} aria-hidden="true" />
            </div>
            <h4>Alertas a tu Medida</h4>
            <p>
              Elige exactamente qué productos te interesan y define tu presupuesto límite. Te
              notificaremos por correo únicamente cuando haya una bajada real de precio.
            </p>
          </div>
        </section>

        {/* Métricas en Números */}
        <section className="prelaunch-stats page-width">
          <div className="stat-box">
            <span className="stat-number">1,199+</span>
            <span className="stat-desc">Productos auditados en tiempo real</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">8</span>
            <span className="stat-desc">Almacenes salvadoreños monitoreados</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">0%</span>
            <span className="stat-desc">Tolerancia a inflaciones cosméticas</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">100%</span>
            <span className="stat-desc">Iniciativa cívica e independiente</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="prelaunch-footer">
        <div className="prelaunch-footer-inner page-width">
          <div className="footer-left">
            <p className="footer-copy">
              © 2026 BlackFridaySV. Desarrollado de forma independiente por{" "}
              <a
                href="https://dannieldev.com"
                target="_blank"
                rel="noreferrer"
                className="footer-author-link"
              >
                @dannieldev
              </a>{" "}
              para El Salvador.
            </p>
          </div>

          <div className="footer-right">
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => onOpenLegal("terminos")}
            >
              Términos
            </button>
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => onOpenLegal("metodologia")}
            >
              Metodología
            </button>
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => onOpenLegal("privacidad")}
            >
              Privacidad
            </button>
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => onOpenLegal("cookies")}
            >
              Cookies
            </button>

            {/* Acceso discreto para Administrador */}
            <button
              type="button"
              className="footer-admin-trigger"
              onClick={() => setAdminModalOpen(true)}
              aria-label="Acceso de administrador"
              title="Acceso de administrador"
            >
              <Lock size={12} aria-hidden="true" />
              <span>Acceso</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modal de Desbloqueo Administrador */}
      {adminModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <header className="admin-modal-header">
              <div className="admin-modal-title">
                <KeyRound size={16} aria-hidden="true" />
                <span>Acceso Administrador</span>
              </div>
              <button
                type="button"
                className="icon-button modal-close"
                onClick={() => {
                  setAdminModalOpen(false);
                  setAdminError("");
                  setAdminKey("");
                }}
                aria-label="Cerrar modal"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={handleAdminSubmit} className="admin-modal-form">
              <p className="admin-modal-desc">
                Introduce la clave de acceso de administrador para ver el catálogo completo de
                productos y el radar de tiendas.
              </p>

              <div className="admin-input-group">
                <input
                  type={showKey ? "text" : "password"}
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Clave de acceso..."
                  className="admin-input"
                  autoFocus
                />
                <button
                  type="button"
                  className="admin-toggle-visibility"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {adminError && <div className="admin-error-text">{adminError}</div>}

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-cancel-btn"
                  onClick={() => {
                    setAdminModalOpen(false);
                    setAdminError("");
                    setAdminKey("");
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="admin-confirm-btn">
                  Desbloquear catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
