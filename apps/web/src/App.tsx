import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Gamepad2,
  Heart,
  LayoutGrid,
  List,
  Laptop,
  MessageCircle,
  Radar,
  Refrigerator,
  Search,
  SlidersHorizontal,
  Smartphone,
  Store,
  Tv,
  X,
} from "lucide-react";
import {
  comparableOffers,
  discountPercent,
  loadCatalog,
  money,
  storeLabel,
} from "./lib/deals";
import type { DataSource, DealItem } from "./lib/deals";
import { Dialog } from "./components/Dialog";
import { LegalModals } from "./components/LegalModals";
import type { LegalModalType } from "./components/LegalModals";
import { NotFoundPage } from "./components/NotFoundPage";
import { PriceSparkline } from "./components/PriceSparkline";
import { SkeletonCard } from "./components/SkeletonCard";
import { Toast } from "./components/Toast";

export type { DealItem } from "./lib/deals";

const CATEGORIES = [
  { id: "all", label: "Todo el catálogo", icon: LayoutGrid },
  { id: "tv_audio", label: "TV y audio", icon: Tv },
  { id: "smartphones", label: "Celulares", icon: Smartphone },
  { id: "computacion", label: "Computación", icon: Laptop },
  { id: "linea_blanca", label: "Electrodomésticos", icon: Refrigerator },
  { id: "gaming", label: "Videojuegos", icon: Gamepad2 },
];
const STORES = ["Siman", "Walmart", "La Curacao", "Prado", "Omnisport"];
const BUDGETS = [
  { id: "all", label: "Cualquier precio" },
  { id: "under100", label: "Menos de $100" },
  { id: "100to300", label: "$100 a $300" },
  { id: "300to600", label: "Más de $300 a $600" },
  { id: "over600", label: "Más de $600" },
];
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const matchesStore = (deal: DealItem, store: string) =>
  normalize(deal.store).includes(normalize(store));
const knownModel = (deal: DealItem) =>
  Boolean(deal.modelCode && deal.modelCode !== "N/A");
const dateLabel = (date?: string) =>
  date && Number.isFinite(Date.parse(date))
    ? new Intl.DateTimeFormat("es-SV", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/El_Salvador",
      }).format(new Date(date))
    : "Fecha de captura no disponible";

function readSaved(): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("blackfridaysv_saved_deals") || "[]",
    );
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function ProductImage({
  deal,
  eager = false,
}: {
  deal: DealItem;
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return deal.imageUrl && failedSrc !== deal.imageUrl ? (
    <img
      src={deal.imageUrl}
      alt={deal.title}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailedSrc(deal.imageUrl ?? null)}
    />
  ) : (
    <div className="image-placeholder">
      <Store aria-hidden="true" />
      <span>Imagen no disponible</span>
    </div>
  );
}

function PriceEvidence({ deal }: { deal: DealItem }) {
  const offers = comparableOffers(deal);
  const others = offers.filter((offer) => !offer.isCurrent);
  const cheaper = others.length > 0 && others[0].price < deal.currentPrice;
  return (
    <span
      className={`price-evidence ${others.length ? (cheaper ? "evidence-caution" : "evidence-compare") : ""}`}
    >
      <span className="evidence-dot" aria-hidden="true" />
      {others.length
        ? cheaper
          ? `Desde ${money(others[0].price)} en otra tienda`
          : `${offers.length} tiendas para comparar`
        : deal.dataSource === "demo"
          ? "Ejemplo de demostración"
          : "Precio publicado por la tienda"}
    </span>
  );
}

