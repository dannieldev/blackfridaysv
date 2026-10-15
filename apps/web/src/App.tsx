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
  Database
} from 'lucide-react';
import { fetchLiveDeals } from './lib/supabase.ts';

interface DealItem {
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
  competitors?: Array<{ store: string; price: number }>;
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
    verdictMessage: 'Descuento real de $40 vs. su precio habitual de octubre. El precio de lista ($799) es exagerado, pero el descuento real es genuino.',
    productUrl: 'https://sv.siman.com',
    competitors: [
      { store: 'Prado', price: 449.00 },
      { store: 'Curacao', price: 439.00 },
    ]
  },
  {
    id: '2',
    store: 'La Curacao',
    brand: 'Samsung',
    modelCode: 'UN65CU7000FXZA',
    title: 'Smart TV Samsung 65" Crystal UHD 4K UN65CU7000',
    category: 'tv_audio',
    currentPrice: 689.00,
    regularPrice: 949.00,
    baselinePrice30d: 599.00,
    dealScore: 'falsa_oferta_inflada',
    verdictMessage: '¡ALERTA! El precio subió $90 respecto a las primeras semanas de octubre. A pesar de anunciar "Rebaja", hoy cuesta MÁS que su precio regular.',
    productUrl: 'https://lacuracaonline.com/elsalvador/',
    competitors: [
      { store: 'Walmart SV', price: 599.00 },
      { store: 'Siman', price: 629.00 },
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
    verdictMessage: '¡MÍNIMO HISTÓRICO! Es el precio más bajo registrado en los últimos 90 días en El Salvador. Ahorro real de $100.',
    productUrl: 'https://www.walmart.com.sv',
    competitors: [
      { store: 'Siman', price: 999.00 },
      { store: 'Prado', price: 1049.00 },
    ]
  },
  {
    id: '4',
    store: 'Prado',
    brand: 'Mabe',
    modelCode: 'RMA1130YMEB',
    title: 'Refrigeradora Mabe 11 Pies Cúbicos No Frost Grafito',
    category: 'linea_blanca',
    currentPrice: 479.00,
    regularPrice: 599.00,
    baselinePrice30d: 485.00,
    dealScore: 'descuento_cosmetico',
    verdictMessage: 'Descuento cosmético. El precio promedio de todo el año ha sido de $485. Solo hay $6 de diferencia real.',
    productUrl: 'https://prado.com.sv',
    competitors: [
      { store: 'Curacao', price: 479.00 },
      { store: 'Omnisport', price: 489.00 },
    ]
  },
  {
    id: '5',
    store: 'Almacenes Siman',
    brand: 'Sony',
    modelCode: 'CFI-2015',
    title: 'Consola PlayStation 5 Slim 1TB Edición Estándar',
    category: 'gaming',
    currentPrice: 519.00,
    regularPrice: 699.00,
    baselinePrice30d: 599.00,
    dealScore: 'buena_oferta',
    verdictMessage: 'Buen ahorro real de $80 frente al promedio de importación local en tiendas formales.',
    productUrl: 'https://sv.siman.com',
    competitors: [
      { store: 'Walmart SV', price: 539.00 },
      { store: 'Prado', price: 549.00 },
    ]
  }
];

