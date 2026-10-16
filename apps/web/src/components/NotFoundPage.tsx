import React from 'react';
import { ShieldAlert, ArrowLeft, Search, Database } from 'lucide-react';

interface NotFoundPageProps {
  onReturnHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onReturnHome }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-blue-900/40 px-4 py-2 text-xs text-center text-blue-200/90 flex items-center justify-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        <span>Ruta no encontrada en el Radar de Ofertas Black Friday SV</span>
      </div>

      <main className="max-w-lg mx-auto px-4 py-16 text-center flex-1 flex flex-col items-center justify-center">
        {/* Radar 404 Visual Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
            <Search className="w-10 h-10 text-blue-400 opacity-60" />
          </div>
          <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono text-xs font-bold">
            404
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
          Página no encontrada
        </h1>

        <p className="text-sm text-slate-400 mb-8 leading-relaxed max-w-sm">
          La dirección que intentas consultar no existe o fue reubicada. Puedes volver al catálogo de ofertas auditadas de El Salvador.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            onClick={onReturnHome}
            className="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Radar</span>
          </button>
        </div>

        <div className="mt-12 text-slate-600 text-xs flex items-center gap-1.5 font-mono">
          <Database className="w-3.5 h-3.5" />
          <span>Almacenes auditados: Siman • Prado • Curacao • Omnisport • Walmart</span>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-600 border-t border-slate-900">
        Radar Black Friday El Salvador 2026 • Iniciativa Ciudadana Independiente
      </footer>
    </div>
  );
};
