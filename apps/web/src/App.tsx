import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ExternalLink, 
  Store, 
  Flame, 
  Info, 
  Database, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Tag, 
  ArrowRight,
  Trophy,
  ShoppingBag,
  Eye,
  ArrowUpDown,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Scale,
  Lock,
  Copy,
  RotateCcw,
  MessageCircle,
  Tv,
  Heart,
  DollarSign
} from 'lucide-react';
import { fetchLiveDeals } from './lib/supabase.ts';
import { LegalModals, LegalModalType } from './components/LegalModals.tsx';
import { SkeletonCard } from './components/SkeletonCard.tsx';
import { NotFoundPage } from './components/NotFoundPage.tsx';
import { Toast } from './components/Toast.tsx';
import { PriceSparkline } from './components/PriceSparkline.tsx';

export interface DealItem {
  id: string;
  store: string;
  storeLogo?: string;
  brand: string;
  modelCode: string;
  title: string;
  category: string;
  currentPrice: number;
  regularPrice: number | null;
  baselinePrice30d: number;
  dealScore: 'ganga_historica' | 'buena_oferta' | 'falsa_oferta_inflada' | 'descuento_cosmetico';
  verdictMessage: string;
  productUrl: string;
  imageUrl?: string | null;
  inStock: boolean;
  competitors?: Array<{ store: string; price: number; productUrl?: string; inStock?: boolean }>;
}

const MOCK_DEALS: DealItem[] = [
  {
    id: '1',
    store: 'Almacenes Siman',
    brand: 'LG',
    modelCode: '55UR7800PSB',
    title: 'Pantalla Smart TV LG 55" UHD 4K ThinQ AI 55UR7800PSB',
    category: 'tv_audio',
    currentPrice: 429.00,
    regularPrice: 799.00,
    baselinePrice30d: 469.00,
    dealScore: 'buena_oferta',
    verdictMessage: 'Descuento real de $40 vs. su precio habitual de octubre. El precio de lista ($799) está inflado, pero la rebaja de $40 es real.',
    productUrl: 'https://sv.siman.com',
    imageUrl: 'https://siman.vteximg.com.br/arquivos/ids/6372873/TecnoAvance-DHI-LTV55-SN400_medidasTV.jpg',
    inStock: true,
    competitors: [
      { store: 'Almacenes Prado', price: 449.00, productUrl: 'https://prado.com.sv', inStock: true },
      { store: 'La Curacao', price: 439.00, productUrl: 'https://lacuracaonline.com/elsalvador/', inStock: true },
    ]
  },
  {
    id: '2',
    store: 'La Curacao',
    brand: 'Samsung',
    modelCode: 'UN65CU7000',
    title: 'Smart TV Samsung 65" Crystal UHD 4K UN65CU7000',
    category: 'tv_audio',
    currentPrice: 689.00,
    regularPrice: 949.00,
    baselinePrice30d: 599.00,
    dealScore: 'falsa_oferta_inflada',
    verdictMessage: '¡CUIDADO! El precio subió $90 respecto a octubre. A pesar de anunciar una supuesta rebaja, hoy cuesta más que su precio normal.',
    productUrl: 'https://lacuracaonline.com/elsalvador/',
    imageUrl: 'https://siman.vteximg.com.br/arquivos/ids/8267490/65.jpg',
    inStock: true,
    competitors: [
      { store: 'Walmart El Salvador', price: 599.00, productUrl: 'https://walmart.com.sv', inStock: true },
      { store: 'Almacenes Siman', price: 629.00, productUrl: 'https://sv.siman.com', inStock: true },
    ]
  },
  {
    id: '3',
    store: 'Walmart El Salvador',
    brand: 'Apple',
    modelCode: 'IPHONE 15 PRO 128GB',
    title: 'Apple iPhone 15 Pro 128GB Titanio Natural',
    category: 'smartphones',
    currentPrice: 899.00,
    regularPrice: 1099.00,
    baselinePrice30d: 999.00,
    dealScore: 'ganga_historica',
    verdictMessage: '¡PRECIO MÁS BAJO DEL AÑO! Ahorras $100 frente a su costo normal en El Salvador. Rebaja 100% verificada.',
    productUrl: 'https://www.walmart.com.sv',
    imageUrl: 'https://buketomnisportpweb.s3.us-east-2.amazonaws.com/products-thumbs/cVpFXNn7x5cQzmVP8Yr7InYTBG68ysVBJuv90QEG.jpeg',
    inStock: true,
    competitors: [
      { store: 'Almacenes Siman', price: 999.00, productUrl: 'https://sv.siman.com', inStock: true },
      { store: 'Almacenes Prado', price: 1049.00, productUrl: 'https://prado.com.sv', inStock: true },
    ]
  },
  {
    id: '4',
    store: 'Almacenes Prado',
    brand: 'Mabe',
    modelCode: 'RMA1130YMEB',
    title: 'Refrigeradora Mabe 11 Pies Cúbicos No Frost Grafito',
    category: 'linea_blanca',
    currentPrice: 479.00,
    regularPrice: 599.00,
    baselinePrice30d: 485.00,
    dealScore: 'descuento_cosmetico',
    verdictMessage: 'Mismo precio de todo el año. Su costo habitual ha sido de $485. Solo hay $6 de diferencia.',
    productUrl: 'https://prado.com.sv',
    inStock: false, // Simulación de agotado para pruebas visuales
    competitors: [
      { store: 'La Curacao', price: 479.00, productUrl: 'https://lacuracaonline.com/elsalvador/', inStock: true },
      { store: 'Omnisport', price: 489.00, productUrl: 'https://omnisport.com', inStock: true },
    ]
  },
  {
    id: '5',
    store: 'Omnisport',
    brand: 'Samsung',
    modelCode: 'UN32H5000',
    title: 'Smart TV Samsung 32" LED HD UN32H5000',
    category: 'tv_audio',
    currentPrice: 169.00,
    regularPrice: 255.00,
    baselinePrice30d: 199.00,
    dealScore: 'buena_oferta',
    verdictMessage: 'Buen ahorro de $30 frente al precio habitual de octubre.',
    productUrl: 'https://www.omnisport.com',
    inStock: true,
    competitors: [
      { store: 'Almacenes Prado', price: 159.00, productUrl: 'https://prado.com.sv', inStock: true },
      { store: 'Walmart El Salvador', price: 163.35, productUrl: 'https://walmart.com.sv', inStock: true },
      { store: 'Almacenes Siman', price: 219.00, productUrl: 'https://sv.siman.com', inStock: true },
    ]
  }
];

function normalizeModelForMatching(model: string, brand: string): string {
  let m = model.toUpperCase().trim();
  if (brand.toUpperCase().includes('SAMSUNG')) {
    m = m.replace(/FPXPA$|FXZA$|\/AP$|PSA$/i, '');
  }
  return m;
}

