import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  Check,
  Camera,
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
  Tag,
  Tv,
  Trash2,
  Shirt,
  X,
  Zap,
} from "lucide-react";
import {
  comparableOffers,
  discountPercent,
  isGreenDeal,
  loadCatalog,
  money,
  storeLabel,
} from "./lib/deals";
import { priceEvidence } from "./lib/priceHistory";
import type { DataSource, DealItem } from "./lib/deals";
import { Dialog } from "./components/Dialog";
import { LegalModals } from "./components/LegalModals";
import type { LegalModalType } from "./components/LegalModals";
import { NotFoundPage } from "./components/NotFoundPage";
import { PriceSparkline } from "./components/PriceSparkline";
import { SkeletonCard } from "./components/SkeletonCard";
import { Toast } from "./components/Toast";
import {
  PersonalRadarModal,
  loadRadarPreferences,
  saveRadarPreferences,
  matchesRadar,
  type RadarPreferences,
} from "./components/PersonalRadar";
import { RedirectTransitionModal } from "./components/RedirectTransitionModal";
import { CatalogHealth, CaptureStatus } from "./components/CatalogHealth";
import { SubscriptionModal } from "./components/SubscriptionModal";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { BlackFridayLeadModal } from "./components/BlackFridayLeadModal";
import { OfferSignals, SignalBadge } from "./components/OfferSignals";
import { offerSignal, compareSignals, SIGNALS, type OfferSignal, type SignalLevel } from "./lib/offerSignal";

export type { DealItem } from "./lib/deals";

const CATEGORIES = [
  { id: "all", label: "Todo el catálogo", icon: LayoutGrid },
  { id: "tv_audio", label: "TV y audio", icon: Tv },
  { id: "smartphones", label: "Celulares", icon: Smartphone },
  { id: "computacion", label: "Computación", icon: Laptop },
  { id: "linea_blanca", label: "Electrodomésticos", icon: Refrigerator },
  { id: "gaming", label: "Videojuegos", icon: Gamepad2 },
  { id: "moda_calzado", label: "Moda y calzado", icon: Shirt },
  { id: "fotografia", label: "Fotografía", icon: Camera },
];
const STORES = ["Siman", "Walmart", "La Curacao", "Prado", "Omnisport", "RadioShack", "RAF", "Prisma Moda"];
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
    .replace(/[\u201C\u201D\u2033\u201E\u201F\u2036]/g, '"')
    .replace(/[\u2018\u2019\u2032\u00B4]/g, "'")
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

export function DealBadge({
  deal,
  mode = "simple",
}: {
  deal: DealItem;
  mode?: "simple" | "detailed";
}) {
  const discount = discountPercent(deal);
  const evidence = priceEvidence(deal);
  const offers = comparableOffers(deal);
  const others = offers.filter((o) => !o.isCurrent);
  const cheaper = others.length > 0 && others[0].price < deal.currentPrice;

  // 1. En Modo Detallado: advertencia de otra tienda más barata
  if (mode === "detailed" && cheaper) {
    return (
      <span className="deal-verdict-badge verdict-orange verdict-cheaper-elsewhere">
        <Store size={12} strokeWidth={2.5} aria-hidden="true" />
        Más barato en {storeLabel(others[0].store)}
      </span>
    );
  }

  // 2. En Modo Detallado: alerta de precio aumentado
  if (mode === "detailed" && evidence.trend === "higher") {
    return (
      <span className="deal-verdict-badge verdict-red verdict-price-up">
        <ArrowUpRight size={12} strokeWidth={2.5} aria-hidden="true" />
        Precio aumentado
      </span>
    );
  }

  // 3. En ambos modos: Verde (rebaja comprobada o mínimo histórico)
  if (evidence.isObservedLow || evidence.trend === "good_discount") {
    if (mode === "simple" && (cheaper || evidence.trend === "higher")) {
      return null;
    }
    return (
      <span className="deal-verdict-badge verdict-green verdict-historic-low">
        <Check size={12} strokeWidth={2.5} aria-hidden="true" />
        Con descuento
      </span>
    );
  }

  // 4. En ambos modos: Amarillo (descuento anunciado por la tienda)
  if (discount !== null && discount > 0) {
    if (mode === "simple" && (cheaper || evidence.trend === "higher")) {
      return null;
    }
    return (
      <span className="deal-verdict-badge verdict-yellow verdict-advertised">
        <Tag size={12} strokeWidth={2.5} aria-hidden="true" />
        −{discount}% anunciado
      </span>
    );
  }

  return null;
}

