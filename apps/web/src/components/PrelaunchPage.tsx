import { useState, useId, useEffect, type FormEvent } from "react";
import {
  Radar,
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
  ArrowUpRight,
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
    <div className="prelaunch-page">
      {/* 1. SECCIÓN DARK INTRO: Exactamente la misma cabecera y hero dark del sitio original */}
      <div className="dark-intro">
        <header className="site-header page-width">
          {/* Logo Canónico con Icono Radar y Colores Originales */}
          <a className="wordmark" href="/" aria-label="BlackFridaySV, inicio">
            <Radar aria-hidden="true" />
            <span>
              blackfriday<span className="wordmark-sv">sv</span>
              <span className="wordmark-dot">.</span>
            </span>
          </a>

          <nav aria-label="Navegación principal">
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => onOpenLegal("metodologia")}
            >
              Cómo comparamos
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => onOpenLegal("terminos")}
            >
              Aviso legal
            </button>
            <span className="nav-wishlist-link">
              <Sparkles size={13} aria-hidden="true" />
              <span>Wishlist 2026</span>
            </span>
          </nav>

          <div className="nav-actions">
            {isAdminUnlocked && (
              <button
                type="button"
                className="nav-radar-btn"
                onClick={onEnterAdmin}
                title="Acceso de Administrador al Catálogo"
              >
                <Lock size={13} aria-hidden="true" />
                <span>Ir al Catálogo (Admin)</span>
              </button>
            )}
          </div>
        </header>

        {/* Hero 2 Columnas: Izquierda Texto Dark / Derecha Tarjeta Blanca de Captación Wishlist */}
        <section className="hero page-width" aria-labelledby="prelaunch-hero-title">
          <div className="hero-copy">
            <div className="prelaunch-eyebrow">
              <Sparkles size={13} aria-hidden="true" />
              <span>Acceso Anticipado Exclusivo · Black Friday 2026</span>
            </div>

            <h1 id="prelaunch-hero-title">
              El buen precio
              <br />
              se <span>compara.</span>
            </h1>

            <p>
              Monitoreamos diariamente los principales almacenes de El Salvador para advertirte
              de precios inflados y mostrarte ofertas reales. Muy pronto abriremos el catálogo
              completo al público.
            </p>

            <div className="prelaunch-points-list">
              <div className="prelaunch-point-item">
                <Check size={15} aria-hidden="true" />
                <span>Historial real de precios sin falsos descuentos (Art. 31-32 LPC)</span>
              </div>
              <div className="prelaunch-point-item">
                <Check size={15} aria-hidden="true" />
                <span>Comparador de 8 almacenes salvadoreños en 1 sola vista</span>
              </div>
              <div className="prelaunch-point-item">
                <Check size={15} aria-hidden="true" />
                <span>Alertas personalizadas a tu correo según tu presupuesto</span>
              </div>
            </div>
          </div>

          {/* Tarjeta de Captura de Wishlist: Diseño Blanco / Paper con Verde Lima de la marca */}
          <article className="hero-feature prelaunch-card" id="wishlist">
            {state === "sent" ? (
              <div className="prelaunch-card-success" role="status">
                <div className="success-icon-badge">
                  <CheckCircle2 size={44} aria-hidden="true" />
                </div>
                <h2>¡Ya estás en la Wishlist oficial!</h2>
                <p>
                  Te enviamos un correo de confirmación seguro a <strong>{email}</strong>{" "}
                  (Double Opt-In vía Resend).
                </p>
                <div className="success-instructions-box">
                  <Check size={16} aria-hidden="true" />
                  <span>
                    Abre el enlace de tu correo para activar tus alertas antes del lanzamiento.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary prelaunch-reset-btn"
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
              <form onSubmit={handleSubmit} className="prelaunch-card-form">
                <div className="feature-heading">
                  <div className="prelaunch-badge-pill">
                    <Sparkles size={13} aria-hidden="true" />
                    <span>Únete a la Wishlist oficial</span>
                  </div>
                  <span className="prelaunch-season-tag">Temporada 2026</span>
                </div>

                <div className="prelaunch-form-intro">
                  <h3>Asegura tu acceso anticipado</h3>
                  <p>
                    Recibirás las mejores comparativas de precios de todos los almacenes de El
                    Salvador y las verdaderas ofertas de Black Friday en cuanto se liberen.
                  </p>
                </div>

                {/* Email Input */}
                <div className="prelaunch-input-group">
                  <label htmlFor={`${formId}-email`} className="prelaunch-input-label">
                    Tu correo electrónico
                  </label>
                  <input
                    id={`${formId}-email`}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="prelaunch-text-input"
                    disabled={state === "sending"}
                  />
                </div>

                {/* Categories Selector */}
                <div className="prelaunch-input-group">
                  <label className="prelaunch-input-label">
                    ¿Qué buscas en este Black Friday?{" "}
                    <span className="prelaunch-optional">(Opcional)</span>
                  </label>
                  <div className="prelaunch-category-chips">
                    {CATEGORY_ITEMS.map((cat) => {
                      const isSelected = categories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleCategory(cat.id)}
                          className={`prelaunch-category-btn ${
                            isSelected ? "is-selected" : ""
                          }`}
                          disabled={state === "sending"}
                        >
                          {isSelected && <Check size={11} aria-hidden="true" />}
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

                {/* Consent Checkbox */}
                <div className="prelaunch-consent-box">
                  <input
                    id={`${formId}-consent`}
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="prelaunch-check-input"
                    disabled={state === "sending"}
                  />
                  <label htmlFor={`${formId}-consent`} className="prelaunch-consent-label">
                    Acepto unirme a la Wishlist oficial y recibir alertas comerciales según la{" "}
                    <button
                      type="button"
                      className="legal-inline-link"
                      onClick={() => onOpenLegal("cookies")}
                    >
                      Política de Cookies y Publicidad
                    </button>
                    .
                  </label>
                </div>

                {error && (
                  <div className="prelaunch-error-banner" role="alert">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={state === "sending" || available === false}
                  className="btn btn-primary prelaunch-submit-action"
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

                <div className="prelaunch-form-guarantee">
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>
                    Cero spam · Baja en 1 clic en cualquier momento · Verificación Double Opt-In
                  </span>
                </div>
              </form>
            )}
          </article>
        </section>

        {/* Tira Canónica de Tiendas Monitoreadas */}
        <div className="store-strip page-width" aria-label="Almacenes monitoreados">
          <span>Precios de</span>
          {STORES.map((store) => (
            <strong key={store}>{store}</strong>
          ))}
          <span className="country-badge">El Salvador · USD</span>
        </div>
      </div>

      {/* 2. SECCIÓN CANVAS LIGHT: Con el Semáforo de Ofertas original ("los colorcitos") y Pilares */}
      <div className="prelaunch-canvas-section">
        <div className="page-width">
          {/* El Semáforo de Ofertas Original de BlackFridaySV */}
          <div className="prelaunch-signals-container">
            <div className="prelaunch-section-header">
              <span className="prelaunch-kicker">Auditoría con Criterio</span>
              <h2>El Semáforo de Ofertas de BlackFridaySV</h2>
              <p>
                Cada producto es auditado contra su historial de precios para clasificarlo con
                honestidad antes de que compres:
              </p>
            </div>

            <div className="signal-options prelaunch-signal-grid">
              <div className="signal-option signal-worth">
                <div className="signal-option-top">
                  <span className="signal-dot" aria-hidden="true" />
                  <strong>Vale la pena</strong>
                </div>
                <p className="signal-explanation">
                  Ganga histórica comprobada o precio menor al de los competidores.
                </p>
              </div>

              <div className="signal-option signal-regular">
                <div className="signal-option-top">
                  <span className="signal-dot" aria-hidden="true" />
                  <strong>Para comparar</strong>
                </div>
                <p className="signal-explanation">
                  Descuento anunciado pero sin suficiente historial para calificarlo de ganga.
                </p>
              </div>

              <div className="signal-option signal-wait">
                <div className="signal-option-top">
                  <span className="signal-dot" aria-hidden="true" />
                  <strong>Mejor esperar</strong>
                </div>
                <p className="signal-explanation">
                  El precio subió recientemente o un competidor lo tiene al menos 10% más barato.
                </p>
              </div>

              <div className="signal-option signal-unknown">
                <div className="signal-option-top">
                  <span className="signal-dot" aria-hidden="true" />
                  <strong>Por verificar</strong>
                </div>
                <p className="signal-explanation">
                  Producto nuevo en seguimiento sin registro suficiente de 30 días.
                </p>
              </div>
            </div>
          </div>

          {/* 3 Pilares del Radar */}
          <div className="prelaunch-features-grid">
            <div className="prelaunch-feature-box">
              <div className="feature-icon-wrapper">
                <TrendingDown size={22} aria-hidden="true" />
              </div>
              <h3>Detección de Precios Inflados</h3>
              <p>
                Guardamos capturas históricas de precios. Si un almacén subió el precio días antes
                para simular un falso 50% de descuento, el semáforo te lo advertirá al instante
                según los Art. 31-32 de la Ley de Protección al Consumidor.
              </p>
            </div>

            <div className="prelaunch-feature-box">
              <div className="feature-icon-wrapper">
                <Scale size={22} aria-hidden="true" />
              </div>
              <h3>Comparador Cross-Store</h3>
              <p>
                No pierdas tiempo saltando entre 8 sitios web lentos. Comparamos el mismo código
                de modelo de televisor, laptop o teléfono en todos los comercios de El Salvador en
                una sola pantalla.
              </p>
            </div>

            <div className="prelaunch-feature-box">
              <div className="feature-icon-wrapper">
                <Layers size={22} aria-hidden="true" />
              </div>
              <h3>Alertas a tu Medida</h3>
              <p>
                Elige exactamente qué productos te interesan y define tu presupuesto límite. Te
                notificaremos por correo únicamente cuando haya una bajada real de precio.
              </p>
            </div>
          </div>

          {/* Estadísticas en Vivo */}
          <div className="prelaunch-metrics-strip">
            <div className="metric-item">
              <span className="metric-number">1,199+</span>
              <span className="metric-label">Productos auditados en tiempo real</span>
            </div>
            <div className="metric-item">
              <span className="metric-number">8</span>
              <span className="metric-label">Almacenes salvadoreños monitoreados</span>
            </div>
            <div className="metric-item">
              <span className="metric-number">0%</span>
              <span className="metric-label">Tolerancia a inflaciones cosméticas</span>
            </div>
            <div className="metric-item">
              <span className="metric-number">100%</span>
              <span className="metric-label">Iniciativa cívica e independiente</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FOOTER CANÓNICO DEL SITIO ORIGINAL */}
      <footer className="site-footer page-width">
        <div>
          <a className="wordmark" href="/">
            <Radar aria-hidden="true" />
            <span>
              blackfriday<span className="wordmark-sv">sv</span>
              <span className="wordmark-dot">.</span>
            </span>
          </a>
          <p>Compara con calma. Compra con criterio.</p>
        </div>
        <div className="footer-links">
          <button type="button" onClick={() => onOpenLegal("terminos")}>
            Aviso legal
          </button>
          <button type="button" onClick={() => onOpenLegal("metodologia")}>
            Cómo comparamos
          </button>
          <button type="button" onClick={() => onOpenLegal("privacidad")}>
            Privacidad
          </button>
          <button type="button" onClick={() => onOpenLegal("cookies")}>
            Cookies y Publicidad
          </button>

          {/* Acceso discreto para Administrador */}
          <button
            type="button"
            className="footer-admin-btn"
            onClick={() => setAdminModalOpen(true)}
            aria-label="Acceso de administrador"
            title="Acceso de administrador"
          >
            <Lock size={12} aria-hidden="true" />
            <span>Acceso</span>
          </button>

          <span className="footer-by">
            Por:{" "}
            <a
              href="https://dannieldev.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              dannieldev
              <ArrowUpRight aria-hidden="true" />
            </a>
            {" y "}
            <a
              href="https://elite-portfolio-1.pages.dev/"
              target="_blank"
              rel="noopener noreferrer"
            >
              AndresDev
              <ArrowUpRight aria-hidden="true" />
            </a>
          </span>
        </div>
        <div className="footer-bottom">
          <span>Una iniciativa independiente en El Salvador.</span>
          <span>Los precios pueden cambiar. Confírmalos en la tienda.</span>
        </div>
      </footer>

      {/* Modal de Desbloqueo Administrador con Estética Original */}
      {adminModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-shell prelaunch-admin-modal">
            <header className="modal-header">
              <div className="admin-modal-title-row">
                <KeyRound size={18} aria-hidden="true" />
                <h2>Acceso Administrador</h2>
              </div>
              <button
                type="button"
                className="icon-button"
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

            <form onSubmit={handleAdminSubmit} className="prelaunch-admin-form">
              <p className="admin-form-intro">
                Introduce la clave de acceso de administrador para ver el catálogo completo de
                productos y el radar de tiendas.
              </p>

              <div className="admin-field-container">
                <input
                  type={showKey ? "text" : "password"}
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Clave de acceso..."
                  className="admin-key-input"
                  autoFocus
                />
                <button
                  type="button"
                  className="admin-show-key-btn"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {adminError && <div className="admin-error-banner">{adminError}</div>}

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setAdminModalOpen(false);
                    setAdminError("");
                    setAdminKey("");
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
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