function DealCard({
  deal,
  saved,
  onSave,
  onOpen,
}: {
  deal: DealItem;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  const discount = discountPercent(deal);
  return (
    <article className="deal-card">
      <div className="product-visual">
        <button
          className="product-image-button"
          onClick={onOpen}
          aria-label={`Ver detalles de ${deal.title}`}
        >
          <ProductImage deal={deal} />
        </button>
        <button
          className={`save-button icon-button ${saved ? "is-saved" : ""}`}
          onClick={onSave}
          aria-label={`${saved ? "Quitar de guardados" : "Guardar"}: ${deal.title}`}
          aria-pressed={saved}
        >
          <Heart fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        {discount !== null && discount > 0 && (
          <span className="advertised-discount">−{discount}% anunciado</span>
        )}
      </div>
      <div className="product-content">
        <div className="product-meta">
          <span>{storeLabel(deal.store)}</span>
          <span>{deal.inStock === false ? "Agotado" : deal.brand}</span>
        </div>
        <h3>
          <button onClick={onOpen}>{deal.title}</button>
        </h3>
        <div className="card-price">
          <strong>{money(deal.currentPrice)}</strong>
          {deal.regularPrice !== null &&
            deal.regularPrice > deal.currentPrice && (
              <span>
                <span className="sr-only">Referencia anunciada: </span>
                <s>{money(deal.regularPrice)}</s>
              </span>
            )}
        </div>
        <PriceEvidence deal={deal} />
        <button className="card-action" onClick={onOpen}>
          Ver precio y detalles
          <ArrowUpRight aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export default function App() {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [source, setSource] = useState<DataSource>("snapshot");
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [isLoading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [stores, setStores] = useState<string[]>([]);
  const [budget, setBudget] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "discounted" | "compare" | "saved"
  >("all");
  const [sort, setSort] = useState("compare");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [savedIds, setSavedIds] = useState(readSaved);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealItem | null>(null);
  const [legal, setLegal] = useState<LegalModalType>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [missingDeal, setMissingDeal] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    loadCatalog()
      .then((catalog) => {
        if (active) {
          setDeals(catalog.deals);
          setSource(catalog.source);
          setUpdatedAt(catalog.updatedAt);
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);
  useEffect(() => {
    const syncHash = () => {
      let hash = window.location.hash.slice(1);
      try {
        hash = decodeURIComponent(hash);
      } catch {
        /* Invalid links resolve to the unavailable-product state. */
      }
      if (["terminos", "metodologia", "privacidad"].includes(hash)) {
        setLegal(hash as LegalModalType);
        setSelectedDeal(null);
        setMissingDeal(false);
      } else if (hash.startsWith("deal-") && !isLoading) {
        const match = deals.find((deal) => deal.id === hash.slice(5));
        setSelectedDeal(match ?? null);
        setMissingDeal(!match);
        setLegal(null);
      } else {
        setSelectedDeal(null);
        setLegal(null);
        setMissingDeal(false);
      }
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [deals, isLoading]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector("dialog[open]"))
        return;
      if (
        (event.target as HTMLElement).matches(
          'input, textarea, select, [contenteditable="true"]',
        )
      )
        return;
      if (
        event.key === "/" ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "blackfridaysv_saved_deals" || event.key === null)
        setSavedIds(readSaved());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const notify = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };
  const save = (deal: DealItem) => {
    const exists = savedIds.includes(deal.id);
    const next = exists
      ? savedIds.filter((id) => id !== deal.id)
      : [...savedIds, deal.id];
    setSavedIds(next);
    try {
      localStorage.setItem("blackfridaysv_saved_deals", JSON.stringify(next));
      notify(
        exists
          ? "Producto retirado de guardados"
          : "Guardado. Puedes compararlo después.",
      );
    } catch {
      notify("Guardado en esta sesión. El navegador no permitió conservarlo.");
    }
  };
  const closeOverlay = () => {
    setSelectedDeal(null);
    setLegal(null);
    setMissingDeal(false);
    history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  };
  const openDeal = (deal: DealItem) => {
    window.location.hash = `deal-${encodeURIComponent(deal.id)}`;
  };
  const openLegal = (type: Exclude<LegalModalType, null>) => {
    window.location.hash = type;
  };
  const scrollToResults = () =>
    resultsRef.current?.scrollIntoView({
      behavior: "instant",
      block: "start",
    });
  const change = (callback: () => void) => {
    callback();
    setPage(1);
  };
  const toggleStore = (store: string) =>
    change(() =>
      setStores((previous) =>
        previous.includes(store)
          ? previous.filter((item) => item !== store)
          : [...previous, store],
      ),
    );
  const reset = () => {
    setSearch("");
    setCategory("all");
    setStores([]);
    setBudget("all");
    setAvailableOnly(false);
    setFilter("all");
    setPage(1);
  };
  const showSaved = () => {
    reset();
    setFilter("saved");
    scrollToResults();
  };
  const categoryDeals = useMemo(
    () =>
      deals.filter((deal) => category === "all" || deal.category === category),
    [deals, category],
  );
  const filtered = useMemo(() => {
    const terms = normalize(search.trim()).split(/\s+/).filter(Boolean);
    const result = categoryDeals.filter((deal) => {
      const text = normalize(
        `${deal.title} ${deal.brand} ${deal.modelCode} ${deal.store}`,
      );
      return (
        terms.every((term) => text.includes(term)) &&
        (!stores.length || stores.some((store) => matchesStore(deal, store))) &&
        (!availableOnly || deal.inStock === true) &&
        (budget === "all" ||
          (budget === "under100" && deal.currentPrice < 100) ||
          (budget === "100to300" &&
            deal.currentPrice >= 100 &&
            deal.currentPrice <= 300) ||
          (budget === "300to600" &&
            deal.currentPrice > 300 &&
            deal.currentPrice <= 600) ||
          (budget === "over600" && deal.currentPrice > 600)) &&
        (filter === "all" ||
          (filter === "discounted" && (discountPercent(deal) ?? 0) > 0) ||
          (filter === "compare" && comparableOffers(deal).length > 1) ||
          (filter === "saved" && savedIds.includes(deal.id)))
      );
    });
    return result.sort((a, b) => {
      if (sort === "price_asc") return a.currentPrice - b.currentPrice;
      if (sort === "price_desc") return b.currentPrice - a.currentPrice;
      if (sort === "discount")
        return (discountPercent(b) ?? 0) - (discountPercent(a) ?? 0);
      if (sort === "savings")
        return (
          Math.max(0, (b.regularPrice ?? b.currentPrice) - b.currentPrice) -
          Math.max(0, (a.regularPrice ?? a.currentPrice) - a.currentPrice)
        );
      return (
        comparableOffers(b).length - comparableOffers(a).length ||
        (comparableOffers(a).length > 1 ? a.currentPrice - b.currentPrice : 0)
      );
    });
  }, [
    categoryDeals,
    search,
    stores,
    budget,
    availableOnly,
    filter,
    savedIds,
    sort,
  ]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pages);
  const visibleDeals = filtered.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const savedCount = deals.filter((deal) => savedIds.includes(deal.id)).length;
  const storeCount = new Set(deals.map((deal) => deal.store)).size;
  const featured = useMemo(() => {
    const comparable = deals.filter(
      (deal) => comparableOffers(deal).length > 1 && deal.inStock !== false,
    );
    return (
      comparable.find(
        (deal) =>
          deal.modelCode === "UN65U8000" &&
          comparableOffers(deal)[0]?.isCurrent,
      ) ??
      comparable.find((deal) => comparableOffers(deal)[0]?.isCurrent) ??
      comparable[0]
    );
  }, [deals]);
  const featuredOffers = featured ? comparableOffers(featured) : [];
  const activeCount =
    stores.length + Number(budget !== "all") + Number(availableOnly);
  const hasFilters =
    activeCount > 0 ||
    category !== "all" ||
    filter !== "all" ||
    Boolean(search);

  const filterControls = (mobile = false) => (
    <>
      <div className="filter-title">
        <h2 id={mobile ? "mobile-filters-title" : undefined}>A tu medida</h2>
        {activeCount > 0 && (
          <button
            className="text-button"
            onClick={() =>
              change(() => {
                setStores([]);
                setBudget("all");
                setAvailableOnly(false);
              })
            }
          >
            Limpiar
          </button>
        )}
      </div>
      <fieldset className="filter-group">
        <legend>Tiendas</legend>
        {STORES.map((store) => (
          <label className="filter-choice" key={store}>
            <input
              type="checkbox"
              checked={stores.includes(store)}
              onChange={() => toggleStore(store)}
            />
            <span>{store}</span>
            <span className="filter-count">
              {categoryDeals.filter((deal) => matchesStore(deal, store)).length}
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="filter-group">
        <legend>Tu presupuesto</legend>
        {BUDGETS.map((item) => (
          <label className="filter-choice" key={item.id}>
            <input
              type="radio"
              name={mobile ? "mobile-budget" : "budget"}
              checked={budget === item.id}
              onChange={() => change(() => setBudget(item.id))}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </fieldset>
      <label className="filter-choice stock-filter">
        <input
          type="checkbox"
          checked={availableOnly}
          onChange={(event) =>
            change(() => setAvailableOnly(event.target.checked))
          }
        />
        <span>Solo con stock confirmado</span>
      </label>
      <p className="filter-hint">
        La disponibilidad y el precio final se confirman en la tienda.
      </p>
      {!mobile && (
        <div className="sidebar-note">
          <Radar aria-hidden="true" />
          <h3>El contexto importa.</h3>
          <p>
            Un precio tachado cuenta una parte. Compara el mismo modelo antes de
            decidir.
          </p>
          <button
            className="text-button"
            onClick={() => openLegal("metodologia")}
          >
            Así comparamos
            <ArrowUpRight aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
  const copyLink = async (deal: DealItem) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/#deal-${encodeURIComponent(deal.id)}`,
      );
      notify("Enlace copiado");
    } catch {
      notify("No pudimos copiar. Puedes copiar la dirección del navegador.");
    }
  };
  if (window.location.pathname !== "/") return <NotFoundPage />;

  return (
    <>
      <div className="dark-intro">
        <header className="site-header page-width">
          <a className="wordmark" href="/" aria-label="BlackFridaySV, inicio">
            <Radar aria-hidden="true" />
            <span>
              blackfriday<span className="wordmark-sv">sv</span>
              <span className="wordmark-dot">.</span>
            </span>
          </a>
          <nav aria-label="Navegación principal">
            <a className="nav-active" href="#catalogo">
              Ofertas
            </a>
            <a href="#como-comparamos">Cómo comparamos</a>
          </nav>
          <button
            className="nav-saved"
            onClick={showSaved}
            aria-label={`Ver guardados (${savedCount})`}
          >
            <Heart aria-hidden="true" />
            <span>Guardados</span>
            <span className="saved-count">{savedCount}</span>
          </button>
        </header>
        <section className="hero page-width" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">
              El buen precio
              <br />
              se <span>compara.</span>
            </h1>
            <p>
              Encuentra tu próxima compra. Compara precios de El Salvador y
              decide con más información.
            </p>
            <form
              className="hero-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                scrollToResults();
              }}
            >
              <Search aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(event) =>
                  change(() => setSearch(event.target.value))
                }
                placeholder="¿Qué estás buscando?"
                aria-label="Buscar producto, marca o modelo"
              />
              <button type="submit" aria-label="Buscar en el catálogo">
                <ArrowRight aria-hidden="true" />
              </button>
            </form>
            <a className="hero-browse" href="#catalogo">
              Ver todas las ofertas <ArrowDown aria-hidden="true" />
            </a>
            <div className="quick-search">
              <span>Prueba con</span>
              {["Smart TV", "Samsung", "Laptop"].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    reset();
                    setSearch(term);
                    scrollToResults();
                  }}
                >
                  {term}
                  <ArrowUpRight aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <div className="hero-feature loading-feature" aria-busy="true">
              <span>Cargando comparación…</span>
            </div>
          ) : featured ? (
            <article className="hero-feature">
              <div className="feature-heading">
                <span>Un mismo modelo. Distintos precios.</span>
                <ArrowDown aria-hidden="true" />
              </div>
              <div className="feature-product">
                <div className="feature-image">
                  <ProductImage deal={featured} eager />
                </div>
                <div>
                  <span className="feature-brand">{featured.brand}</span>
                  <h2>
                    {featured.modelCode === "UN65U8000"
                      ? "Smart TV 65″ Crystal UHD 4K"
                      : featured.title}
                  </h2>
                  <span className="model-label">{featured.modelCode}</span>
                </div>
              </div>
              <div className="feature-offers">
                {featuredOffers.slice(0, 3).map((offer, index) => (
                  <div
                    className={
                      index === 0 ? "feature-offer lowest" : "feature-offer"
                    }
                    key={offer.store}
                  >
                    <span>
                      {storeLabel(offer.store)}
                      {index === 0 && (
                        <span className="lowest-label">
                          Menor de esta comparación
                        </span>
                      )}
                    </span>
                    <strong>{money(offer.price)}</strong>
                    {index === 0 && <Check aria-hidden="true" />}
                  </div>
                ))}
              </div>
              <button
                className="feature-link"
                onClick={() => openDeal(featured)}
              >
                Ver la comparación completa
                <ArrowUpRight aria-hidden="true" />
              </button>
            </article>
          ) : (
            <div className="hero-feature feature-empty">
              <Radar aria-hidden="true" />
              <h2>
                Busca. Compara.
                <br />
                Decide a tu ritmo.
              </h2>
              <p>
                Los detalles de cada producto te ayudan a entender el precio
                publicado.
              </p>
              <a className="btn btn-primary" href="#catalogo">
                Ver catálogo
              </a>
            </div>
          )}
        </section>
        <div className="store-strip page-width">
          <span>Precios de</span>
          {STORES.map((store) => (
            <button
              key={store}
              onClick={() => {
                reset();
                setStores([store]);
                scrollToResults();
              }}
            >
              {store}
            </button>
          ))}
          <span className="store-strip-note">El Salvador · USD</span>
        </div>
      </div>
      <main id="main-content">
        <section
          className="catalog page-width"
          id="catalogo"
          ref={resultsRef}
          aria-labelledby="catalog-title"
        >
          <div className="catalog-heading">
            <div>
              <h2 id="catalog-title" tabIndex={-1}>
                Tu próxima buena compra.
              </h2>
              <p>
                {isLoading
                  ? "Preparando el catálogo…"
                  : `${deals.length} productos. ${storeCount} tiendas. Más contexto para elegir.`}
              </p>
            </div>
            <div className="catalog-source">
              <span className="source-dot" aria-hidden="true" />
              <span>
                {source === "demo"
                  ? "Catálogo de demostración"
                  : "Última captura"}
                <small>
                  {source === "demo"
                    ? "Los ejemplos no son ofertas vigentes"
                    : dateLabel(updatedAt)}
                </small>
              </span>
            </div>
          </div>
          {(source === "demo" || loadError) && !isLoading && (
            <div className="catalog-warning" role="status">
              <CircleHelp aria-hidden="true" />
              <p>
                {loadError
                  ? "No pudimos cargar el catálogo. Reintenta para consultar los precios."
                  : "No pudimos consultar las fuentes. Estos productos son ejemplos, no ofertas vigentes."}
              </p>
              <button
                className="text-button"
                onClick={() => setReloadKey((value) => value + 1)}
              >
                Reintentar
              </button>
            </div>
          )}
          <div className="category-nav" aria-label="Categorías">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-pressed={category === id}
                onClick={() => change(() => setCategory(id))}
                className={category === id ? "selected" : ""}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="catalog-layout">
            <aside className="filter-sidebar" aria-label="Filtrar catálogo">
              {filterControls()}
            </aside>
            <div className="results-area">
              <div className="results-tabs" aria-label="Tipo de resultados">
                {(
                  [
                    { id: "all", label: "Todos" },
                    { id: "discounted", label: "Con rebaja anunciada" },
                    { id: "compare", label: "Para comparar" },
                    { id: "saved", label: "Guardados" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => change(() => setFilter(item.id))}
                    aria-pressed={filter === item.id}
                    className={filter === item.id ? "selected" : ""}
                  >
                    {item.label}
                    {item.id === "saved" && <span>{savedCount}</span>}
                  </button>
                ))}
              </div>
              <div className="results-toolbar">
                <button
                  className="btn btn-secondary mobile-filter-trigger"
                  onClick={() => setFiltersOpen(true)}
                >
                  <SlidersHorizontal aria-hidden="true" />
                  Filtros{activeCount > 0 && <span>{activeCount}</span>}
                </button>
                <span
                  className="result-count"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {isLoading
                    ? "Cargando…"
                    : `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`}
                </span>
                <label className="sort-control">
                  <span className="sort-label">Ordenar:</span>
                  <select
                    aria-label="Ordenar productos"
                    value={sort}
                    onChange={(event) =>
                      change(() => setSort(event.target.value))
                    }
                  >
                    <option value="compare">Comparables primero</option>
                    <option value="price_asc">Menor precio</option>
                    <option value="price_desc">Mayor precio</option>
                    <option value="discount">Mayor rebaja anunciada (%)</option>
                    <option value="savings">Mayor rebaja anunciada ($)</option>
                  </select>
                  <ChevronDown aria-hidden="true" />
                </label>
                <div className="view-switch">
                  <button
                    className="icon-button"
                    onClick={() => setView("grid")}
                    aria-label="Vista de tarjetas"
                    aria-pressed={view === "grid"}
                  >
                    <LayoutGrid aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => setView("list")}
                    aria-label="Vista de lista"
                    aria-pressed={view === "list"}
                  >
                    <List aria-hidden="true" />
                  </button>
                </div>
              </div>
              {hasFilters && (
                <div className="active-filters" aria-label="Filtros aplicados">
                  {search && (
                    <button onClick={() => change(() => setSearch(""))}>
                      “{search}”<X aria-label="Quitar búsqueda" />
                    </button>
                  )}
                  {category !== "all" && (
                    <button onClick={() => change(() => setCategory("all"))}>
                      {CATEGORIES.find((item) => item.id === category)?.label}
                      <X aria-label="Quitar categoría" />
                    </button>
                  )}
                  {stores.map((store) => (
                    <button key={store} onClick={() => toggleStore(store)}>
                      {store}
                      <X aria-label="Quitar tienda" />
                    </button>
                  ))}
                  {budget !== "all" && (
                    <button onClick={() => change(() => setBudget("all"))}>
                      {BUDGETS.find((item) => item.id === budget)?.label}
                      <X aria-label="Quitar presupuesto" />
                    </button>
                  )}
                  {availableOnly && (
                    <button
                      onClick={() => change(() => setAvailableOnly(false))}
                    >
                      Stock confirmado
                      <X aria-label="Quitar disponibilidad" />
                    </button>
                  )}
                  <button className="clear-all" onClick={reset}>
                    Limpiar todo
                  </button>
                </div>
              )}
              {isLoading ? (
                <div
                  className="deals-grid"
                  aria-label="Cargando productos"
                  aria-busy="true"
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <SkeletonCard key={index} />
                  ))}
                </div>
              ) : visibleDeals.length ? (
                <div
                  className={`deals-grid ${view === "list" ? "list-view" : ""}`}
                >
                  {visibleDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      saved={savedIds.includes(deal.id)}
                      onSave={() => save(deal)}
                      onOpen={() => openDeal(deal)}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  {filter === "saved" ? (
                    <Heart aria-hidden="true" />
                  ) : (
                    <Search aria-hidden="true" />
                  )}
                  <h3>
                    {filter === "saved"
                      ? "Tu lista empieza con un corazón."
                      : "No encontramos esa combinación."}
                  </h3>
                  <p>
                    {filter === "saved"
                      ? "Guarda productos para tenerlos a mano. Si ya tienes guardados, prueba quitar los filtros."
                      : "Prueba otra búsqueda o quita los filtros para ver más productos."}
                  </p>
                  <button className="btn btn-primary" onClick={reset}>
                    Ver todo el catálogo
                  </button>
                </div>
              )}
              {!isLoading && filtered.length > 0 && (
                <div className="pagination">
                  <label>
                    Ver{" "}
                    <select
                      aria-label="Productos por página"
                      value={pageSize}
                      onChange={(event) =>
                        change(() => setPageSize(Number(event.target.value)))
                      }
                    >
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                      <option value={10000}>Todos</option>
                    </select>{" "}
                    por página
                  </label>
                  <span>
                    {(activePage - 1) * pageSize + 1}–
                    {Math.min(activePage * pageSize, filtered.length)} de{" "}
                    {filtered.length}
                  </span>
                  <nav aria-label="Paginación">
                    <button
                      className="icon-button"
                      disabled={activePage === 1}
                      aria-label="Página anterior"
                      onClick={() => {
                        setPage(activePage - 1);
                        scrollToResults();
                      }}
                    >
                      <ChevronLeft aria-hidden="true" />
                    </button>
                    <span>
                      {activePage} / {pages}
                    </span>
                    <button
                      className="icon-button"
                      disabled={activePage === pages}
                      aria-label="Página siguiente"
                      onClick={() => {
                        setPage(activePage + 1);
                        scrollToResults();
                      }}
                    >
                      <ChevronRight aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </section>
        <section
          className="guide-section"
          id="como-comparamos"
          aria-labelledby="guide-title"
        >
          <div className="page-width guide-layout">
            <div>
              <Radar aria-hidden="true" />
              <h2 id="guide-title">
                Menos impulso.
                <br />
                Más información.
              </h2>
              <p>
                Un porcentaje grande no cuenta toda la historia. Te ayudamos a
                mirar el precio con contexto.
              </p>
              <button
                className="text-button"
                onClick={() => openLegal("metodologia")}
              >
                Conoce nuestra metodología
                <ArrowUpRight aria-hidden="true" />
              </button>
            </div>
            <div className="guide-questions">
              <details open>
                <summary>
                  ¿Qué significa el precio tachado?
                  <ChevronDown aria-hidden="true" />
                </summary>
                <p>
                  Es el precio de referencia que anuncia la tienda. La
                  diferencia con el precio publicado es una rebaja anunciada;
                  por sí sola no demuestra cuánto costaba el producto antes.
                </p>
              </details>
              <details>
                <summary>
                  ¿Cómo comparan entre tiendas?
                  <ChevronDown aria-hidden="true" />
                </summary>
                <p>
                  Agrupamos coincidencias de marca y código de modelo. Cuando
                  encontramos el mismo modelo en más de una tienda, mostramos
                  sus precios juntos. Revisa capacidad, color y otras variantes
                  antes de comprar.
                </p>
              </details>
              <details>
                <summary>
                  ¿Puedo saber si es su mínimo histórico?
                  <ChevronDown aria-hidden="true" />
                </summary>
                <p>
                  Solo si existen suficientes observaciones fechadas. Cuando la
                  fuente no incluye ese historial, lo indicamos en la ficha. No
                  dibujamos tendencias a partir de precios de referencia.
                </p>
              </details>
              <details>
                <summary>
                  ¿Compro directamente en BlackFridaySV?
                  <ChevronDown aria-hidden="true" />
                </summary>
                <p>
                  No vendemos productos ni procesamos pagos. El enlace te lleva
                  al almacén, donde debes confirmar precio, entrega, garantía y
                  disponibilidad.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer page-width">
        <div>
          <a className="wordmark" href="/">
            <Radar aria-hidden="true" />
            <span>
              blackfriday<span className="wordmark-sv">sv</span>.
            </span>
          </a>
          <p>Compara con calma. Compra con criterio.</p>
        </div>
        <div className="footer-links">
          <button onClick={() => openLegal("terminos")}>Aviso legal</button>
          <button onClick={() => openLegal("metodologia")}>Metodología</button>
          <button onClick={() => openLegal("privacidad")}>Privacidad</button>
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
              href="https://github.com/andoqv"
              target="_blank"
              rel="noopener noreferrer"
            >
              Andres
              <ArrowUpRight aria-hidden="true" />
            </a>
          </span>
        </div>
        <div className="footer-bottom">
          <span>Una iniciativa independiente en El Salvador.</span>
          <span>Los precios pueden cambiar. Confírmalos en la tienda.</span>
        </div>
      </footer>
      {filtersOpen && (
        <Dialog
          onClose={() => setFiltersOpen(false)}
          labelledBy="mobile-filters-title"
          className="filter-modal"
        >
          <div className="modal-header">
            <span>Filtrar productos</span>
            <button
              className="icon-button"
              onClick={() => setFiltersOpen(false)}
              aria-label="Cerrar filtros"
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="mobile-filter-content">{filterControls(true)}</div>
          <div className="filter-modal-footer">
            <button
              className="btn btn-primary"
              onClick={() => setFiltersOpen(false)}
            >
              Ver {filtered.length}{" "}
              {filtered.length === 1 ? "resultado" : "resultados"}
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </Dialog>
      )}
      {selectedDeal && (
        <Dialog
          onClose={closeOverlay}
          labelledBy="deal-title"
          className="deal-modal"
        >
          <div className="modal-header">
            <span>La información detrás del precio</span>
            <button
              className="icon-button modal-close"
              onClick={closeOverlay}
              aria-label="Cerrar detalles"
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="modal-body">
            <div className="detail-intro">
              <div className="detail-image">
                <ProductImage deal={selectedDeal} eager />
              </div>
              <div>
                <span className="detail-store">
                  {storeLabel(selectedDeal.store)}
                </span>
                <h2 id="deal-title">{selectedDeal.title}</h2>
                {knownModel(selectedDeal) && (
                  <p className="model-label">Modelo {selectedDeal.modelCode}</p>
                )}
                <strong className="detail-price">
                  {money(selectedDeal.currentPrice)}
                </strong>
                <p className="detail-reference">
                  {selectedDeal.regularPrice !== null &&
                  selectedDeal.regularPrice > selectedDeal.currentPrice
                    ? `Referencia anunciada por la tienda: ${money(selectedDeal.regularPrice)}`
                    : "Sin otro precio de referencia anunciado."}
                </p>
                <PriceEvidence deal={selectedDeal} />
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-section-heading">
                <h3>Precios del mismo modelo</h3>
                <span>
                  {knownModel(selectedDeal)
                    ? selectedDeal.modelCode
                    : "Modelo no identificado"}
                </span>
              </div>
              <div className="comparison-table">
                {comparableOffers(selectedDeal).map((offer, index, all) => (
                  <div
                    key={offer.store}
                    className={
                      index === 0 && all.length > 1
                        ? "comparison-row lowest"
                        : "comparison-row"
                    }
                  >
                    <div>
                      <strong>{storeLabel(offer.store)}</strong>
                      <span>
                        {offer.inStock === true
                          ? "Stock reportado por la fuente"
                          : "Confirma disponibilidad"}
                        {index === 0 && all.length > 1
                          ? " · Menor de esta comparación"
                          : ""}
                      </span>
                    </div>
                    <strong>{money(offer.price)}</strong>
                    {offer.productUrl && selectedDeal.dataSource !== "demo" ? (
                      <a
                        className="icon-button"
                        href={offer.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Ver en ${storeLabel(offer.store)}`}
                      >
                        <ArrowUpRight aria-hidden="true" />
                      </a>
                    ) : (
                      <span>
                        {selectedDeal.dataSource === "demo"
                          ? "Ejemplo"
                          : "Sin enlace"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {comparableOffers(selectedDeal).length < 2 && (
                <p className="detail-reference">
                  Aún no tenemos otra tienda con una coincidencia de modelo para
                  comparar.
                </p>
              )}
              <p className="detail-reference">
                Confirma la variante, el costo de envío y las condiciones en
                cada tienda.
              </p>
            </div>
            <PriceSparkline deal={selectedDeal} />
            <div className="detail-provenance">
              <CircleHelp aria-hidden="true" />
              <p>
                {selectedDeal.dataSource === "demo"
                  ? "Datos de demostración. No representan una oferta vigente."
                  : `Precio capturado de la tienda. ${dateLabel(selectedDeal.checkedAt ?? updatedAt)} (El Salvador).`}
                <br />
                La rebaja anunciada no es una verificación de ahorro histórico.
              </p>
            </div>
            <div className="detail-secondary">
              <button
                className="btn btn-secondary"
                onClick={() => save(selectedDeal)}
                aria-pressed={savedIds.includes(selectedDeal.id)}
              >
                <Heart
                  fill={
                    savedIds.includes(selectedDeal.id) ? "currentColor" : "none"
                  }
                  aria-hidden="true"
                />
                {savedIds.includes(selectedDeal.id) ? "Guardado" : "Guardar"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => void copyLink(selectedDeal)}
              >
                <Copy aria-hidden="true" />
                Copiar enlace
              </button>
              <a
                className="btn btn-secondary"
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${selectedDeal.dataSource === "demo" ? "Ejemplo de demostración" : "Precio publicado"}: ${selectedDeal.title} en ${storeLabel(selectedDeal.store)}: ${money(selectedDeal.currentPrice)}. Consulta los detalles: ${window.location.origin}/#deal-${encodeURIComponent(selectedDeal.id)}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden="true" />
                Compartir
              </a>
            </div>
          </div>
          <p
            className="detail-feedback"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {toast}
          </p>
          <div className="detail-footer">
            <div>
              <span>En {storeLabel(selectedDeal.store)}</span>
              <strong>{money(selectedDeal.currentPrice)}</strong>
            </div>
            {selectedDeal.inStock === false ? (
              <span>Agotado según la fuente</span>
            ) : selectedDeal.dataSource === "demo" ? (
              <span>Ejemplo, no disponible para compra</span>
            ) : (
              <a
                className="btn btn-primary"
                href={selectedDeal.productUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver en la tienda
                <ArrowUpRight aria-hidden="true" />
              </a>
            )}
          </div>
        </Dialog>
      )}
      {missingDeal && (
        <Dialog onClose={closeOverlay} labelledBy="missing-deal-title">
          <div className="empty-state">
            <h2 id="missing-deal-title">
              Este producto ya no está en el catálogo.
            </h2>
            <p>Puedes buscar su modelo para encontrar otras opciones.</p>
            <button className="btn btn-primary" onClick={closeOverlay}>
              Volver al catálogo
            </button>
          </div>
        </Dialog>
      )}
      <LegalModals
        type={legal}
        onClose={closeOverlay}
        onSelectTab={openLegal}
      />
      <Toast
        message={selectedDeal ? null : toast}
        onClose={() => setToast(null)}
      />
    </>
  );
}
