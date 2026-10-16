import React from 'react';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'info' | 'warning';
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  if (!message) return null;

  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="bg-slate-900 border border-slate-700/80 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md">
        {type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
        {type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
        {type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
        <span>{message}</span>
      </div>
    </div>
  );
};
