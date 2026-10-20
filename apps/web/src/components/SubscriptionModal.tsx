import { useEffect, useId, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Dialog } from './Dialog';
import { money, type DealItem } from '../lib/deals';
import { CATEGORY_LABELS } from '../../../../packages/notifications/src/contracts';

export function SubscriptionModal({ product, onClose }: { product: DealItem | null; onClose: () => void }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [target, setTarget] = useState(product ? Math.max(0.01, Math.floor(product.currentPrice * 90) / 100).toFixed(2) : '');
  const [newsletter, setNewsletter] = useState(!product);
  const [categories, setCategories] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    fetch('/api/subscriptions/config', { signal: controller.signal })
      .then(response => response.ok ? response.json() : { enabled: false })
      .then(data => setAvailable(data.enabled === true))
      .catch(() => setAvailable(false))
      .finally(() => clearTimeout(timer));
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!available || state === 'sending') return;
    setState('sending'); setError('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent, newsletter, categories, maxBudget: budget ? Number(budget) : null,
          alert: product ? { productId: product.id, targetPrice: Number(target) } : null, website }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No pudimos guardar tu solicitud.');
      setState('sent');
    } catch (error) {
      setError(error instanceof Error && error.name !== 'AbortError' ? error.message : 'La solicitud tardó demasiado. Revisa tu correo antes de volver a intentarlo.');
      setState('idle');
    } finally { clearTimeout(timer); }
  }

  return (
    <Dialog onClose={onClose} labelledBy={`${id}-title`} className="subscription-modal">
      <header className="modal-header">
        <h2 id={`${id}-title`} tabIndex={-1} autoFocus>{product ? 'Avísame cuando baje' : 'Ofertas según tus intereses'}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Cerrar suscripción"><X aria-hidden="true" /></button>
      </header>
      <div className="modal-body subscription-body">
        {state === 'sent' ? (
          <div role="status" className="subscription-result">
            <h3>Revisa tu correo</h3>
            <p>Abre el mensaje de BlackFridaySV y confirma los avisos. Hasta entonces no estarán activos. El enlace vence en 24 horas.</p>
            <p>Si no lo ves, revisa spam. Puedes cerrar esta ventana.</p>
            <button className="btn btn-primary" onClick={onClose}>Volver al catálogo</button>
          </div>
        ) : (
          <form onSubmit={submit} className="subscription-form">
            {product ? <p className="subscription-product"><strong>{product.title}</strong><span>Último precio capturado: {money(product.currentPrice)}</span></p>
              : <p>Recibe un resumen cuando encontremos bajadas de precio que encajen contigo. Como máximo uno al día.</p>}
            {available === null && <p role="status">Comprobando disponibilidad de los avisos…</p>}
            {available === false && <p role="status" className="subscription-notice">Los avisos por correo aún no están disponibles. Puedes explorar las opciones; todavía no se guardará tu correo. Mientras tanto, usa Guardados.</p>}
            <label htmlFor={`${id}-email`}>Tu correo<input id={`${id}-email`} type="email" autoComplete="email" inputMode="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" /></label>
            {product && <label htmlFor={`${id}-target`}>Avísame si cuesta esta cantidad o menos (USD)<input id={`${id}-target`} type="number" inputMode="decimal" step="0.01" min="0.01" max="1000000" required value={target} onChange={e => setTarget(e.target.value)} /></label>}
            {product && <label className="subscription-check"><input type="checkbox" checked={newsletter} onChange={e => setNewsletter(e.target.checked)} /><span>También quiero un resumen de otras ofertas según mis intereses.</span></label>}
            {newsletter && <>
              <fieldset className="subscription-categories">
                <legend>Categorías que te interesan <small>Sin selección, incluimos todas.</small></legend>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => <label key={key} className="subscription-check"><input type="checkbox" checked={categories.includes(key)} onChange={e => setCategories(current => e.target.checked ? [...current, key] : current.filter(c => c !== key))} /><span>{label}</span></label>)}
              </fieldset>
              <label htmlFor={`${id}-budget`}>Presupuesto máximo (opcional, USD)<input id={`${id}-budget`} type="number" inputMode="decimal" step="0.01" min="0.01" max="1000000" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Sin límite" /></label>
            </>}
            <div className="subscription-honeypot" aria-hidden="true"><label>Sitio web<input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
            <label className="subscription-check"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Quiero recibir los avisos seleccionados y acepto que BlackFridaySV guarde mi correo e intereses para enviarlos.</span></label>
            <p className="subscription-small">Sin cuenta ni contraseña. Puedes dar de baja todos los avisos desde cada correo. <a href="/#privacidad" target="_blank" rel="noopener noreferrer">Ver privacidad (otra pestaña)</a>.</p>
            {error && <p role="alert" className="subscription-error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={!available || state === 'sending'}>{state === 'sending' ? 'Enviando confirmación…' : 'Enviar correo de confirmación'}</button>
            {product && <p className="subscription-small">Puedes seguir hasta 20 productos. Comparamos el precio publicado en esta tienda, sin envío. Recibirás como máximo un resumen al día si cumple tu objetivo, y otro sólo si vuelve a bajar.</p>}
          </form>
        )}
      </div>
    </Dialog>
  );
}