function enrichDealsWithCrossStoreComparisons(rawDeals: DealItem[]): DealItem[] {
  const modelMap = new Map<string, DealItem[]>();

  for (const deal of rawDeals) {
    if (deal.modelCode && deal.modelCode !== 'N/A' && deal.modelCode.length > 2) {
      const key = `${deal.brand.toUpperCase()}_${normalizeModelForMatching(deal.modelCode, deal.brand)}`;
      const list = modelMap.get(key) || [];
      list.push(deal);
      modelMap.set(key, list);
    }
  }

  return rawDeals.map((deal) => {
    if (!deal.modelCode || deal.modelCode === 'N/A') {
      return deal;
    }

    const key = `${deal.brand.toUpperCase()}_${normalizeModelForMatching(deal.modelCode, deal.brand)}`;
    const group = modelMap.get(key);
    if (!group || group.length <= 1) {
      return deal;
    }

    const competitors = group
      .filter((other) => other.store !== deal.store)
      .map((other) => ({
        store: other.store,
        price: other.currentPrice,
        productUrl: other.productUrl,
        inStock: other.inStock,
      }))
      .sort((a, b) => a.price - b.price);

    if (competitors.length === 0) {
      return deal;
    }

    const cheapest = competitors[0];
    let extraVerdict = '';
    if (deal.currentPrice < cheapest.price) {
      const diff = (cheapest.price - deal.currentPrice).toFixed(2);
      extraVerdict = ` 🏆 ¡Mejor precio de El Salvador! Cuesta $${diff} menos que en ${cheapest.store}.`;
    } else if (deal.currentPrice > cheapest.price) {
      const diff = (deal.currentPrice - cheapest.price).toFixed(2);
      extraVerdict = ` 💡 En ${cheapest.store} está más barato por $${cheapest.price.toFixed(2)} (ahorras $${diff}).`;
    } else {
      extraVerdict = ` ⚖️ Mismo precio que en ${cheapest.store}.`;
    }

    return {
      ...deal,
      competitors,
      verdictMessage: `${deal.verdictMessage}${extraVerdict}`,
    };
  });
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 6) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

const STORE_CHIPS = [
  { id: 'all', label: 'Todos los almacenes' },
  { id: 'siman', label: 'Siman' },
  { id: 'walmart', label: 'Walmart' },
  { id: 'curacao', label: 'La Curacao' },
  { id: 'prado', label: 'Prado' },
  { id: 'omnisport', label: 'Omnisport' },
];

export type BudgetFilterType = 'all' | 'under_100' | '100_to_300' | '300_to_600' | 'above_600';

export const BUDGET_CHIPS: { id: BudgetFilterType; label: string; range: string }[] = [
  { id: 'all', label: 'Cualquier precio', range: 'Todo' },
  { id: 'under_100', label: '< $100', range: 'Económicos' },
  { id: '100_to_300', label: '$100 - $300', range: 'Gama media' },
  { id: '300_to_600', label: '$300 - $600', range: 'Smart TV / Hogar' },
  { id: 'above_600', label: '> $600', range: 'Premium / Tech' },
];

export const CATEGORY_CHIPS = [
  { id: 'all', label: 'Todas las categorías' },
  { id: 'tv_audio', label: '📺 Pantallas y Audio' },
  { id: 'smartphones', label: '📱 Celulares' },
  { id: 'computacion', label: '💻 Laptops y Computadoras' },
  { id: 'linea_blanca', label: '❄️ Línea Blanca' },
  { id: 'gaming', label: '🎮 Videojuegos' },
];

