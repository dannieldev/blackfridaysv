import { Check, Info, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'info' | 'warning';
  onClose?: () => void;
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  const Icon = type === 'success' ? Check : type === 'warning' ? AlertTriangle : Info;

  return (
    <div className={`toast${message ? ' is-visible' : ''}`} data-type={type} role="status" aria-live="polite" aria-atomic="true">
      {message && <><Icon size={18} aria-hidden="true" /><span>{message}</span>{onClose && <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar notificación"><X size={16} aria-hidden="true" /></button>}</>}
    </div>
  );
}