export function DealCard({
  deal,
  saved,
  onSave,
  onOpen,
  mode = "simple",
  signal,
}: {
  deal: DealItem;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  mode?: "simple" | "detailed";
  signal?: OfferSignal;
}) {

  return (
    <article className={`deal-card deal-card-${mode}`}>
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
        <DealBadge deal={deal} mode={mode} />
      </div>
      <div className="product-content">
        {mode === 'detailed' && signal && <SignalBadge signal={signal} />}
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
        {mode === "detailed" && (
          <>
            <PriceSparkline deal={deal} compact />
            {deal.dataSource !== "demo" && <CaptureStatus item={deal} />}
          </>
        )}
        <PriceEvidence deal={deal} />
        <button className="card-action" onClick={onOpen}>
          {mode === "simple" ? "Ver oferta" : "Ver precio y detalles"}
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
  const [evaluationTime, setEvaluationTime] = useState(Date.now);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [stores, setStores] = useState<string[]>([]);
  const [budget, setBudget] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  type FilterType = "all" | "discounted" | "percent_discount" | "compare" | "saved" | "radar";
  const [filter, setFilter] = useState<FilterType>("all");
  const [signalFilter, setSignalFilter] = useState<SignalLevel | 'all'>('all');
  const [sort, setSort] = useState("compare");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [savedIds, setSavedIds] = useState(readSaved);
  const [radarPrefs, setRadarPrefs] = useState<RadarPreferences>(loadRadarPreferences);
  const [radarOpen, setRadarOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionProduct, setSubscriptionProduct] = useState<DealItem | null>(null);
  const [redirectDeal, setRedirectDeal] = useState<{ deal: DealItem; url: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealItem | null>(null);
  const [legal, setLegal] = useState<LegalModalType>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [missingDeal, setMissingDeal] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [confirmClearSaved, setConfirmClearSaved] = useState(false);
  const [viewMode, setViewMode] = useState<"simple" | "detailed">(() => {
    if (typeof window === "undefined") return "simple";
    try {
      const saved = localStorage.getItem("bfsv_view_mode");
      if (saved === "simple" || saved === "detailed") return saved;
    } catch {
      /* ignore */
    }
    return window.innerWidth < 768 ? "simple" : "detailed";
  });
  const handleViewModeChange = (nextMode: "simple" | "detailed") => {
    setViewMode(nextMode);
    try {
      localStorage.setItem("bfsv_view_mode", nextMode);
    } catch {
      /* ignore */
    }
  };

  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setEvaluationTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

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
      if (["terminos", "metodologia", "privacidad", "cookies"].includes(hash)) {
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
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("storage", onStorage);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if ("serviceWorker" in navigator && !import.meta.env.DEV) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("blackfridaysv_lead_popup_dismissed");
      if (!dismissed) {
        const timer = setTimeout(() => {
          if (!selectedDeal && !legal && !subscriptionOpen && !radarOpen && !redirectDeal) {
            setLeadModalOpen(true);
          }
        }, 8000);
        return () => clearTimeout(timer);
      }
    } catch {
      /* ignore */
    }
  }, [selectedDeal, legal, subscriptionOpen, radarOpen, redirectDeal]);

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
  const clearAllSaved = () => {
    setSavedIds([]);
    try {
      localStorage.removeItem("blackfridaysv_saved_deals");
    } catch {
      /* ignore */
    }
    setConfirmClearSaved(false);
    notify("Todos los productos guardados fueron eliminados");
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
  const openStoreUrl = (deal: DealItem, url: string) => {
    try {
      if (sessionStorage.getItem("bfsv_skip_redirect_screen") === "true") {
        const win = window.open(url, "_blank", "noopener,noreferrer");
        if (win) return;
      }
    } catch {
      /* ignore */
    }
    setRedirectDeal({ deal, url });
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
  const toggleCategory = (id: string) =>
    change(() => {
      if (id === "all") {
        setCategory("all");
        setSignalFilter('all');
        if (filter !== "all") {
          setFilter("all");
          if (sort === "recent") setSort("compare");
        }
      } else {
        if (filter === "saved" && savedCount === 0) {
          setFilter("all");
          if (sort === "recent") setSort("compare");
        }
        setCategory((previous) => (previous === id ? "all" : id));
      }
    });
  const toggleFilter = (id: FilterType) =>
    change(() => {
      const nextFilter = filter === id ? "all" : id;
      setFilter(nextFilter);
      if (nextFilter === "saved") {
        setSort("recent");
      } else if (nextFilter === "percent_discount") {
        setSort("discount");
      } else if (sort === "recent" || sort === "discount") {
        setSort("compare");
      }
    });
  const toggleSaved = () => {
    if (filter === "saved") {
      change(() => {
        setFilter("all");
        if (sort === "recent") setSort("compare");
      });
    } else {
      change(() => {
        setFilter("saved");
        setSort("recent");
      });
      scrollToResults();
    }
  };
  const reset = () => {
    setSearch("");
    setCategory("all");
    setStores([]);
    setBudget("all");
    setAvailableOnly(false);
    setFilter("all");
    setSignalFilter('all');
    setSort("opportunities");
    setPage(1);
  };
  const updateRadar = (updater: (prev: RadarPreferences) => RadarPreferences) => {
    setRadarPrefs((prev) => {
      const next = updater(prev);
      saveRadarPreferences(next);
      return next;
    });
  };
  const removeRadarCategory = (catId: string) => {
    change(() => {
      updateRadar((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c !== catId),
      }));
    });
  };
  const removeRadarBudget = () => {
    change(() => {
      updateRadar((prev) => ({
        ...prev,
        maxBudget: null,
      }));
    });
  };
  const resetRadarRigor = () => {
    change(() => {
      updateRadar((prev) => ({
        ...prev,
        minRigor: "all",
      }));
    });
  };
  const removeRadarStore = (store: string) => {
    change(() => {
      updateRadar((prev) => ({
        ...prev,
        stores: prev.stores.filter((s) => s !== store),
      }));
    });
  };
  const categoryDeals = useMemo(
    () =>
      deals.filter((deal) => category === "all" || deal.category === category),
    [deals, category],
  );
  const radarCount = useMemo(
    () => deals.filter((deal) => matchesRadar(deal, { ...radarPrefs, enabled: true }, evaluationTime)).length,
    [deals, radarPrefs, evaluationTime],
  );
  const signals = useMemo(() => new Map(deals.map(deal => [deal.id, offerSignal(deal, evaluationTime)])), [deals, evaluationTime]);
  const matchingDeals = useMemo(() => {
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
          (filter === "discounted" && isGreenDeal(deal)) ||
          (filter === "percent_discount" && (discountPercent(deal) ?? 0) > 0) ||
          (filter === "compare" && comparableOffers(deal).length > 1) ||
          (filter === "saved" && savedIds.includes(deal.id)) ||
          (filter === "radar" && matchesRadar(deal, radarPrefs, evaluationTime)))
      );
    });
    return result;
  }, [categoryDeals, search, stores, budget, availableOnly, filter, savedIds, radarPrefs, evaluationTime]);
  const signalCounts = useMemo(() => {
    const counts = { worth: 0, regular: 0, wait: 0, unknown: 0 };
    for (const deal of matchingDeals) counts[signals.get(deal.id)!.level]++;
    return counts;
  }, [matchingDeals, signals]);
  const filtered = useMemo(() => {
    const result = matchingDeals.filter(deal => signalFilter === 'all' || signals.get(deal.id)!.level === signalFilter);
    return result.sort((a, b) => {
      if (sort === 'opportunities') return compareSignals(signals.get(a.id)!, signals.get(b.id)!) || a.currentPrice - b.currentPrice;
      if (sort === "recent") {
        return savedIds.indexOf(b.id) - savedIds.indexOf(a.id);
      }
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
    matchingDeals, signals, signalFilter,
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
  const hasOtherFilters =
    activeCount > 0 || category !== "all" || filter !== "all" || signalFilter !== 'all';
  const hasFilters =
    hasOtherFilters ||
    Boolean(search.trim());

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
              onClick={(event) => {
                if (budget === item.id && item.id !== "all") {
                  event.preventDefault();
                  change(() => setBudget("all"));
                }
              }}
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
      {isOffline && (
        <div className="offline-banner" role="status">
          <span>
            Estás en modo sin conexión. Mostrando catálogo y guardados en memoria local.
          </span>
        </div>
      )}
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
            <a
              className={filter !== "saved" ? "nav-active" : ""}
              href="#catalogo"
              onClick={() => {
                if (filter === "saved") {
                  change(() => setFilter("all"));
                }
                scrollToResults();
              }}
            >
              Ofertas
            </a>
            <button type="button" className="nav-link-btn" onClick={() => openLegal("metodologia")}>Cómo comparamos</button>
          </nav>
          <div className="nav-actions">
            <div className="header-mode-toggle" role="radiogroup" aria-label="Modo de visualización">
              <button
                type="button"
                className={`header-mode-btn ${viewMode === "simple" ? "is-active" : ""}`}
                onClick={() => handleViewModeChange("simple")}
                aria-checked={viewMode === "simple"}
                role="radio"
                title="Modo Simple: navegación rápida y directa"
                aria-label="Modo Simple"
              >
                <Zap size={13} aria-hidden="true" />
                <span className="header-mode-text">Simple</span>
              </button>
              <button
                type="button"
                className={`header-mode-btn ${viewMode === "detailed" ? "is-active" : ""}`}
                onClick={() => handleViewModeChange("detailed")}
                aria-checked={viewMode === "detailed"}
                role="radio"
                title="Modo Detallado: con auditoría y análisis"
                aria-label="Modo Detallado"
              >
                <BarChart2 size={13} aria-hidden="true" />
                <span className="header-mode-text">Detallado</span>
              </button>
            </div>

            {(viewMode === "detailed" || radarPrefs.enabled) && (
              <button
                className={`nav-radar-btn ${radarPrefs.enabled ? "is-active" : ""}`}
                onClick={() => setRadarOpen(true)}
                aria-label={radarPrefs.enabled ? "Mi Presupuesto activo (clic para configurar)" : "Definir Mi Presupuesto"}
              >
                <Radar aria-hidden="true" />
                <span className="nav-radar-text">Mi Presupuesto</span>
                {radarPrefs.enabled && <span className="nav-radar-dot" aria-hidden="true" />}
              </button>
            )}
            <button
              className={`nav-saved ${filter === "saved" ? "selected" : ""}`}
              onClick={toggleSaved}
              aria-pressed={filter === "saved"}
              aria-label={`Ver guardados (${savedCount})`}
            >
              <Heart
                aria-hidden="true"
                fill={filter === "saved" ? "currentColor" : "none"}
              />
              <span className="nav-saved-text">Guardados</span>
              <span className="saved-count">{savedCount}</span>
            </button>
          </div>
        </header>
        <section className={`hero page-width ${viewMode === "simple" ? "hero-simple" : ""}`} aria-labelledby="hero-title">
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
                type="text"
                inputMode="search"
                value={search}
                onChange={(event) =>
                  change(() => setSearch(event.target.value))
                }
                placeholder="Buscar producto, marca o modelo (ej. Samsung, Laptop)..."
                aria-label="Buscar producto, marca o modelo"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              {search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    change(() => setSearch(""));
                    searchRef.current?.focus();
                  }}
                  aria-label="Limpiar búsqueda"
                >
                  <X aria-hidden="true" />
                </button>
              )}
              <button type="submit" aria-label="Buscar en el catálogo">
                <ArrowRight aria-hidden="true" />
              </button>
            </form>
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
            <div className="hero-radar-hint">
              <span>¿Compras con presupuesto fijo?</span>
              <button
                type="button"
                className={`hero-radar-pill-btn ${radarPrefs.enabled ? "is-active" : ""}`}
                onClick={() => {
                  if (radarPrefs.enabled) {
                    change(() => setFilter("radar"));
                    scrollToResults();
                  } else {
                    setRadarOpen(true);
                  }
                }}
              >
                <Radar aria-hidden="true" />
                <span>
                  {radarPrefs.enabled
                    ? `Mi Presupuesto activo (${radarCount} ofertas)`
                    : "Definir mi presupuesto"}
                </span>
              </button>
              <a
                className="hero-browse"
                href="#catalogo"
                onClick={() => {
                  if (filter === "saved" || filter === "radar") {
                    change(() => setFilter("all"));
                  }
                }}
              >
                Ver todas las ofertas <ArrowDown aria-hidden="true" />
              </a>
            </div>
          </div>
          {viewMode === "detailed" && (
            isLoading ? (
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
            )
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
            {viewMode === "detailed" && (
            <div className="catalog-source">
              <span className="source-dot" aria-hidden="true" />
              <span>
                {source === "demo"
                  ? "Catálogo de demostración"
                  : "Captura más antigua"}
                <small>
                  {source === "demo"
                    ? "Los ejemplos no son ofertas vigentes"
                    : dateLabel(updatedAt)}
                </small>
              </span>
            </div>
            )}
          </div>
          {viewMode === "detailed" && !isLoading && source !== "demo" && deals.length > 0 && (
            <CatalogHealth deals={deals} onReload={() => setReloadKey(key => key + 1)} />
          )}
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
            {CATEGORIES.filter(item => item.id !== 'fotografia' || deals.some(deal => deal.category === item.id)).map(({ id, label, icon: Icon }) => {
              const isSelected =
                filter === "saved"
                  ? category === id && id !== "all"
                  : category === id;
              return (
                <button
                  key={id}
                  aria-pressed={isSelected}
                  onClick={() => toggleCategory(id)}
                  className={isSelected ? "selected" : ""}
                >
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <OfferSignals selected={signalFilter} counts={signalCounts} loading={isLoading}
            onSelect={level => change(() => setSignalFilter(level))} />
          <div className="catalog-layout">
            <aside className="filter-sidebar" aria-label="Filtrar catálogo">
              {filterControls()}
            </aside>
            <div className="results-area">
              <div className="results-tabs" aria-label="Tipo de resultados">
                {(
                  (viewMode === "simple"
                    ? [
                        { id: "all", label: "Todos" },
                        { id: "discounted", label: "Con descuento" },
                        { id: "percent_discount", label: "% de descuento" },
                        { id: "saved", label: "Guardados" },
                        ...(radarPrefs.enabled ? [{ id: "radar", label: "🎯 Mi Presupuesto" }] : []),
                      ]
                    : [
                        { id: "all", label: "Todos" },
                        { id: "discounted", label: "Con descuento" },
                        { id: "percent_discount", label: "% de descuento" },
                        { id: "compare", label: "En varias tiendas" },
                        { id: "saved", label: "Guardados" },
                        { id: "radar", label: "🎯 Mi Presupuesto" },
                      ]) as Array<{ id: FilterType; label: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === "radar" && !radarPrefs.enabled) {
                        setRadarOpen(true);
                        return;
                      }
                      toggleFilter(item.id);
                    }}
                    aria-pressed={filter === item.id}
                    className={filter === item.id ? "selected" : ""}
                  >
                    {item.label}
                    {item.id === "radar" && radarPrefs.enabled && (
                      <span>{radarCount}</span>
                    )}
                    {item.id === "saved" && <span>{savedCount}</span>}
                  </button>
                ))}
              </div>
              {filter === "radar" && (
                <div className="radar-status-banner" role="region" aria-label="Estado del Radar Personal">
                  <div className="radar-status-info">
                    <div className="radar-status-badge">
                      <Radar aria-hidden="true" />
                      <span>Mi Presupuesto Activo</span>
                    </div>
                    <p>
                      Monitoreando <strong>{deals.length} productos</strong> en{" "}
                      <strong>{storeCount} tiendas</strong>.
                      {filtered.length > 0
                        ? ` Encontramos ${filtered.length} ${filtered.length === 1 ? "oferta que coincide" : "ofertas que coinciden"} con tus criterios.`
                        : " Aún no hay ofertas que cumplan con todos tus criterios seleccionados."}
                    </p>
                    <div className="radar-active-criteria" aria-label="Criterios del radar configurados">
                      {radarPrefs.categories.map((c) => {
                        const label = CATEGORIES.find((item) => item.id === c)?.label ?? c;
                        return (
                          <button
                            key={c}
                            type="button"
                            className="radar-criteria-tag"
                            onClick={() => removeRadarCategory(c)}
                            aria-label={`Quitar categoría ${label} del Radar`}
                          >
                            <span>{label}</span>
                            <X aria-hidden="true" />
                          </button>
                        );
                      })}
                      {radarPrefs.maxBudget !== null && (
                        <button
                          type="button"
                          className="radar-criteria-tag"
                          onClick={removeRadarBudget}
                          aria-label="Quitar límite de presupuesto del Radar"
                        >
                          <span>Presupuesto máx: {money(radarPrefs.maxBudget)}</span>
                          <X aria-hidden="true" />
                        </button>
                      )}
                      {radarPrefs.minRigor !== "all" && (
                        <button
                          type="button"
                          className="radar-criteria-tag"
                          onClick={resetRadarRigor}
                          aria-label="Quitar filtro de precio del Radar"
                        >
                          <span>{radarPrefs.minRigor === "historic_low" ? "Mínimos del periodo" : "Rebajas anunciadas"}</span>
                          <X aria-hidden="true" />
                        </button>
                      )}
                      {radarPrefs.stores.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="radar-criteria-tag"
                          onClick={() => removeRadarStore(s)}
                          aria-label={`Quitar tienda ${s} del Radar`}
                        >
                          <span>Tienda: {s}</span>
                          <X aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="radar-status-actions">
                    <button
                      type="button"
                      className="btn btn-secondary radar-action-btn"
                      onClick={() => setRadarOpen(true)}
                    >
                      Ajustar preferencias
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => toggleFilter("radar")}
                    >
                      Ver catálogo general
                    </button>
                  </div>
                </div>
              )}
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
                                <div className="catalog-mode-toggle" role="radiogroup" aria-label="Modo de catálogo">
                  <button
                    type="button"
                    className={`mode-btn ${viewMode === "simple" ? "is-active" : ""}`}
                    onClick={() => handleViewModeChange("simple")}
                    aria-checked={viewMode === "simple"}
                    role="radio"
                    title="Modo Simple: tarjetas compactas y visuales"
                  >
                    <Zap size={13} aria-hidden="true" />
                    <span>Simple</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${viewMode === "detailed" ? "is-active" : ""}`}
                    onClick={() => handleViewModeChange("detailed")}
                    aria-checked={viewMode === "detailed"}
                    role="radio"
                    title="Modo Detallado: con historial y capturas"
                  >
                    <BarChart2 size={13} aria-hidden="true" />
                    <span>Detallado</span>
                  </button>
                </div>
                <label className="sort-control">
                  <span className="sort-label">Ordenar:</span>
                  <select
                    aria-label="Ordenar productos"
                    value={sort}
                    onChange={(event) =>
                      change(() => setSort(event.target.value))
                    }
                  >
                    <option value="opportunities">Semáforo: oportunidades primero</option>
                    {filter === "saved" ? (
                      <>
                        <option value="recent">Más recientes primero</option>
                        <option value="price_asc">Precio: de menor a mayor</option>
                        <option value="price_desc">Precio: de mayor a menor</option>
                        <option value="discount">Mayor porcentaje de descuento (%)</option>
                        <option value="savings">Mayor ahorro en dinero ($)</option>
                      </>
                    ) : (
                      <>
                        <option value="compare">Disponibles en varias tiendas</option>
                        <option value="price_asc">Precio: de menor a mayor</option>
                        <option value="price_desc">Precio: de mayor a menor</option>
                        <option value="discount">Mayor porcentaje de descuento (%)</option>
                        <option value="savings">Mayor ahorro en dinero ($)</option>
                      </>
                    )}
                  </select>
                  <ChevronDown aria-hidden="true" />
                </label>
                <div className="view-switch">
                  <button
                    className="icon-button"
                    onClick={() =>
                      change(() => {
                        setView("grid");
                        setPageSize((prev) => (prev === 24 ? 12 : prev));
                      })
                    }
                    aria-label="Vista de tarjetas"
                    aria-pressed={view === "grid"}
                  >
                    <LayoutGrid aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() =>
                      change(() => {
                        setView("list");
                        setPageSize((prev) => (prev === 12 ? 24 : prev));
                      })
                    }
                    aria-label="Vista de lista"
                    aria-pressed={view === "list"}
                  >
                    <List aria-hidden="true" />
                  </button>
                </div>
              </div>
              {hasFilters && (
                <div className="active-filters" aria-label="Filtros aplicados">
                  {signalFilter !== 'all' && <button onClick={() => change(() => setSignalFilter('all'))}>
                    {SIGNALS.find(signal => signal.id === signalFilter)?.label}<X aria-label="Quitar filtro del semáforo" />
                  </button>}
                  {filter === "radar" && (
                    <button onClick={() => change(() => setFilter("all"))}>
                      🎯 Mi Radar activo ({filtered.length})
                      <X aria-label="Quitar filtro de Radar" />
                    </button>
                  )}
                  {filter === "radar" &&
                    radarPrefs.categories.map((c) => {
                      const label = CATEGORIES.find((item) => item.id === c)?.label ?? c;
                      return (
                        <button key={`radar-cat-${c}`} onClick={() => removeRadarCategory(c)}>
                          Radar categoría: {label}
                          <X aria-label={`Quitar categoría ${label} del Radar`} />
                        </button>
                      );
                    })}
                  {filter === "radar" && radarPrefs.maxBudget !== null && (
                    <button onClick={removeRadarBudget}>
                      Radar presupuesto: ≤ {money(radarPrefs.maxBudget)}
                      <X aria-label="Quitar presupuesto del Radar" />
                    </button>
                  )}
                  {filter === "radar" && radarPrefs.minRigor !== "all" && (
                    <button onClick={resetRadarRigor}>
                      Radar: {radarPrefs.minRigor === "historic_low" ? "Mínimos del periodo" : "Rebajas anunciadas"}
                      <X aria-label="Quitar filtro de precio del Radar" />
                    </button>
                  )}
                  {filter === "radar" &&
                    radarPrefs.stores.map((s) => (
                      <button key={`radar-store-${s}`} onClick={() => removeRadarStore(s)}>
                        Radar tienda: {s}
                        <X aria-label={`Quitar tienda ${s} del Radar`} />
                      </button>
                    ))}
                  {filter === "discounted" && (
                    <button onClick={() => change(() => setFilter("all"))}>
                      Con descuento
                      <X aria-label="Quitar filtro de descuento" />
                    </button>
                  )}
                  {filter === "percent_discount" && (
                    <button onClick={() => change(() => setFilter("all"))}>
                      % de descuento
                      <X aria-label="Quitar filtro de porcentaje" />
                    </button>
                  )}
                  {filter === "compare" && (
                    <button onClick={() => change(() => setFilter("all"))}>
                      En varias tiendas
                      <X aria-label="Quitar filtro de comparables" />
                    </button>
                  )}
                  {filter === "saved" && (
                    <button onClick={() => change(() => setFilter("all"))}>
                      Guardados ({savedCount})
                      <X aria-label="Quitar filtro de guardados" />
                    </button>
                  )}
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
                  {filter === "saved" && savedCount > 0 && (
                    <button
                      className="clear-saved-action"
                      onClick={() => setConfirmClearSaved(true)}
                    >
                      <Trash2 aria-hidden="true" />
                      Vaciar guardados
                    </button>
                  )}
                  {hasOtherFilters || Boolean(search.trim()) ? (
                    <button className="clear-all" onClick={reset}>
                      Limpiar filtros
                    </button>
                  ) : null}
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
                      signal={signals.get(deal.id)!}
                      saved={savedIds.includes(deal.id)}
                      onSave={() => save(deal)}
                      onOpen={() => openDeal(deal)}
                      mode={viewMode}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  {filter === "saved" ? (
                    <Heart aria-hidden="true" />
                  ) : filter === "radar" ? (
                    <Radar aria-hidden="true" />
                  ) : category === "moda_calzado" ? (
                    <Shirt aria-hidden="true" />
                  ) : (
                    <Search aria-hidden="true" />
                  )}
                  {signalFilter !== 'all' && matchingDeals.length > 0 ? (
                    <>
                      <h3>No hay ofertas con esta señal y estos filtros</h3>
                      <p>Los productos nuevos pueden aparecer como “Por verificar” hasta reunir suficientes capturas. No usamos el descuento anunciado para asignarles una señal verde.</p>
                      <button className="btn btn-primary" onClick={() => change(() => setSignalFilter('all'))}>
                        Ver las {matchingDeals.length} ofertas sin semáforo
                      </button>
                    </>
                  ) : filter === "saved" ? (
                    savedCount > 0 ? (
                      search.trim() ? (
                        <>
                          <h3>No encontramos guardados para “{search.trim()}”</h3>
                          <p>
                            Tienes {savedCount}{" "}
                            {savedCount === 1
                              ? "producto guardado"
                              : "productos guardados"}
                            , pero ninguno coincide con este término de búsqueda.
                          </p>
                          <div className="empty-state-actions">
                            <button
                              className="btn btn-primary"
                              onClick={() => change(() => setSearch(""))}
                            >
                              Ver mis guardados ({savedCount})
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => change(() => setFilter("all"))}
                            >
                              Buscar “{search.trim()}” en todo el catálogo
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3>Ninguno de tus guardados coincide con los filtros</h3>
                          <p>
                            Tienes {savedCount}{" "}
                            {savedCount === 1
                              ? "producto guardado"
                              : "productos guardados"}
                            , pero están ocultos por los filtros seleccionados.
                          </p>
                          <div className="empty-state-actions">
                            <button
                              className="btn btn-primary"
                              onClick={() =>
                                change(() => {
                                  setCategory("all");
                                  setStores([]);
                                  setBudget("all");
                                  setAvailableOnly(false);
                                  setSignalFilter('all');
                                })
                              }
                            >
                              Quitar filtros y ver mis guardados ({savedCount})
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() =>
                                change(() => {
                                  setFilter("all");
                                  setCategory("all");
                                })
                              }
                            >
                              Ver todo el catálogo
                            </button>
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <h3>Aún no tienes productos guardados</h3>
                        <p>
                          Toca el corazón en cualquier oferta para tenerla a mano y
                          compararla cuando quieras.
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            change(() => {
                              setFilter("all");
                              setCategory("all");
                            })
                          }
                        >
                          Explorar ofertas
                        </button>
                      </>
                    )
                  ) : filter === "radar" ? (
                    (search.trim() || activeCount > 0 || category !== "all") ? (
                      <>
                        <h3>No encontramos ofertas en tu Radar con estos filtros</h3>
                        <p>
                          Tienes {radarCount} {radarCount === 1 ? "oferta monitoreada" : "ofertas monitoreadas"} en tu Radar, pero los filtros adicionales aplicados (búsqueda, categoría o tienda) ocultan los resultados.
                        </p>
                        <div className="empty-state-actions">
                          <button
                            className="btn btn-primary"
                            onClick={() =>
                              change(() => {
                                setSearch("");
                                setCategory("all");
                                setStores([]);
                                setBudget("all");
                                setAvailableOnly(false);
                                setSignalFilter('all');
                              })
                            }
                          >
                            Quitar filtros adicionales y ver mi Radar ({radarCount})
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setRadarOpen(true)}
                          >
                            Ajustar mi presupuesto
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => change(() => setFilter("all"))}
                          >
                            Ver catálogo general
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3>Ninguna oferta coincide con tu Radar Personal</h3>
                        <p>
                          Ninguno de los {deals.length} productos cumple ahora con tus categorías, presupuesto{radarPrefs.maxBudget ? ` (hasta ${money(radarPrefs.maxBudget)})` : ""} y filtro de precio ({radarPrefs.minRigor === "historic_low" ? "mínimos del periodo con captura reciente e historial suficiente" : radarPrefs.minRigor === "discount_only" ? "rebajas anunciadas" : "todas las opciones"}).
                        </p>
                        <div className="empty-state-actions">
                          <button
                            className="btn btn-primary"
                            onClick={() => setRadarOpen(true)}
                          >
                            Ajustar criterios del Radar
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => change(() => setFilter("all"))}
                          >
                            Ver catálogo general
                          </button>
                        </div>
                      </>
                    )
                  ) : category === "moda_calzado" && categoryDeals.length === 0 ? (
                    <>
                      <h3>Sección de Moda y Calzado en actualización</h3>
                      <p>
                        No hay precios de moda y calzado disponibles en esta copia del catálogo. Las fuentes configuradas son Siman, Walmart y Prisma Moda.
                      </p>
                      <button className="btn btn-primary" onClick={reset}>
                        Explorar otras categorías
                      </button>
                    </>
                  ) : category === "moda_calzado" && search.trim() === "" && activeCount > 0 ? (
                    <>
                      <h3>No encontramos ofertas de Moda y Calzado con estos filtros</h3>
                      <p>
                        Consulta moda y calzado de Siman, Walmart y Prisma Moda. Prueba ampliar el presupuesto o quitar tiendas para ver más opciones.
                      </p>
                      <div className="empty-state-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            change(() => {
                              setBudget("all");
                              setStores([]);
                              setSearch("");
                              setAvailableOnly(false);
                              setSignalFilter('all');
                            })
                          }
                        >
                          Ver toda la sección de Moda y Calzado
                        </button>
                        <button className="btn btn-secondary" onClick={reset}>
                          Ver todo el catálogo general
                        </button>
                      </div>
                    </>
                  ) : search.trim() ? (
                    <>
                      <h3>No encontramos resultados para “{search.trim()}”</h3>
                      <p>
                        {hasOtherFilters
                          ? "Prueba otra palabra o quita los filtros de categoría y tienda."
                          : "Revisa la ortografía o prueba con un término más general (como marca o modelo)."}
                      </p>
                      <div className="empty-state-actions">
                        {hasOtherFilters && (
                          <button
                            className="btn btn-primary"
                            onClick={() =>
                              change(() => {
                                setCategory("all");
                                setStores([]);
                                setBudget("all");
                                setAvailableOnly(false);
                                setSignalFilter('all');
                              })
                            }
                          >
                            Buscar “{search.trim()}” en todo el catálogo
                          </button>
                        )}
                        <button
                          className={
                            hasOtherFilters
                              ? "btn btn-secondary"
                              : "btn btn-primary"
                          }
                          onClick={reset}
                        >
                          Ver todo el catálogo
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>No encontramos ofertas con esos filtros</h3>
                      <p>
                        Prueba quitar algunos filtros de tienda o presupuesto para
                        ver más productos.
                      </p>
                      <button className="btn btn-primary" onClick={reset}>
                        Ver todo el catálogo
                      </button>
                    </>
                  )}
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
        {viewMode === "detailed" && (
          <>
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
        <section className="subscription-invitation page-width" aria-labelledby="subscription-title">
          <div><h2 id="subscription-title">Las bajadas que te interesan, en tu correo.</h2><p>Elige categorías y presupuesto. Un resumen al día como máximo, sólo cuando haya coincidencias.</p></div>
          <button className="btn btn-primary" onClick={() => { setSubscriptionProduct(null); setSubscriptionOpen(true); }}>Elegir mis avisos</button>
        </section>
          </>
        )}
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
          <button onClick={() => openLegal("metodologia")}>Cómo comparamos</button>
          <button onClick={() => openLegal("privacidad")}>Privacidad</button>
          <button onClick={() => openLegal("cookies")}>Cookies y Publicidad</button>
          <button onClick={() => setLeadModalOpen(true)}>Alertas de Ofertas</button>
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
      {confirmClearSaved && (
        <Dialog
          onClose={() => setConfirmClearSaved(false)}
          labelledBy="clear-saved-title"
          className="confirm-modal"
        >
          <div className="modal-header">
            <span>Confirmar acción</span>
            <button
              className="icon-button"
              onClick={() => setConfirmClearSaved(false)}
              aria-label="Cerrar confirmación"
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="modal-body confirm-body">
            <h2 id="clear-saved-title">
              ¿Eliminar todos tus productos guardados?
            </h2>
            <p>
              Tienes {savedCount}{" "}
              {savedCount === 1 ? "producto guardado" : "productos guardados"}. Si
              los eliminas, tu lista quedará vacía y tendrás que volver a
              buscarlos y guardarlos uno por uno.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmClearSaved(false)}
              >
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={clearAllSaved}>
                Sí, eliminar todos ({savedCount})
              </button>
            </div>
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
                <SignalBadge signal={signals.get(selectedDeal.id) ?? offerSignal(selectedDeal, evaluationTime)} explain />
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
                      <CaptureStatus item={offer} />
                    </div>
                    <strong>{money(offer.price)}</strong>
                    {offer.productUrl && selectedDeal.dataSource !== "demo" ? (
                      <a
                        className="icon-button"
                        href={offer.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.preventDefault();
                          openStoreUrl(selectedDeal, offer.productUrl!);
                        }}
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
                <p className="detail-reference">Aún no tenemos otro precio del mismo modelo para comparar. No contamos con una referencia regional verificada.</p>
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
                  : `Precio capturado de la tienda. ${dateLabel(selectedDeal.checkedAt)} (El Salvador).`}
                <br />
                La rebaja anunciada no es una verificación de ahorro histórico.
              </p>
            </div>
            <div className="detail-secondary">
              {selectedDeal.dataSource !== "demo" && <button className="btn btn-primary" onClick={() => { setSubscriptionProduct(selectedDeal); setSubscriptionOpen(true); }}>Avisarme de una bajada</button>}
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
                onClick={(e) => {
                  e.preventDefault();
                  openStoreUrl(selectedDeal, selectedDeal.productUrl);
                }}
              >
                Ver en la tienda
                <ArrowUpRight aria-hidden="true" />
              </a>
            )}
          </div>
        </Dialog>
      )}
      {radarOpen && (
        <PersonalRadarModal
          isOpen={radarOpen}
          onClose={() => setRadarOpen(false)}
          preferences={radarPrefs}
          onSave={(prefs) => {
            setRadarPrefs(prefs);
            if (prefs.enabled) {
              setFilter("radar");
              scrollToResults();
            } else if (filter === "radar") {
              setFilter("all");
            }
          }}
          availableStores={STORES}
          totalCatalogCount={deals.length}
          matchingCount={radarCount}
          deals={deals}
        />
      )}
      {redirectDeal && (
        <RedirectTransitionModal
          deal={redirectDeal.deal}
          targetUrl={redirectDeal.url}
          onClose={() => setRedirectDeal(null)}
        />
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
      <BlackFridayLeadModal
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        onOpenCookies={() => {
          setLeadModalOpen(false);
          openLegal("cookies");
        }}
      />
      <CookieConsentBanner
        onOpenCookies={() => openLegal("cookies")}
      />
      {subscriptionOpen && <SubscriptionModal product={subscriptionProduct} onClose={() => setSubscriptionOpen(false)} />}
      <Toast
        message={selectedDeal ? null : toast}
        onClose={() => setToast(null)}
      />
    </>
  );
}