export default function App() {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUsingLiveDb, setIsUsingLiveDb] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScore, setFilterScore] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilterType>('all');
  const [savedDealIds, setSavedDealIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('blackfridaysv_saved_deals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [sortBy, setSortBy] = useState<string>('savings_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(16);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [activeModalDeal, setActiveModalDeal] = useState<DealItem | null>(null);
  const [activeLegalModal, setActiveLegalModal] = useState<LegalModalType>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'warning' } | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [is404, setIs404] = useState<boolean>(() => {
    const path = window.location.pathname;
    return path !== '/' && !path.startsWith('/data') && !path.endsWith('.svg') && !path.endsWith('.xml') && !path.endsWith('.txt');
  });

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Sincronizar favoritos en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('blackfridaysv_saved_deals', JSON.stringify(savedDealIds));
    } catch (err) {
      console.warn('Error guardando en localStorage:', err);
    }
  }, [savedDealIds]);

  const toggleSaveDeal = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedDealIds((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((x) => x !== id) : [...prev, id];
      showToast(exists ? 'Oferta retirada de tus guardados' : '❤️ Oferta guardada en tu lista');
      return updated;
    });
  };

  const isDealSaved = (id: string) => savedDealIds.includes(id);

  const handleShareWhatsApp = (deal: DealItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = `🚨 *Radar Black Friday SV*: Encontré esta oferta en ${deal.store}:\n\n` +
      `*${deal.title}*\n` +
      `💰 Precio Hoy: $${deal.currentPrice.toFixed(2)}${deal.regularPrice ? ` (Precio regular: $${deal.regularPrice.toFixed(2)})` : ''}\n` +
      `🚦 Veredicto: ${deal.verdictMessage}\n\n` +
      `🔍 Audítalo aquí: ${window.location.origin}/#deal-${deal.id}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyLink = async (deal: DealItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}/#deal-${deal.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(`Enlace copiado para ${deal.brand} ${deal.modelCode}`);
    } catch {
      showToast('No se pudo copiar el enlace', 'warning');
    }
  };

  // Keyboard Shortcuts (/ o Cmd+K para buscar, Escape para cerrar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Escape') {
        if (activeModalDeal) {
          setActiveModalDeal(null);
        } else if (activeLegalModal) {
          setActiveLegalModal(null);
        } else if (searchTerm) {
          setSearchTerm('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalDeal, activeLegalModal, searchTerm]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'terminos' || hash === 'metodologia' || hash === 'privacidad') {
        setActiveLegalModal(hash as LegalModalType);
      } else if (hash.startsWith('deal-')) {
        const dealId = hash.replace('deal-', '');
        const target = deals.find(d => d.id === dealId);
        if (target) setActiveModalDeal(target);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [deals]);

  useEffect(() => {
    async function loadDb() {
      setIsLoading(true);
      try {
        const live = await fetchLiveDeals();
        if (live && live.length > 0) {
          const mapped: DealItem[] = live.map((item) => ({
            id: item.store_product_id,
            store: item.store_name,
            brand: item.brand || 'Genérico',
            modelCode: item.model_code || 'N/A',
            title: item.store_title,
            category: item.category,
            currentPrice: item.current_offer_price,
            regularPrice: item.current_regular_price,
            baselinePrice30d: item.baseline_price_30d || item.current_offer_price,
            dealScore: item.deal_score === 'precio_regular' ? 'descuento_cosmetico' : item.deal_score,
            verdictMessage: item.is_inflated 
              ? '¡CUIDADO! La tienda subió el precio anunciado semanas antes para que la rebaja pareciera más grande.' 
              : item.is_all_time_low 
              ? '¡PRECIO MÁS BAJO DEL AÑO! Ahorro real verificado frente al precio habitual de octubre.' 
              : `Rebaja real calculada del ${item.real_discount_percent}% frente a su costo en octubre.`,
            productUrl: item.product_url,
            imageUrl: item.product_image,
            inStock: item.in_stock ?? true,
          }));
          const enriched = enrichDealsWithCrossStoreComparisons(mapped);
          setDeals(enriched);
          setIsUsingLiveDb(true);
        } else {
          setDeals(MOCK_DEALS);
        }
      } catch (err) {
        console.warn('Error cargando catálogo:', err);
        setDeals(MOCK_DEALS);
      } finally {
        setIsLoading(false);
      }
    }
    loadDb();
  }, []);

  useEffect(() => {
    if (activeModalDeal || activeLegalModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeModalDeal, activeLegalModal]);

  const stats = useMemo(() => {
    const total = deals.length;
    if (total === 0) return { realPercent: 38, inflatedPercent: 24, neutralPercent: 38 };
    const realDeals = deals.filter(d => d.dealScore === 'ganga_historica' || d.dealScore === 'buena_oferta').length;
    const inflatedDeals = deals.filter(d => d.dealScore === 'falsa_oferta_inflada').length;
    const neutralDeals = total - realDeals - inflatedDeals;
    return {
      realPercent: Math.round((realDeals / total) * 100),
      inflatedPercent: Math.round((inflatedDeals / total) * 100),
      neutralPercent: Math.round((neutralDeals / total) * 100),
    };
  }, [deals]);

  const facetCounts = useMemo(() => {
    const storeCounts: Record<string, number> = { all: deals.length };
    STORE_CHIPS.forEach((chip) => {
      if (chip.id !== 'all') {
        storeCounts[chip.id] = deals.filter((d) => d.store.toLowerCase().includes(chip.id.toLowerCase())).length;
      }
    });

    const categoryCounts: Record<string, number> = { all: deals.length };
    CATEGORY_CHIPS.forEach((cat) => {
      if (cat.id !== 'all') {
        categoryCounts[cat.id] = deals.filter((d) => d.category === cat.id).length;
      }
    });

    const budgetCounts: Record<BudgetFilterType, number> = {
      all: deals.length,
      under_100: deals.filter((d) => d.currentPrice < 100).length,
      '100_to_300': deals.filter((d) => d.currentPrice >= 100 && d.currentPrice <= 300).length,
      '300_to_600': deals.filter((d) => d.currentPrice > 300 && d.currentPrice <= 600).length,
      above_600: deals.filter((d) => d.currentPrice > 600).length,
    };

    const realCount = deals.filter((d) => d.dealScore === 'ganga_historica' || d.dealScore === 'buena_oferta').length;
    const inflatedCount = deals.filter((d) => d.dealScore === 'falsa_oferta_inflada').length;
    const comparativeCount = deals.filter((d) => Boolean(d.competitors && d.competitors.length > 0)).length;
    const savedCount = deals.filter((d) => savedDealIds.includes(d.id)).length;

    return { storeCounts, categoryCounts, budgetCounts, realCount, inflatedCount, comparativeCount, savedCount };
  }, [deals, savedDealIds]);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchSearch = 
        deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.modelCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.store.toLowerCase().includes(searchTerm.toLowerCase());

      const matchScore = 
        filterScore === 'all' ? true :
        filterScore === 'reales' ? (deal.dealScore === 'ganga_historica' || deal.dealScore === 'buena_oferta') :
        filterScore === 'falsa_oferta_inflada' ? (deal.dealScore === 'falsa_oferta_inflada') :
        filterScore === 'comparativa' ? Boolean(deal.competitors && deal.competitors.length > 0) :
        filterScore === 'guardados' ? savedDealIds.includes(deal.id) :
        deal.dealScore === filterScore;

      const matchCategory = selectedCategory === 'all' || deal.category === selectedCategory;

      const matchStore = 
        selectedStore === 'all' ? true :
        deal.store.toLowerCase().includes(selectedStore.toLowerCase());

      const matchBudget = 
        budgetFilter === 'all' ? true :
        budgetFilter === 'under_100' ? deal.currentPrice < 100 :
        budgetFilter === '100_to_300' ? (deal.currentPrice >= 100 && deal.currentPrice <= 300) :
        budgetFilter === '300_to_600' ? (deal.currentPrice > 300 && deal.currentPrice <= 600) :
        deal.currentPrice > 600;

      return matchSearch && matchScore && matchCategory && matchStore && matchBudget;
    });
  }, [deals, searchTerm, filterScore, selectedCategory, selectedStore, budgetFilter, savedDealIds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterScore, selectedCategory, selectedStore, budgetFilter, sortBy, pageSize]);

  const sortedDeals = useMemo(() => {
    const list = [...filteredDeals];
    switch (sortBy) {
      case 'savings_desc':
        return list.sort((a, b) => {
          const savingsA = a.baselinePrice30d > a.currentPrice ? (a.baselinePrice30d - a.currentPrice) : 0;
          const savingsB = b.baselinePrice30d > b.currentPrice ? (b.baselinePrice30d - b.currentPrice) : 0;
          return savingsB - savingsA;
        });
      case 'discount_pct':
        return list.sort((a, b) => {
          const pctA = a.baselinePrice30d > a.currentPrice ? ((a.baselinePrice30d - a.currentPrice) / a.baselinePrice30d) : 0;
          const pctB = b.baselinePrice30d > b.currentPrice ? ((b.baselinePrice30d - b.currentPrice) / b.baselinePrice30d) : 0;
          return pctB - pctA;
        });
      case 'price_asc':
        return list.sort((a, b) => a.currentPrice - b.currentPrice);
      case 'price_desc':
        return list.sort((a, b) => b.currentPrice - a.currentPrice);
      case 'inflated_first':
        return list.sort((a, b) => {
          const isInfA = a.dealScore === 'falsa_oferta_inflada' ? 1 : 0;
          const isInfB = b.dealScore === 'falsa_oferta_inflada' ? 1 : 0;
          return isInfB - isInfA;
        });
      default:
        return list;
    }
  }, [filteredDeals, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedDeals.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const availablePageSizes = useMemo(() => {
    return [16, 32, 64].filter((sz) => sz < sortedDeals.length);
  }, [sortedDeals.length]);

  useEffect(() => {
    if (pageSize < 9999 && availablePageSizes.length > 0 && !availablePageSizes.includes(pageSize)) {
      setPageSize(availablePageSizes[0]);
    }
  }, [availablePageSizes, pageSize]);

  const paginatedDeals = useMemo(() => {
    if (pageSize >= 9999) return sortedDeals;
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedDeals.slice(start, start + pageSize);
  }, [sortedDeals, safeCurrentPage, pageSize]);

  if (is404) {
    return (
      <NotFoundPage 
        onReturnHome={() => {
          window.history.pushState(null, '', '/');
          setIs404(false);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 selection:bg-blue-600 selection:text-white">
      {/* Top Banner de Monitoreo */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-blue-900/40 px-4 py-2 text-xs text-center text-blue-200/90 flex flex-wrap items-center justify-center gap-3">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Rastreo activo de precios en El Salvador para Black Friday 2026</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/40 text-emerald-400 text-[11px] font-mono">
          <Database className="w-3 h-3" />
          {isUsingLiveDb ? 'Precios en Vivo' : 'Monitoreo Activo'}
        </span>
      </div>

      {/* Hero Section */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          Monitoreo Ciudadano de Precios
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Radar de Ofertas Reales <span className="text-blue-500">Black Friday SV</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed">
          Compara precios reales entre <strong>Siman, Prado, Curacao, Omnisport y Walmart</strong>. Descubre si una rebaja es genuina o si inflaron el precio días antes.
        </p>

        {/* Resumen de Hallazgos en 4 Tarjetas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 max-w-5xl mx-auto mt-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">5 Almacenes</div>
            <div className="text-xs text-slate-400 mt-0.5">Revisión diaria en El Salvador</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{stats.realPercent}% Reales</div>
            <div className="text-xs text-slate-400 mt-0.5">Rebajas verdaderas</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">{stats.inflatedPercent}% Infladas</div>
            <div className="text-xs text-slate-400 mt-0.5">Ofertas infladas o engañosas</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">{stats.neutralPercent}% Mismo Precio</div>
            <div className="text-xs text-slate-400 mt-0.5">Sin rebaja vs octubre</div>
          </div>
        </div>

        {/* Botón Didáctico: "¿Cómo funciona el semáforo?" */}
        <div className="max-w-2xl mx-auto mt-4">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-950/40 hover:bg-blue-950/60 border border-blue-800/40 px-3.5 py-1.5 rounded-full"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>¿Cómo saber si una oferta es real? Ver explicación sencilla</span>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showGuide && (
            <div className="mt-3 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl text-left grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase mb-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  🟢 Oferta Real
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  El precio de hoy es <strong>menor al precio que costaba en octubre</strong>. Hay un ahorro real en dólares en tu bolsillo.
                </p>
              </div>

              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase mb-1">
                  <span className="h-2 w-2 rounded-full bg-rose-400"></span>
                  🔴 Precio Inflado
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  La tienda <strong>subió el precio de lista semanas antes</strong> para anunciar que tiene "50% de descuento" falso.
                </p>
              </div>

              <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase mb-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                  🟡 Mismo Precio
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  Tiene letrero de promoción, pero <strong>cuesta exactamente lo mismo</strong> que ha costado todo el año.
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Search & Filters Container */}
      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl mb-6">
          {/* Caja de Búsqueda */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input 
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              maxLength={80}
              onChange={(e) => setSearchTerm(e.target.value.slice(0, 80))}
              placeholder="¿Qué producto buscas? (ej: Smart TV 55, Galaxy S24, iPhone 15, Lavadora Mabe)..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-12 pr-20 py-3.5 text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              aria-label="Buscar producto o modelo en el catálogo"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {!searchTerm && (
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-700/80 rounded" title="Presiona / o ⌘K para buscar">
                  /
                </kbd>
              )}
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Limpiar búsqueda"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filtros Principales */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => setFilterScore('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterScore === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Todos ({deals.length})
            </button>
            <button
              onClick={() => setFilterScore(filterScore === 'reales' ? 'all' : 'reales')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterScore === 'reales'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/30'
                  : 'bg-slate-800/70 text-emerald-400 hover:bg-slate-800'
              }`}
              title={filterScore === 'reales' ? 'Haz clic para deseleccionar' : undefined}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> 🟢 Ofertas Reales ({facetCounts.realCount})
            </button>
            <button
              onClick={() => setFilterScore(filterScore === 'falsa_oferta_inflada' ? 'all' : 'falsa_oferta_inflada')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterScore === 'falsa_oferta_inflada'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 border border-rose-400/30'
                  : 'bg-slate-800/70 text-rose-400 hover:bg-slate-800'
              }`}
              title={filterScore === 'falsa_oferta_inflada' ? 'Haz clic para deseleccionar' : undefined}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> 🔴 Precios Inflados ({facetCounts.inflatedCount})
            </button>
            <button
              onClick={() => setFilterScore(filterScore === 'comparativa' ? 'all' : 'comparativa')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterScore === 'comparativa'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30'
                  : 'bg-slate-800/70 text-blue-300 hover:bg-slate-800'
              }`}
              title={filterScore === 'comparativa' ? 'Haz clic para deseleccionar' : undefined}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Comparativa ({facetCounts.comparativeCount})</span>
            </button>
            <button
              onClick={() => setFilterScore(filterScore === 'guardados' ? 'all' : 'guardados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterScore === 'guardados'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 border border-rose-400/30'
                  : 'bg-slate-800/70 text-rose-300 hover:bg-slate-800'
              }`}
              title={filterScore === 'guardados' ? 'Haz clic para deseleccionar' : undefined}
            >
              <Heart className={`w-3.5 h-3.5 ${facetCounts.savedCount > 0 ? 'fill-rose-400 text-rose-400' : ''}`} />
              <span>Mis Guardados ({facetCounts.savedCount})</span>
            </button>
          </div>

          {/* Filtro por Almacén */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2.5 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 mr-1 text-[11px] uppercase font-semibold flex items-center gap-1">
              <Store className="w-3 h-3 text-blue-400" /> Almacén:
            </span>
            {STORE_CHIPS.map((chip) => {
              const isSelected = selectedStore === chip.id;
              const count = facetCounts.storeCounts[chip.id] ?? 0;
              return (
                <button
                  key={chip.id}
                  onClick={() => setSelectedStore(chip.id === 'all' ? 'all' : (isSelected ? 'all' : chip.id))}
                  className={`px-2.5 py-1 rounded-md transition-all text-xs flex items-center gap-1 ${
                    isSelected
                      ? 'bg-blue-600 border border-blue-500 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white bg-slate-950/60 hover:bg-slate-800 border border-slate-800/60'
                  }`}
                  title={isSelected && chip.id !== 'all' ? 'Haz clic para deseleccionar' : undefined}
                >
                  <span>{chip.label}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-blue-700 text-white' : 'text-slate-400 bg-slate-900'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtro por Presupuesto */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2.5 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 mr-1 text-[11px] uppercase font-semibold flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" /> Presupuesto:
            </span>
            {BUDGET_CHIPS.map((chip) => {
              const isSelected = budgetFilter === chip.id;
              const count = facetCounts.budgetCounts[chip.id] ?? 0;
              return (
                <button
                  key={chip.id}
                  onClick={() => setBudgetFilter(chip.id === 'all' ? 'all' : (isSelected ? 'all' : chip.id))}
                  className={`px-2.5 py-1 rounded-md transition-all text-xs flex items-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-600 border border-emerald-500 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white bg-slate-950/60 hover:bg-slate-800 border border-slate-800/60'
                  }`}
                  title={chip.range}
                >
                  <span>{chip.label}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-emerald-700 text-white' : 'text-slate-400 bg-slate-900'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtro por Categoría */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2.5 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 mr-1 text-[11px] uppercase font-semibold flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" /> Categoría:
            </span>
            {CATEGORY_CHIPS.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = facetCounts.categoryCounts[cat.id] ?? 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id === 'all' ? 'all' : (isSelected ? 'all' : cat.id))}
                  className={`px-2.5 py-1 rounded-md transition-colors text-xs flex items-center gap-1 ${
                    isSelected
                      ? 'bg-blue-600 border border-blue-500 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50 bg-slate-950/60 border border-slate-800/60'
                  }`}
                  title={isSelected && cat.id !== 'all' ? 'Haz clic para deseleccionar' : undefined}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-blue-700 text-white' : 'text-slate-400 bg-slate-900'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Barra de Control: Conteo, Ordenación, Paginación rápida y Modo de Vista */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 sm:p-3.5 mb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 text-xs">
          {/* Conteo y Reset */}
          <div className="flex flex-wrap items-center gap-2">
            {sortedDeals.length === 0 ? (
              <span className="text-slate-400 font-medium">0 ofertas encontradas</span>
            ) : sortedDeals.length <= pageSize || pageSize >= 9999 ? (
              <span className="text-slate-300">
                Mostrando <strong className="font-mono text-white">{sortedDeals.length}</strong> de <strong className="font-mono text-blue-400 font-bold">{sortedDeals.length}</strong> ofertas
              </span>
            ) : (
              <span className="text-slate-300">
                Mostrando <strong className="font-mono text-white">{(safeCurrentPage - 1) * pageSize + 1} - {Math.min(safeCurrentPage * pageSize, sortedDeals.length)}</strong> de <strong className="font-mono text-blue-400 font-bold">{sortedDeals.length}</strong> ofertas
              </span>
            )}
            {(searchTerm || filterScore !== 'all' || selectedCategory !== 'all' || selectedStore !== 'all' || budgetFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterScore('all');
                  setSelectedCategory('all');
                  setSelectedStore('all');
                  setBudgetFilter('all');
                }}
                className="text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
              >
                (Restablecer filtros)
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full ml-1 font-mono">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Búsqueda protegida en tu navegador
            </span>
          </div>

          {/* Opciones de Ordenación, Paginación rápida y Modo de Vista */}
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-2.5 shrink-0 justify-start lg:justify-end">
            {/* Selector de Ordenamiento */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="sort-select" className="text-slate-400 text-[11px] font-medium hidden sm:inline">Ordenar:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
              >
                <option value="savings_desc" className="bg-slate-900 text-white">🔥 Mayor Ahorro en Dólares ($)</option>
                <option value="discount_pct" className="bg-slate-900 text-white">📉 Mayor Porcentaje de Ahorro (%)</option>
                <option value="price_asc" className="bg-slate-900 text-white">💲 Menor Precio ($)</option>
                <option value="price_desc" className="bg-slate-900 text-white">💰 Mayor Precio ($)</option>
                <option value="inflated_first" className="bg-slate-900 text-white">⚠️ Precios Inflados Primero</option>
              </select>
            </div>

            {/* Selector de Cantidad por Página (Solo visible cuando hay suficientes productos) */}
            {availablePageSizes.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl px-2 py-1 shrink-0">
                <span className="text-slate-400 text-[11px] font-medium pl-1">Por pág:</span>
                {availablePageSizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setPageSize(sz)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                      pageSize === sz
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
                <button
                  onClick={() => setPageSize(9999)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    pageSize >= 9999
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Mostrar todas sin paginar"
                >
                  Todo
                </button>
              </div>
            )}

            {/* Selector de Modo de Vista (Fichas vs Lista Compacta) */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Vista en fichas detalladas"
                aria-label="Vista en fichas detalladas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'compact'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Vista compacta (pantalla limpia)"
                aria-label="Vista compacta"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Tarjetas de Productos */}
        {isLoading ? (
          <div className={viewMode === 'compact' ? 'space-y-2' : 'space-y-4'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} viewMode={viewMode} />
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xl my-6">
            <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {searchTerm ? `Sin resultados para "${searchTerm}"` : 'No encontramos ofertas con estos filtros'}
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-sm mx-auto">
              Prueba deseleccionando filtros o seleccionando alguna de las categorías más buscadas en El Salvador.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => {
                  setSelectedCategory('tv_audio');
                  setSearchTerm('');
                  setFilterScore('all');
                  setSelectedStore('all');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
              >
                <Tv className="w-3.5 h-3.5 text-blue-400" />
                <span>Ver Pantallas y TV</span>
              </button>
              <button
                onClick={() => {
                  setFilterScore('reales');
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedStore('all');
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ver Gangas Reales</span>
              </button>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterScore('all');
                  setSelectedCategory('all');
                  setSelectedStore('all');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer filtros</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'compact' ? (
          <div className="space-y-2">
            {paginatedDeals.map((deal) => {
              const isGanga = deal.dealScore === 'ganga_historica';
              const isInflated = deal.dealScore === 'falsa_oferta_inflada';
              const isGood = deal.dealScore === 'buena_oferta';
              const hasRealSavings = deal.regularPrice && deal.regularPrice > deal.currentPrice && !isInflated;
              const savingsAmount = hasRealSavings ? (deal.regularPrice! - deal.currentPrice).toFixed(2) : null;

              const allPodiumStores = [
                { store: deal.store, price: deal.currentPrice, productUrl: deal.productUrl, isCurrent: true, inStock: deal.inStock },
                ...(deal.competitors || []).map(c => ({ store: c.store, price: c.price, productUrl: c.productUrl, isCurrent: false, inStock: c.inStock ?? true }))
              ].sort((a, b) => a.price - b.price);

              const bestStore = allPodiumStores[0];

              return (
                <div 
                  key={deal.id}
                  className={`bg-slate-900/80 border rounded-xl p-3 sm:p-4 transition-all hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isInflated ? 'border-rose-900/50 bg-rose-950/10' :
                    isGanga ? 'border-emerald-800/50 bg-emerald-950/10' :
                    isGood ? 'border-blue-900/40 bg-blue-950/10' :
                    'border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-12 h-12 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden p-1 relative">
                      {deal.imageUrl && !imgErrors[deal.id] ? (
                        <img 
                          src={deal.imageUrl} 
                          alt={deal.title} 
                          className="max-h-full max-w-full object-contain" 
                          loading="lazy" 
                          onError={() => setImgErrors(prev => ({ ...prev, [deal.id]: true }))}
                        />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] mb-0.5">
                        <span className="font-semibold text-slate-300">{deal.store}</span>
                        <span className="text-slate-600">•</span>
                        <span className="font-mono text-blue-400 font-semibold">{deal.modelCode}</span>
                        {deal.inStock ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-950/50 border border-emerald-800/40">
                            🟢 En existencia
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-950/50 border border-rose-800/40">
                            🔴 Agotado
                          </span>
                        )}
                        {isInflated ? (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/50 px-1.5 py-0.2 rounded">
                            ⚠️ Inflado
                          </span>
                        ) : isGanga ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded">
                            🏆 Ganga real
                          </span>
                        ) : null}
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-white truncate max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl" title={deal.title}>
                        {deal.title}
                      </h4>
                      {deal.competitors && deal.competitors.length > 0 && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Precio más bajo: <strong>{bestStore.store} (${bestStore.price.toFixed(2)})</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                    {/* Mini Sparkline de 60 días */}
                    <div className="hidden lg:block">
                      <PriceSparkline deal={deal} compact />
                    </div>

                    <div className="text-left md:text-right">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg sm:text-xl font-extrabold font-mono text-white">
                          ${deal.currentPrice.toFixed(2)}
                        </span>
                        {deal.regularPrice && (
                          <span className="text-xs font-mono text-slate-500 line-through">
                            ${deal.regularPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {savingsAmount && (
                        <div className="text-[10px] text-emerald-400 font-bold font-mono">
                          Ahorro real: ${savingsAmount}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => toggleSaveDeal(deal.id, e)}
                        className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors border ${
                          isDealSaved(deal.id)
                            ? 'bg-rose-950/60 text-rose-400 border-rose-800/80'
                            : 'text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-700 border-transparent'
                        }`}
                        title={isDealSaved(deal.id) ? 'Quitar de mis guardados' : 'Guardar en mi lista'}
                        aria-label="Guardar oferta"
                      >
                        <Heart className={`w-4 h-4 ${isDealSaved(deal.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => handleShareWhatsApp(deal, e)}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-emerald-400 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors"
                        title="Compartir por WhatsApp"
                        aria-label="Compartir por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleCopyLink(deal, e)}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-blue-400 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors"
                        title="Copiar enlace directo"
                        aria-label="Copiar enlace directo"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveModalDeal(deal)}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                        title="Ver detalles del precio"
                        aria-label="Ver detalles del precio"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={deal.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-md ${
                          !deal.inStock
                            ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Comprar</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedDeals.map((deal) => {
              const isGanga = deal.dealScore === 'ganga_historica';
              const isInflated = deal.dealScore === 'falsa_oferta_inflada';
              const isGood = deal.dealScore === 'buena_oferta';
              const hasRealSavings = deal.regularPrice && deal.regularPrice > deal.currentPrice && !isInflated;
              const savingsAmount = hasRealSavings ? (deal.regularPrice! - deal.currentPrice).toFixed(2) : null;

              // Armar Podio Completo de Tiendas para este modelo
              const allPodiumStores = [
                { store: deal.store, price: deal.currentPrice, productUrl: deal.productUrl, isCurrent: true, inStock: deal.inStock },
                ...(deal.competitors || []).map(c => ({ store: c.store, price: c.price, productUrl: c.productUrl, isCurrent: false, inStock: c.inStock ?? true }))
              ].sort((a, b) => a.price - b.price);

              const bestStore = allPodiumStores[0];
              const maxPriceStore = allPodiumStores[allPodiumStores.length - 1];
              const maxSavingsVsWorst = (maxPriceStore.price - bestStore.price).toFixed(2);

              return (
                <div 
                  key={deal.id}
                  className={`bg-slate-900/80 border rounded-2xl p-4 sm:p-5 transition-all hover:border-slate-700 ${
                    isInflated ? 'border-rose-900/50 bg-rose-950/10' :
                    isGanga ? 'border-emerald-800/50 bg-emerald-950/10' :
                    isGood ? 'border-blue-900/40 bg-blue-950/10' :
                    'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row gap-4 sm:gap-5 items-stretch">
                    {/* 1. Columna Imagen + Badge Flotante de Stock + Guardar */}
                    <div className="w-full md:w-44 lg:w-48 h-44 md:h-auto md:min-h-[190px] bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative p-2.5 group">
                      {/* Badge Flotante de Stock en Tiempo Real */}
                      <div className="absolute top-2 left-2 z-10">
                        {deal.inStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 border border-emerald-600/80 text-emerald-300 shadow-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            En existencia
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/90 border border-rose-600/80 text-rose-300 shadow-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                            Agotado
                          </span>
                        )}
                      </div>

                      {/* Botón Flotante de Guardar / Favoritos */}
                      <button
                        onClick={(e) => toggleSaveDeal(deal.id, e)}
                        className={`absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-md transition-all shadow-md ${
                          isDealSaved(deal.id)
                            ? 'bg-rose-950/90 text-rose-400 border border-rose-500/80 scale-105'
                            : 'bg-slate-950/70 text-slate-400 hover:text-white border border-slate-700/60'
                        }`}
                        title={isDealSaved(deal.id) ? 'Quitar de mis guardados' : 'Guardar en mi lista de Black Friday'}
                        aria-label={isDealSaved(deal.id) ? 'Quitar de guardados' : 'Guardar en mi lista'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isDealSaved(deal.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>

                      {deal.imageUrl && !imgErrors[deal.id] ? (
                        <img 
                          src={deal.imageUrl} 
                          alt={deal.title}
                          className="max-h-full max-w-full object-contain mx-auto transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={() => setImgErrors(prev => ({ ...prev, [deal.id]: true }))}
                        />
                      ) : (
                        <div className="text-slate-600 text-center flex flex-col items-center justify-center p-2">
                          <ShoppingBag className="w-8 h-8 mx-auto mb-1 text-slate-700" />
                          <span className="text-[10px] block text-slate-500 font-medium">{deal.store}</span>
                        </div>
                      )}
                    </div>

                    {/* 2. Información Central y Explicación del Precio */}
                    <div className="flex-1 min-w-0">
                      {/* Tienda, Marca y Modelo */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-semibold">
                          <Store className="w-3 h-3 text-blue-400" />
                          {deal.store}
                        </span>

                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                          {deal.brand}
                        </span>

                        {deal.modelCode && deal.modelCode !== 'N/A' && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700/60 text-slate-300 font-mono text-[11px]" title="Código del fabricante para comparar tiendas">
                            Modelo: {deal.modelCode}
                          </span>
                        )}
                      </div>

                      {/* Título del Producto */}
                      <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
                        {deal.title}
                      </h3>

                      {/* Caja del Veredicto con Sello Cívico */}
                      <div className={`rounded-xl p-3 text-xs sm:text-sm font-medium flex items-start gap-2.5 mb-3 transition-shadow ${
                        isInflated ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.12)]' :
                        isGanga ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.12)]' :
                        isGood ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30' :
                        'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      }`}>
                        {isInflated && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                        {isGanga && <Flame className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                        {isGood && <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
                        {!isInflated && !isGanga && !isGood && <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                        
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-[11px] mb-0.5">
                            {isGanga && '🟢 Veredicto: ¡Rebaja Real Comprobada!'}
                            {isInflated && '🔴 Alerta Art. 31 LPC: Precio Inflado Previo a Black Friday'}
                            {isGood && '🟢 Veredicto: Descuento Real Verificado'}
                            {!isInflated && !isGanga && !isGood && '🟡 Veredicto: Mismo Precio de Todo el Año'}
                          </span>
                          <span className="leading-relaxed">{deal.verdictMessage}</span>
                        </div>
                      </div>

                      {/* Micro-Gráfica de Tendencia Histórica de Precios (Idealo/Keepa) */}
                      <PriceSparkline deal={deal} />

                      {/* Podio Visual Cross-Store (🥇 🥈 🥉 ❌) */}
                      {deal.competitors && deal.competitors.length > 0 && (
                        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-200 flex items-center gap-1.5">
                              <Trophy className="w-4 h-4 text-amber-400" />
                              Comparación de precios en almacenes de El Salvador:
                            </span>
                            {parseFloat(maxSavingsVsWorst) > 0 && (
                              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded-full font-bold">
                                Ahorro de hasta ${maxSavingsVsWorst} entre almacenes
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {allPodiumStores.map((item, idx) => {
                              const isGold = idx === 0;
                              const isSilver = idx === 1;
                              const isBronze = idx === 2;

                              return (
                                <a
                                  key={item.store}
                                  href={item.productUrl || '#'}
                                  target={item.productUrl ? '_blank' : undefined}
                                  rel="noopener noreferrer"
                                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all relative ${
                                    item.isCurrent
                                      ? 'ring-2 ring-blue-500/80 bg-blue-950/30 border-blue-600/70'
                                      : isGold
                                      ? 'bg-emerald-950/30 border-emerald-600/60 hover:bg-emerald-900/40'
                                      : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/80'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
                                      {isGold && '🥇'}
                                      {isSilver && '🥈'}
                                      {isBronze && '🥉'}
                                      {item.store}
                                    </span>
                                    {item.isCurrent && (
                                      <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded uppercase tracking-wider">
                                        Viendo
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-baseline justify-between mt-1">
                                    <span className="font-mono text-sm font-extrabold text-white">
                                      ${item.price.toFixed(2)}
                                    </span>
                                    {isGold ? (
                                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1 rounded">
                                        🏆 Mejor Precio
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        +${(item.price - bestStore.price).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. Columna Derecha: Precios y Acciones */}
                    <div className="w-full md:w-56 lg:w-60 shrink-0 flex flex-col justify-between items-start md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800 self-stretch">
                      <div className="md:text-right w-full">
                        <div className="flex items-baseline gap-2 md:justify-end">
                          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                            ${deal.currentPrice.toFixed(2)}
                          </span>
                          {deal.regularPrice && (
                            <span className="text-sm font-mono text-slate-400 line-through">
                              ${deal.regularPrice.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {savingsAmount && (
                          <div className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 font-mono text-xs font-bold">
                            Ahorro real: ${savingsAmount}
                          </div>
                        )}

                        <div className="text-[11px] text-slate-400 mt-1.5">
                          Costo habitual: <span className="font-mono text-slate-300 font-semibold">${deal.baselinePrice30d.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Botón de Explicación y Detalles de Precio */}
                      <button
                        onClick={() => setActiveModalDeal(deal)}
                        className="w-full text-left md:text-right text-xs text-blue-400 hover:text-blue-300 inline-flex items-center justify-start md:justify-end gap-1 font-medium transition-colors py-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver cómo calculamos el precio</span>
                      </button>

                      {/* Botones de Guardar, Compartir WhatsApp y Copiar */}
                      <div className="grid grid-cols-3 gap-1.5 w-full">
                        <button
                          onClick={(e) => toggleSaveDeal(deal.id, e)}
                          className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors border ${
                            isDealSaved(deal.id)
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800/80'
                              : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border-slate-700/60'
                          }`}
                          title={isDealSaved(deal.id) ? 'Quitar de mis guardados' : 'Guardar oferta en mi lista'}
                          aria-label="Guardar oferta"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isDealSaved(deal.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                          <span className="hidden sm:inline">{isDealSaved(deal.id) ? 'Guardado' : 'Guardar'}</span>
                        </button>
                        <button
                          onClick={(e) => handleShareWhatsApp(deal, e)}
                          className="min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center gap-1 transition-colors"
                          title="Compartir por WhatsApp"
                          aria-label="Compartir por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                        <button
                          onClick={(e) => handleCopyLink(deal, e)}
                          className="min-h-[44px] px-2 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center gap-1 transition-colors"
                          title="Copiar enlace"
                          aria-label="Copiar enlace"
                        >
                          <Copy className="w-3.5 h-3.5 text-blue-400" />
                          <span className="hidden sm:inline">Copiar</span>
                        </button>
                      </div>

                      {/* Botón de Compra Directa */}
                      <a 
                        href={deal.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg ${
                          !deal.inStock
                            ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>{deal.inStock ? `Comprar en ${deal.store}` : 'Ver en almacén (Agotado)'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación y Navegación al Pie (Solo si hay más de 1 página) */}
        {sortedDeals.length > 0 && totalPages > 1 && pageSize < 9999 && (
          <div className="mt-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 text-center sm:text-left">
              Página <strong className="font-mono text-white">{safeCurrentPage}</strong> de{' '}
              <strong className="font-mono text-white">{totalPages}</strong> (mostrando ofertas{' '}
              <span className="font-bold text-white font-mono">{(safeCurrentPage - 1) * pageSize + 1}</span> a{' '}
              <span className="font-bold text-white font-mono">{Math.min(safeCurrentPage * pageSize, sortedDeals.length)}</span> de{' '}
              <span className="font-bold text-blue-400 font-mono">{sortedDeals.length}</span>)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={safeCurrentPage <= 1}
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  window.scrollTo({ top: 380, behavior: 'smooth' });
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                  safeCurrentPage <= 1
                    ? 'text-slate-600 bg-slate-950/40 border border-slate-900 cursor-not-allowed'
                    : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              {/* Botones de Páginas */}
              <div className="flex items-center gap-1">
                {getPageNumbers(safeCurrentPage, totalPages).map((p, idx) => (
                  typeof p === 'number' ? (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentPage(p);
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-mono font-bold transition-all ${
                        safeCurrentPage === p
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500'
                          : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={idx} className="px-1 text-slate-600 text-xs font-mono">…</span>
                  )
                ))}
              </div>

              <button
                disabled={safeCurrentPage >= totalPages}
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  window.scrollTo({ top: 380, behavior: 'smooth' });
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                  safeCurrentPage >= totalPages
                    ? 'text-slate-600 bg-slate-950/40 border border-slate-900 cursor-not-allowed'
                    : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80'
                }`}
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal / Ventana de Detalles y Explicación del Precio */}
      {activeModalDeal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveModalDeal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
              <ShieldAlert className="w-4 h-4" />
              Detalles de la Oferta y Protección al Consumidor (El Salvador)
            </div>

            <h2 className="text-xl font-bold text-white mb-4 pr-8">
              {activeModalDeal.title}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center flex items-center justify-center h-48">
                {activeModalDeal.imageUrl && !imgErrors[activeModalDeal.id] ? (
                  <img 
                    src={activeModalDeal.imageUrl} 
                    alt={activeModalDeal.title} 
                    className="max-h-full max-w-full object-contain" 
                    onError={() => setImgErrors(prev => ({ ...prev, [activeModalDeal.id]: true }))}
                  />
                ) : (
                  <div className="text-center p-4">
                    <ShoppingBag className="w-10 h-10 mx-auto text-slate-700 mb-1.5" />
                    <span className="text-slate-500 text-xs">Sin foto disponible en catálogo oficial</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Almacén:</span>
                  <strong className="text-white text-sm">{activeModalDeal.store}</strong>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Código oficial del modelo:</span>
                  <strong className="text-blue-400 font-mono text-sm">{activeModalDeal.modelCode}</strong>
                  <span className="text-slate-500 block text-[10px] mt-0.5">Código oficial del producto para comparar el mismo modelo exacto en otras tiendas</span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Disponibilidad en tienda:</span>
                  <span className={`font-bold ${activeModalDeal.inStock ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeModalDeal.inStock ? '🟢 Disponible para compra inmediata' : '🔴 Agotado en este almacén'}
                  </span>
                </div>
              </div>
            </div>

            {/* Explicación Detallada del Precio */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-400" /> ¿Cómo verificamos esta oferta?:
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeModalDeal.verdictMessage}
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3">
              <a
                href={activeModalDeal.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <span>Ir al sitio oficial de {activeModalDeal.store}</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={(e) => handleShareWhatsApp(activeModalDeal, e)}
                className="min-h-[44px] px-3.5 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                title="Compartir por WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button
                onClick={(e) => handleCopyLink(activeModalDeal, e)}
                className="min-h-[44px] px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                title="Copiar enlace"
              >
                <Copy className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">Copiar</span>
              </button>

              <button
                onClick={() => setActiveModalDeal(null)}
                className="min-h-[44px] px-5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Legal & Transparencia Institucional */}
      <footer className="max-w-6xl mx-auto px-4 mt-16 pt-8 pb-24 sm:pb-8 border-t border-slate-800 text-center text-xs text-slate-400 space-y-4">
        {/* Enlaces Directos a Subpáginas / Modales Institucionales */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 text-xs font-semibold text-slate-300">
          <button
            onClick={() => {
              setActiveLegalModal('terminos');
              window.location.hash = 'terminos';
            }}
            className="hover:text-blue-400 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
          >
            <Scale className="w-3.5 h-3.5 text-blue-400" />
            <span>Aviso Legal y Descargo</span>
          </button>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <button
            onClick={() => {
              setActiveLegalModal('metodologia');
              window.location.hash = 'metodologia';
            }}
            className="hover:text-blue-400 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Metodología y Legalidad</span>
          </button>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <button
            onClick={() => {
              setActiveLegalModal('privacidad');
              window.location.hash = 'privacidad';
            }}
            className="hover:text-blue-400 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Privacidad y Cookies</span>
          </button>
        </div>

        <p className="font-medium text-slate-300">
          Radar de Ofertas Reales Black Friday El Salvador 2026 — Iniciativa ciudadana e independiente para monitorear precios justos.
        </p>
        <p className="max-w-3xl mx-auto leading-relaxed text-slate-500 text-[11px]">
          Precios revisados periódicamente de forma automática en los escaparates web públicos de cada almacén. Plataforma amparada en los Artículos 31 y 32 de la Ley de Protección al Consumidor de El Salvador para garantizar información veraz y compras transparentes.
        </p>
        <div className="text-[10px] text-slate-600 font-mono pt-1">
          San Salvador, El Salvador • Cero datos personales recopilados • 100% Acceso Público
        </div>
      </footer>

      {/* Mobile Sticky Bottom Navigation Bar (Thumb-zone friendly) */}
      <nav aria-label="Navegación rápida en móvil" className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => {
            setFilterScore(filterScore === 'reales' ? 'all' : 'reales');
            window.scrollTo({ top: 380, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg transition-colors ${
            filterScore === 'reales' ? 'text-emerald-400 bg-emerald-950/70 border border-emerald-800/50' : 'text-slate-400'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Gangas ({facetCounts.realCount})</span>
        </button>
        <button
          onClick={() => {
            setFilterScore(filterScore === 'falsa_oferta_inflada' ? 'all' : 'falsa_oferta_inflada');
            window.scrollTo({ top: 380, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg transition-colors ${
            filterScore === 'falsa_oferta_inflada' ? 'text-rose-400 bg-rose-950/70 border border-rose-800/50' : 'text-slate-400'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Inflados ({facetCounts.inflatedCount})</span>
        </button>
        <button
          onClick={() => {
            setFilterScore(filterScore === 'guardados' ? 'all' : 'guardados');
            window.scrollTo({ top: 380, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg transition-colors ${
            filterScore === 'guardados' ? 'text-rose-400 bg-rose-950/70 border border-rose-800/50' : 'text-slate-400'
          }`}
        >
          <Heart className={`w-4 h-4 ${facetCounts.savedCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span>Guardados ({facetCounts.savedCount})</span>
        </button>
        <button
          onClick={() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="flex flex-col items-center gap-0.5 text-[10px] font-semibold py-1 px-2 rounded-lg text-slate-400 hover:text-white"
        >
          <Search className="w-4 h-4" />
          <span>Buscar</span>
        </button>
      </nav>

      {/* Modal Institucional (Aviso Legal, Metodología, Privacidad) */}
      <LegalModals
        type={activeLegalModal}
        onClose={() => {
          setActiveLegalModal(null);
          if (window.location.hash) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }}
        onSelectTab={(tab) => {
          setActiveLegalModal(tab);
          window.location.hash = tab;
        }}
      />

      {/* Toast de Notificaciones y Retroalimentación Táctil */}
      <Toast message={toast?.message ?? null} type={toast?.type ?? 'success'} />
    </div>
  );
}
