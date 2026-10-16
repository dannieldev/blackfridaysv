import { useState, useMemo, useEffect } from 'react';
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
  Sparkles, 
  ArrowRight,
  Trophy,
  ShoppingBag,
  Eye
} from 'lucide-react';
import { fetchLiveDeals } from './lib/supabase.ts';

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
    inStock: false, // Simulación de agotado para auditoría
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

const STORE_CHIPS = [
  { id: 'all', label: 'Todos los almacenes' },
  { id: 'siman', label: 'Siman' },
  { id: 'walmart', label: 'Walmart' },
  { id: 'curacao', label: 'La Curacao' },
  { id: 'prado', label: 'Prado' },
  { id: 'omnisport', label: 'Omnisport' },
];

const POPULAR_SEARCHES = [
  { label: '📺 Smart TV 55"', query: '55' },
  { label: '📱 Celulares Samsung', query: 'Samsung' },
  { label: '🍎 iPhone', query: 'iPhone' },
  { label: '❄️ Refrigeradoras', query: 'refrigeradora' },
  { label: '🎮 PlayStation 5', query: 'PlayStation' },
  { label: '💻 Laptops', query: 'laptop' },
];

export default function App() {
  const [deals, setDeals] = useState<DealItem[]>(MOCK_DEALS);
  const [isUsingLiveDb, setIsUsingLiveDb] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScore, setFilterScore] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [onlyMultiStore, setOnlyMultiStore] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [activeModalDeal, setActiveModalDeal] = useState<DealItem | null>(null);

  useEffect(() => {
    async function loadDb() {
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
      }
    }
    loadDb();
  }, []);

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
        deal.dealScore === filterScore;

      const matchCategory = selectedCategory === 'all' || deal.category === selectedCategory;

      const matchStore = 
        selectedStore === 'all' ? true :
        deal.store.toLowerCase().includes(selectedStore.toLowerCase());

      const matchMultiStore = !onlyMultiStore || (deal.competitors && deal.competitors.length > 0);

      return matchSearch && matchScore && matchCategory && matchStore && matchMultiStore;
    });
  }, [deals, searchTerm, filterScore, selectedCategory, selectedStore, onlyMultiStore]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 selection:bg-blue-600 selection:text-white">
      {/* Top Banner de Auditoría */}
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
      <header className="max-w-5xl mx-auto px-4 pt-8 pb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          Auditoría de Precios Independiente
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Radar de Ofertas Reales <span className="text-blue-500">Black Friday SV</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed">
          Compara precios reales entre <strong>Siman, Prado, Curacao, Omnisport y Walmart</strong>. Descubre si una rebaja es genuina o si inflaron el precio días antes.
        </p>

        {/* Resumen de Hallazgos en 4 Tarjetas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-4xl mx-auto mt-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">5 Tiendas</div>
            <div className="text-xs text-slate-400 mt-0.5">Auditoría diaria continua</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{stats.realPercent}% Reales</div>
            <div className="text-xs text-slate-400 mt-0.5">Rebajas verdaderas</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">{stats.inflatedPercent}% Infladas</div>
            <div className="text-xs text-slate-400 mt-0.5">Descuentos simulados</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
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
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl mb-6">
          {/* Caja de Búsqueda */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="¿Qué producto buscas? (ej: Smart TV 55, Galaxy S24, iPhone 15, Lavadora Mabe)..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-12 pr-10 py-3.5 text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Atajos Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3 text-xs">
            <span className="text-slate-400 flex items-center gap-1 mr-1 text-[11px] font-semibold uppercase">
              <Sparkles className="w-3 h-3 text-amber-400" /> Atajos:
            </span>
            {POPULAR_SEARCHES.map((item) => (
              <button
                key={item.label}
                onClick={() => setSearchTerm(item.query)}
                className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs"
              >
                {item.label}
              </button>
            ))}
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
              Todos los veredictos
            </button>
            <button
              onClick={() => setFilterScore('reales')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterScore === 'reales'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800/70 text-emerald-400 hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> 🟢 Solo Ofertas Reales
            </button>
            <button
              onClick={() => setFilterScore('falsa_oferta_inflada')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterScore === 'falsa_oferta_inflada'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-slate-800/70 text-rose-400 hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> 🔴 Ver Precios Inflados
            </button>
            <button
              onClick={() => setOnlyMultiStore(!onlyMultiStore)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                onlyMultiStore
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/70 text-indigo-300 hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Podio Cross-Store (2+ Tiendas)</span>
              {onlyMultiStore && <span className="bg-white/20 text-[10px] px-1.5 py-0.2 rounded-full font-mono">Activo</span>}
            </button>
          </div>

          {/* Filtro por Almacén */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2.5 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 mr-1 text-[11px] uppercase font-semibold flex items-center gap-1">
              <Store className="w-3 h-3 text-slate-400" /> Tienda:
            </span>
            {STORE_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setSelectedStore(chip.id)}
                className={`px-2.5 py-1 rounded-md transition-all text-xs ${
                  selectedStore === chip.id
                    ? 'bg-blue-900/60 border border-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:text-white bg-slate-950/60 hover:bg-slate-800 border border-slate-800/60'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Filtro por Categoría */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2.5 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 mr-1 text-[11px] uppercase font-semibold flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" /> Categoría:
            </span>
            {[
              { id: 'all', label: 'Todas las categorías' },
              { id: 'tv_audio', label: '📺 Smart TVs y Audio' },
              { id: 'smartphones', label: '📱 Celulares' },
              { id: 'computacion', label: '💻 Laptops y Computadoras' },
              { id: 'linea_blanca', label: '❄️ Línea Blanca' },
              { id: 'gaming', label: '🎮 Videojuegos y Consolas' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md transition-colors text-xs ${
                  selectedCategory === cat.id
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contador de Resultados */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="text-xs text-slate-300">
            Mostrando <span className="font-mono text-white font-bold">{filteredDeals.length}</span> ofertas auditadas
            {(searchTerm || filterScore !== 'all' || selectedCategory !== 'all' || selectedStore !== 'all' || onlyMultiStore) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterScore('all');
                  setSelectedCategory('all');
                  setSelectedStore('all');
                  setOnlyMultiStore(false);
                }}
                className="ml-3 text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Restablecer filtros
              </button>
            )}
          </div>
          <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-400" /> Monitoreo diario en tiendas salvadoreñas
          </div>
        </div>

        {/* Lista de Tarjetas de Productos */}
        {filteredDeals.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No encontramos resultados</h3>
            <p className="text-xs text-slate-400 mb-4">
              Prueba buscando con términos más generales como "TV", "Samsung", "iPhone" o selecciona otra tienda.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterScore('all');
                setSelectedCategory('all');
                setSelectedStore('all');
                setOnlyMultiStore(false);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all"
            >
              Ver todas las ofertas
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDeals.map((deal) => {
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

              // Cálculo de porcentaje de rebaja real sobre el costo normal en octubre
              const pctSavings = deal.baselinePrice30d > deal.currentPrice
                ? Math.round(((deal.baselinePrice30d - deal.currentPrice) / deal.baselinePrice30d) * 100)
                : 0;

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
                  <div className="flex flex-col md:flex-row gap-4 sm:gap-5 items-start">
                    {/* 1. Columna Imagen + Badge Flotante de Stock */}
                    <div className="w-full md:w-40 h-40 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative p-2 group">
                      {/* Badge Flotante de Stock en Tiempo Real */}
                      <div className="absolute top-2 left-2 z-10">
                        {deal.inStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 border border-emerald-600/80 text-emerald-300 shadow-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            En Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/90 border border-rose-600/80 text-rose-300 shadow-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                            Agotado
                          </span>
                        )}
                      </div>

                      {deal.imageUrl ? (
                        <img 
                          src={deal.imageUrl} 
                          alt={deal.title}
                          className="max-h-full max-w-full object-contain mx-auto transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="text-slate-600 text-center">
                          <Tag className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <span className="text-[10px] block">Sin foto disponible</span>
                        </div>
                      )}
                    </div>

                    {/* 2. Información Central y Veredicto Pericial */}
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

                      {/* Caja del Veredicto */}
                      <div className={`rounded-xl p-3 text-xs sm:text-sm font-medium flex items-start gap-2.5 mb-3 ${
                        isInflated ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' :
                        isGanga ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
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
                            {isInflated && '🔴 Veredicto: Cuidado — Precio Inflado'}
                            {isGood && '🟢 Veredicto: Descuento Real'}
                            {!isInflated && !isGanga && !isGood && '🟡 Veredicto: Mismo Precio de Siempre'}
                          </span>
                          <span className="leading-relaxed">{deal.verdictMessage}</span>
                        </div>
                      </div>

                      {/* Termómetro Gráfico de Ahorro Real */}
                      {deal.baselinePrice30d > 0 && (
                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 mb-3">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
                            <span>Precio Habitual: <strong className="text-slate-300 font-mono">${deal.baselinePrice30d.toFixed(2)}</strong></span>
                            {pctSavings > 0 ? (
                              <span className="text-emerald-400 font-bold font-mono">-{pctSavings}% de Rebaja Real</span>
                            ) : (
                              <span className="text-amber-400 font-medium font-mono">0% rebaja real</span>
                            )}
                            <span>Hoy: <strong className="text-white font-mono">${deal.currentPrice.toFixed(2)}</strong></span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                isInflated ? 'bg-rose-500' :
                                isGanga ? 'bg-emerald-500' :
                                isGood ? 'bg-blue-500' :
                                'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(Math.max(pctSavings, 12), 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Podio Visual Cross-Store (🥇 🥈 🥉 ❌) */}
                      {deal.competitors && deal.competitors.length > 0 && (
                        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-200 flex items-center gap-1.5">
                              <Trophy className="w-4 h-4 text-amber-400" />
                              Podio de Precios en El Salvador para este modelo:
                            </span>
                            {parseFloat(maxSavingsVsWorst) > 0 && (
                              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded-full font-bold">
                                Ahorro de hasta ${maxSavingsVsWorst} entre tiendas
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
                    <div className="w-full md:w-56 shrink-0 flex flex-col justify-between items-start md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
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

                      {/* Botón de Ficha Pericial Rápida */}
                      <button
                        onClick={() => setActiveModalDeal(deal)}
                        className="w-full text-left md:text-right text-xs text-blue-400 hover:text-blue-300 inline-flex items-center justify-start md:justify-end gap-1 font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver auditoría completa</span>
                      </button>

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
                        <span>{deal.inStock ? `Comprar en ${deal.store}` : 'Ver en tienda (Agotado)'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal / Ficha Pericial de Auditoría */}
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
              Ficha Técnica Pericial — Ley de Protección al Consumidor SV
            </div>

            <h2 className="text-xl font-bold text-white mb-4 pr-8">
              {activeModalDeal.title}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center flex items-center justify-center h-48">
                {activeModalDeal.imageUrl ? (
                  <img src={activeModalDeal.imageUrl} alt={activeModalDeal.title} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-slate-600 text-xs">Sin foto disponible</span>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Comercio</span>
                  <strong className="text-white text-sm">{activeModalDeal.store}</strong>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Código de Modelo (MPN)</span>
                  <strong className="text-blue-400 font-mono text-sm">{activeModalDeal.modelCode}</strong>
                  <span className="text-slate-500 block text-[10px] mt-0.5">Clave universal de fabricante para comparar precios</span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Estado de Inventario</span>
                  <span className={`font-bold ${activeModalDeal.inStock ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeModalDeal.inStock ? '🟢 Disponible para compra inmediata' : '🔴 Agotado en este almacén'}
                  </span>
                </div>
              </div>
            </div>

            {/* Veredicto Detallado */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-400" /> Veredicto Pericial Objetivado:
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeModalDeal.verdictMessage}
              </p>
            </div>

            <div className="flex gap-3">
              <a
                href={activeModalDeal.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <span>Ir al sitio oficial de {activeModalDeal.store}</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={() => setActiveModalDeal(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Legal */}
      <footer className="max-w-6xl mx-auto px-4 mt-16 pt-8 border-t border-slate-800 text-center text-xs text-slate-400 space-y-2">
        <p className="font-medium text-slate-300">
          Radar de Ofertas Reales Black Friday El Salvador 2026 — Iniciativa ciudadana e independiente.
        </p>
        <p className="max-w-3xl mx-auto leading-relaxed text-slate-400 text-[11px]">
          Precios auditados diariamente de forma automática de los sitios web públicos de cada almacén. En apego a los Artículos 31 y 32 de la Ley de Protección al Consumidor de El Salvador sobre la veracidad de la publicidad y ofertas comerciales.
        </p>
      </footer>
    </div>
  );
}