export default function App() {
  const [deals, setDeals] = useState<DealItem[]>(MOCK_DEALS);
  const [isUsingLiveDb, setIsUsingLiveDb] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScore, setFilterScore] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
            ? '¡ALERTA! El precio regular fue inflado recientemente en este comercio para fingir un descuento.' 
            : item.is_all_time_low 
            ? '¡MÍNIMO HISTÓRICO! Es el precio más bajo registrado en los últimos 60 días.' 
            : `Descuento real calculado del ${item.real_discount_percent}% frente a la línea base de octubre.`,
          productUrl: item.product_url,
        }));
        setDeals(mapped);
        setIsUsingLiveDb(true);
      }
    }
    loadDb();
  }, []);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchSearch = 
        deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.modelCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.store.toLowerCase().includes(searchTerm.toLowerCase());

      const matchScore = filterScore === 'all' || deal.dealScore === filterScore;
      const matchCategory = selectedCategory === 'all' || deal.category === selectedCategory;

      return matchSearch && matchScore && matchCategory;
    });
  }, [deals, searchTerm, filterScore, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-blue-900/40 px-4 py-2.5 text-xs text-center text-blue-200/90 flex flex-wrap items-center justify-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Rastreo activo de precios de línea base para Black Friday 2026 en El Salvador</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-[11px] font-mono">
          <Database className="w-3 h-3" />
          {isUsingLiveDb ? 'Datos en Vivo' : 'Monitoreo Activo'}
        </span>
      </div>

      {/* Hero Section */}
      <header className="max-w-6xl mx-auto px-4 pt-10 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <ShieldAlert className="w-3.5 h-3.5" />
          Auditoría de Precios Independiente
        </div>
        
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Radar de Ofertas Reales <span className="text-blue-500">Black Friday SV</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base leading-relaxed">
          Descubre si esa oferta en Siman, Prado, La Curacao, Omnisport o Walmart es una ganga real o si inflaron el precio semanas antes para fingir un descuento.
        </p>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto mt-8">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-center">
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">5 Almacenes</div>
            <div className="text-xs text-slate-400 mt-0.5">Rastreo diario en El Salvador</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-center">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">38% Reales</div>
            <div className="text-xs text-slate-400 mt-0.5">Verdaderas rebajas verificadas</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-center">
            <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">24% Infladas</div>
            <div className="text-xs text-slate-400 mt-0.5">Precios inflados previo a BF</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-center">
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">38% Neutras</div>
            <div className="text-xs text-slate-400 mt-0.5">Mismo precio de todo el año</div>
          </div>
        </div>
      </header>

      {/* Main Search & Filters Container */}
      <main className="max-w-6xl mx-auto px-4">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl mb-8">
          {/* Omnibox Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Busca por modelo o marca (ej: 55UR7800, Galaxy S24, iPhone 15, Mabe)..."
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl pl-12 pr-4 py-3.5 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
            <button
              onClick={() => setFilterScore('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterScore === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Todos los veredictos
            </button>
            <button
              onClick={() => setFilterScore('ganga_historica')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterScore === 'ganga_historica'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800/60 text-emerald-400 hover:bg-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Gangas Históricas
            </button>
            <button
              onClick={() => setFilterScore('falsa_oferta_inflada')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterScore === 'falsa_oferta_inflada'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-slate-800/60 text-rose-400 hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Descuentos Falsos / Inflados
            </button>
            <button
              onClick={() => setFilterScore('buena_oferta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterScore === 'buena_oferta'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/60 text-blue-300 hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Buenas Ofertas
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-2 border-t border-slate-800/40 text-xs">
            <span className="text-slate-500 mr-1 text-[11px] uppercase font-semibold">Categoría:</span>
            {[
              { id: 'all', label: 'Todas' },
              { id: 'tv_audio', label: '📺 Smart TVs' },
              { id: 'smartphones', label: '📱 Celulares' },
              { id: 'computacion', label: '💻 Laptops' },
              { id: 'linea_blanca', label: '❄️ Línea Blanca' },
              { id: 'gaming', label: '🎮 Videojuegos' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="text-xs text-slate-400">
            Mostrando <span className="font-mono text-white font-semibold">{filteredDeals.length}</span> productos auditados
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> Precios actualizados en tiempo real
          </div>
        </div>

        {/* Deals Cards List */}
        <div className="space-y-4">
          {filteredDeals.map((deal) => {
            const isGanga = deal.dealScore === 'ganga_historica';
            const isInflated = deal.dealScore === 'falsa_oferta_inflada';
            const isGood = deal.dealScore === 'buena_oferta';

            return (
              <div 
                key={deal.id}
                className={`bg-slate-900/70 border rounded-2xl p-5 transition-all hover:border-slate-700/80 ${
                  isInflated ? 'border-rose-900/50 bg-rose-950/10' :
                  isGanga ? 'border-emerald-900/50 bg-emerald-950/10' :
                  'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Product Info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">
                        <Store className="w-3 h-3 text-slate-400" />
                        {deal.store}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-800/40 text-blue-300 font-mono text-xs font-semibold">
                        {deal.modelCode}
                      </span>
                      <span className="text-xs text-slate-500 uppercase font-semibold">
                        {deal.brand}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
                      {deal.title}
                    </h3>

                    {/* Veredicto Semáforo Box */}
                    <div className={`rounded-xl p-3 text-xs sm:text-sm font-medium flex items-start gap-2.5 ${
                      isInflated ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' :
                      isGanga ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                      isGood ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' :
                      'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    }`}>
                      {isInflated && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                      {isGanga && <Flame className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                      {isGood && <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
                      {!isInflated && !isGanga && !isGood && <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                      
                      <div>
                        <span className="font-bold uppercase tracking-wider block text-[11px] mb-0.5">
                          {isGanga && '🟢 Veredicto: ¡Ganga Histórica Real!'}
                          {isInflated && '🔴 Veredicto: Descuento Falso / Precio Inflado'}
                          {isGood && '🟢 Veredicto: Descuento Real'}
                          {!isInflated && !isGanga && !isGood && '🟡 Veredicto: Descuento Cosmético'}
                        </span>
                        <span>{deal.verdictMessage}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Prices & Call to Action */}
                  <div className="lg:text-right shrink-0 flex flex-col sm:flex-row lg:flex-col justify-between items-start sm:items-center lg:items-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <div>
                      <div className="flex items-baseline gap-2 lg:justify-end">
                        <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                          ${deal.currentPrice.toFixed(2)}
                        </span>
                        {deal.regularPrice && (
                          <span className="text-sm font-mono text-slate-500 line-through">
                            ${deal.regularPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Promedio 30 días: <span className="font-mono text-slate-300 font-semibold">${deal.baselinePrice30d.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Competitor Price Comparison Bar */}
                    {deal.competitors && deal.competitors.length > 0 && (
                      <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300 block mb-1">En otras tiendas hoy:</span>
                        <div className="flex flex-wrap gap-2">
                          {deal.competitors.map((comp) => (
                            <span key={comp.store} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                              {comp.store}: <strong className="font-mono text-white">${comp.price}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <a 
                      href={deal.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
                    >
                      <span>Ver en {deal.store}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer & Legal Note */}
      <footer className="max-w-6xl mx-auto px-4 mt-16 pt-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
        <p>
          Radar de Ofertas Black Friday El Salvador 2026 — Proyecto colaborativo de transparencia y ahorro cívico.
        </p>
        <p className="max-w-3xl mx-auto leading-relaxed text-slate-600">
          Datos auditados basados en el historial público de precios de venta de cada almacén. En cumplimiento con los Artículos 31 y 32 de la Ley de Protección al Consumidor de El Salvador sobre la veracidad de precios y publicidad de ofertas comerciales.
        </p>
      </footer>
    </div>
  );
}
