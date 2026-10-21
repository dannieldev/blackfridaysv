import { SIGNALS, type OfferSignal, type SignalLevel } from '../lib/offerSignal';

export function SignalBadge({ signal, explain = false }: { signal: OfferSignal; explain?: boolean }) {
  return <div className={`offer-signal signal-${signal.level}`}>
    <span className="signal-label"><span className="signal-dot" aria-hidden="true" />{SIGNALS.find(s => s.id === signal.level)!.label}</span>
    {explain && <p>{signal.reason}</p>}
  </div>;
}

export function OfferSignals({ selected, counts, onSelect, loading }: {
  selected: SignalLevel | 'all'; counts: Record<SignalLevel, number>; onSelect: (level: SignalLevel | 'all') => void; loading: boolean;
}) {
  return <section className="offer-signals" aria-label="Filtrar ofertas por semáforo">
    <div className="signal-options">
      {SIGNALS.map(signal => <button key={signal.id} className={`signal-option signal-${signal.id}${selected === signal.id ? ' selected' : ''}`}
        aria-pressed={selected === signal.id} onClick={() => onSelect(selected === signal.id ? 'all' : signal.id)} disabled={loading}>
        <span className="signal-option-top"><span className="signal-dot" aria-hidden="true" /><strong>{signal.label}</strong>{' '}<span className="signal-count">{loading ? '—' : counts[signal.id]}</span></span>
      </button>)}
    </div>
    {selected !== 'all' && <button className="text-button signal-reset" onClick={() => onSelect('all')}>Ver todas las señales</button>}
  </section>;
}
