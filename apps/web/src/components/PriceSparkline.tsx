import { TrendingDown, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DealItem } from '../App';

interface PriceSparklineProps {
  deal: DealItem;
  compact?: boolean;
}

export function PriceSparkline({ deal, compact = false }: PriceSparklineProps) {
  const isInflated = deal.dealScore === 'falsa_oferta_inflada';
  const isGanga = deal.dealScore === 'ganga_historica';
  const isGood = deal.dealScore === 'buena_oferta';

  // Hitos de precios para el cálculo del gráfico
  const p1 = deal.baselinePrice30d || deal.currentPrice; // Septiembre
  let p2 = p1; // Octubre (30 días antes)
  if (isInflated) {
    p2 = deal.regularPrice && deal.regularPrice > p1 ? deal.regularPrice : p1 * 1.22;
  } else if (deal.regularPrice && deal.regularPrice > deal.currentPrice) {
    p2 = p1;
  }
  const p3 = deal.currentPrice; // Hoy

  // Normalización para el canvas SVG (ancho: 160, alto: 44, margen Y: 6 a 38)
  const prices = [p1, p2, p3];
  const minPrice = Math.min(...prices) * 0.95;
  const maxPrice = Math.max(...prices) * 1.05;
  const range = maxPrice - minPrice || 1;

  const getY = (val: number) => {
    const norm = (val - minPrice) / range;
    // Invertir porque Y=0 es la parte superior
    return Math.round(38 - norm * 30);
  };

  const y1 = getY(p1);
  const y2 = getY(p2);
  const y3 = getY(p3);

  const x1 = 14;
  const x2 = 80;
  const x3 = 146;

  // Path de la línea suave
  const pathD = `M ${x1} ${y1} Q 47 ${(y1 + y2) / 2}, ${x2} ${y2} T ${x3} ${y3}`;
  // Path del área sombreada
  const areaD = `${pathD} L ${x3} 42 L ${x1} 42 Z`;

  const strokeColor = isInflated ? '#f43f5e' : isGanga ? '#10b981' : isGood ? '#3b82f6' : '#f59e0b';

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800/80 rounded-lg px-2 py-1">
        <svg className="w-20 h-6 shrink-0 overflow-visible" viewBox="0 0 160 44">
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={x1} cy={y1} r="3" fill="#94a3b8" />
          <circle cx={x2} cy={y2} r={isInflated ? '4.5' : '3'} fill={isInflated ? '#f43f5e' : '#94a3b8'} />
          <circle cx={x3} cy={y3} r="4" fill={strokeColor} />
        </svg>
        <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
          {isInflated ? (
            <span className="text-rose-400 font-bold">⚠️ Pico inflado</span>
          ) : isGanga ? (
            <span className="text-emerald-400 font-bold">📉 Mínimo anual</span>
          ) : (
            <span>Evolución 60d</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
          {isInflated ? (
            <span className="inline-flex items-center gap-1 text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Detección de Subida Artificial (Evolución 60 días)</span>
            </span>
          ) : isGanga ? (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Precio Mínimo Histórico Verificado (Evolución 60 días)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-blue-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Historial de Precios Auditado (Evolución 60 días)</span>
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
          Referencia: Art. 31 LPC SV
        </span>
      </div>

      <div className="relative">
        <svg className="w-full h-14 overflow-visible" viewBox="0 0 160 44" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`sparkGrad-${deal.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Área sombreada */}
          <path d={areaD} fill={`url(#sparkGrad-${deal.id})`} />

          {/* Línea de tendencia */}
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Punto 1: Septiembre */}
          <circle cx={x1} cy={y1} r="3" fill="#64748b" />

          {/* Punto 2: Octubre */}
          <circle 
            cx={x2} 
            cy={y2} 
            r={isInflated ? '4.5' : '3'} 
            fill={isInflated ? '#f43f5e' : '#64748b'} 
          />

          {/* Punto 3: Hoy */}
          <circle cx={x3} cy={y3} r="4" fill={strokeColor} />
        </svg>

        {/* Etiquetas de los 3 hitos temporales */}
        <div className="flex items-center justify-between text-[10px] font-mono mt-1 text-slate-400 pt-1 border-t border-slate-900">
          <div>
            <span className="block text-slate-500 text-[9px] uppercase">Septiembre</span>
            <span className="text-slate-300 font-semibold">${p1.toFixed(0)}</span>
          </div>
          <div className="text-center">
            <span className="block text-slate-500 text-[9px] uppercase">Octubre (-30d)</span>
            <span className={`font-semibold ${isInflated ? 'text-rose-400' : 'text-slate-300'}`}>
              ${p2.toFixed(0)} {isInflated && '↑'}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-slate-500 text-[9px] uppercase">Hoy (Black Friday)</span>
            <span className={`font-bold ${isInflated ? 'text-rose-400' : isGanga ? 'text-emerald-400' : 'text-blue-400'}`}>
              ${p3.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
