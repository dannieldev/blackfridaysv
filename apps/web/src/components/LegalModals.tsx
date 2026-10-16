import React from 'react';
import { 
  Scale, 
  ShieldCheck, 
  Lock, 
  FileText, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Server, 
  EyeOff, 
  Database
} from 'lucide-react';

export type LegalModalType = 'terminos' | 'metodologia' | 'privacidad' | null;

interface LegalModalsProps {
  type: LegalModalType;
  onClose: () => void;
  onSelectTab: (tab: 'terminos' | 'metodologia' | 'privacidad') => void;
}

export const LegalModals: React.FC<LegalModalsProps> = ({ type, onClose, onSelectTab }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Tabs */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0 pr-8">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400">
              {type === 'terminos' && <Scale className="w-5 h-5" />}
              {type === 'metodologia' && <ShieldCheck className="w-5 h-5" />}
              {type === 'privacidad' && <Lock className="w-5 h-5" />}
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Marco Institucional y Transparencia
              </h2>
              <p className="text-[11px] text-slate-400">
                Radar de Ofertas Reales Black Friday El Salvador 2026
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800/80 gap-2 pt-3 pb-2 shrink-0 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => onSelectTab('terminos')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              type === 'terminos'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Aviso Legal y Descargo</span>
          </button>

          <button
            onClick={() => onSelectTab('metodologia')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              type === 'metodologia'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Metodología y Legalidad</span>
          </button>

          <button
            onClick={() => onSelectTab('privacidad')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              type === 'privacidad'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacidad y Cookies</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto pr-1 sm:pr-2 py-4 space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* TAB 1: TÉRMINOS Y DESCARGO DE RESPONSABILIDAD */}
          {type === 'terminos' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-blue-400" /> 1. Naturaleza Cívica e Independiente
                </h3>
                <p>
                  <strong>Radar Black Friday El Salvador</strong> es una plataforma ciudadana, tecnológica e independiente, desarrollada sin fines comerciales ni publicitarios. Su propósito exclusivo es la <strong>educación del consumidor</strong>, la transparencia de precios y el fomento de un comercio electrónico justo en la República de El Salvador.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> 2. Descargo de Responsabilidad sobre Precios y Stock (Disclaimer)
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                  <li>
                    <strong>Precios dinámicos:</strong> Los precios, fotografías, ofertas y disponibilidad de inventario mostrados son recopilados en momentos específicos desde fuentes públicas. Cada almacén se reserva el derecho unilateral de modificar sus precios o agotar existencias en cualquier momento sin previo aviso.
                  </li>
                  <li>
                    <strong>Ausencia de intermediación comercial:</strong> Esta plataforma no vende productos, no procesa pagos, no percibe comisiones de afiliación y no gestiona entregas. La relación contractual de compraventa se celebra exclusivamente entre el usuario comprador y el almacén respectivo.
                  </li>
                  <li>
                    <strong>Exención de responsabilidad:</strong> Los desarrolladores y administradores de este proyecto quedan expresamente liberados de toda responsabilidad civil, comercial o de cualquier otra índole por discrepancias de precios al momento de la compra efectiva, cancelaciones de órdenes por parte de los almacenes, errores u omisiones tipográficas en los sitios web de origen, o fallas en dispositivos de terceros.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-400" /> 3. Uso Referencial Nominativo de Marcas Comerciales
                </h3>
                <p>
                  Los nombres de almacenes (<em>Siman, La Curacao, Almacenes Prado, Omnisport, Walmart</em>) y de fabricantes (<em>Samsung, LG, Sony, Apple, Mabe, TCL, HP</em>, entre otros) se mencionan al amparo de la doctrina del <strong>Uso Referencial Nominativo (Nominative Fair Use)</strong> y la legislación aplicable en materia de Propiedad Intelectual. Su inclusión obedece al único propósito de identificar objetivamente el origen y procedencia de las ofertas registradas, sin atribuirse autoría, propiedad, patrocinio ni vínculo asociativo alguno con sus titulares legítimos.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: METODOLOGÍA Y TÉCNICAS DE SCRAPING */}
          {type === 'metodologia' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1. Datos 100% Públicos en Escaparate Web
                </h3>
                <p>
                  Toda la información contenida en el radar proviene de <strong>catálogos de acceso público irrestricto</strong>. No se accede a bases de datos privadas, no se sortean sistemas de autenticación, no se vulneran contraseñas ni se interactúa con información de usuarios o compradores. Es el equivalente digital a verificar los precios expuestos en las vitrinas físicas de un centro comercial.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-blue-400" /> 2. Técnicas de Extracción Ética y de Bajo Impacto
                </h3>
                <p className="mb-2">
                  La infraestructura de recolección de datos sigue las mejores prácticas internacionales de rastreo responsable:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                  <li>
                    <strong>Tasa limitada (Rate-Limiting):</strong> Peticiones controladas con intervalos de espera y reintentos exponenciales para <em>garantizar un impacto nulo (0% de sobrecarga)</em> en los servidores de los comercios.
                  </li>
                  <li>
                    <strong>Peticiones HTTP GET estándar:</strong> Se consultan únicamente las rutas públicas de catálogo ya expuestas a los navegadores web convencionales (VTEX en Siman y Walmart, Magento en Curacao y Prado, Laravel en Omnisport).
                  </li>
                  <li>
                    <strong>Cero ataques DoS:</strong> Prohibición estricta de concurrencia agresiva o técnicas de denegación de servicio.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-400" /> 3. Respaldo Jurídico en El Salvador e Internacional
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                  <li>
                    <strong>Ley de Protección al Consumidor (Decreto 776):</strong> Los <strong>Artículos 31 y 32</strong> sancionan la publicidad engañosa y establecen que cualquier precio regular anunciado como rebaja debe corresponder al precio efectivamente cobrado en los 30 días anteriores. Esta plataforma opera como una herramienta cívica para el cumplimiento de este derecho ciudadano.
                  </li>
                  <li>
                    <strong>Ley Especial contra Delitos Informáticos y Conexos (Decreto 260):</strong> La consulta a páginas web y recursos informáticos abiertos al público en internet no tipifica delito de acceso indebido ni espionaje informático.
                  </li>
                  <li>
                    <strong>Precedente Internacional:</strong> La Corte de Apelaciones del 9no Circuito de EE.UU. (*hiQ Labs v. LinkedIn*) ratificó que la recopilación automatizada de datos accesibles públicamente en la web sin credenciales de inicio de sesión no constituye violación a sistemas informáticos.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-400" /> 4. Semáforo de Ofertas y Fórmula de Detección
                </h3>
                <p>
                  El sistema registra la <strong>línea base de precios durante todo el mes de octubre</strong>. Si una tienda incrementa el precio regular anunciado durante los 15-20 días previos a Black Friday para fingir un porcentaje de descuento mayor, el algoritmo lo clasifica automáticamente como <strong>🔴 Falsa Oferta Inflada</strong>. Si el precio actual es menor al promedio histórico de 30 días con al menos 15% de descuento real, se cataloga como <strong>🟢 Ganga Histórica</strong>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACIDAD, COOKIES Y CIBERSEGURIDAD */}
          {type === 'privacidad' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <EyeOff className="w-4 h-4 text-emerald-400" /> 1. Cero Recolección de Datos Personales
                </h3>
                <p>
                  Esta plataforma no solicita, no almacena y no procesa ningún tipo de dato personal. No existen cuentas de usuario, formularios de registro, campos de correo electrónico, números telefónicos ni solicitudes de datos bancarios o tarjetas de crédito. Tu navegación es completamente anónima.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-400" /> 2. Política de Cookies y Almacenamiento Local
                </h3>
                <p className="mb-2">
                  Nos oponemos al rastreo invasivo:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                  <li>
                    <strong>Sin cookies de rastreo publicitario:</strong> No utilizamos cookies de terceros para crear perfiles comerciales ni vendemos datos a intermediarios de publicidad.
                  </li>
                  <li>
                    <strong>Almacenamiento técnico local (localStorage):</strong> Únicamente se utiliza la memoria local de tu propio navegador para recordar preferencias visuales (como si prefieres ver los productos en cuadrícula o lista compacta). Esta información nunca sale de tu dispositivo.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> 3. Arquitectura y Ciberseguridad Blindada
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                  <li>
                    <strong>Protección perimetral de Cloudflare:</strong> Conexión forzada bajo HTTPS con cifrado TLS 1.3 de grado bancario, protección DDoS activa y mitigación automática contra tráfico malicioso.
                  </li>
                  <li>
                    <strong>Inmunidad contra Inyecciones SQL (SQLi):</strong> La aplicación no ejecuta concatenación dinámica de consultas en el cliente. La base de datos Supabase cuenta con <strong>Row Level Security (RLS)</strong> estricto: los usuarios anónimos tienen permiso exclusivamente de lectura sobre el catálogo sanitizado, imposibilitando cualquier alteración no autorizada.
                  </li>
                  <li>
                    <strong>Arquitectura Edge & Snapshot Estático:</strong> Las solicitudes de los usuarios son servidas a través de un archivo estático indexado en la red de borde de Cloudflare, garantizando alta disponibilidad sin exponer endpoints de base de datos a explotación externa.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            Vigencia: Campaña Black Friday 2026
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
