import { useEffect, useMemo, useState } from 'react';
import { Dialog } from './Dialog';
import { Radar, X, Check, Sparkles, RotateCcw } from 'lucide-react';
import {
  DEFAULT_RADAR_PREFERENCES,
  matchesRadar,
  saveRadarPreferences,
  type RadarPreferences,
} from '../lib/radar';
import type { DealItem } from '../lib/deals';

export {
  DEFAULT_RADAR_PREFERENCES,
  loadRadarPreferences,
  saveRadarPreferences,
  matchesRadar,
  type RadarPreferences,
} from '../lib/radar';

interface PersonalRadarProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: RadarPreferences;
  onSave: (prefs: RadarPreferences) => void;
  availableStores: readonly string[];
  totalCatalogCount: number;
  matchingCount: number;
  deals?: DealItem[];
}

const RADAR_CATEGORIES = [
  { id: 'tv_audio', label: 'Televisores y Audio' },
  { id: 'computacion', label: 'Computadoras y Laptops' },
  { id: 'smartphones', label: 'Celulares y Telefonía' },
  { id: 'linea_blanca', label: 'Línea Blanca y Hogar' },
  { id: 'gaming', label: 'Consolas y Gaming' },
  { id: 'moda_calzado', label: 'Moda y Calzado' },
  { id: 'fotografia', label: 'Fotografía' },
] as const;

const BUDGET_OPTIONS = [
  { label: 'Cualquiera', value: null },
  { label: 'Hasta $150', value: 150 },
  { label: 'Hasta $300', value: 300 },
  { label: 'Hasta $600', value: 600 },
  { label: 'Hasta $1,200', value: 1200 },
] as const;

export function PersonalRadarModal({
  isOpen,
  onClose,
  preferences,
  onSave,
  availableStores,
  totalCatalogCount,
  matchingCount,
  deals,
}: PersonalRadarProps) {
  const [draft, setDraft] = useState<RadarPreferences>(preferences);

  useEffect(() => {
    if (isOpen) {
      setDraft(preferences);
    }
  }, [isOpen, preferences]);

  const liveMatches = useMemo(() => {
    if (!deals) return matchingCount;
    return deals.filter((deal) => matchesRadar(deal, { ...draft, enabled: true })).length;
  }, [deals, draft, matchingCount]);

  if (!isOpen) return null;

  const toggleCategory = (categoryId: string) => {
    setDraft((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((c) => c !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const toggleStore = (store: string) => {
    setDraft((prev) => ({
      ...prev,
      stores: prev.stores.includes(store)
        ? prev.stores.filter((s) => s !== store)
        : [...prev.stores, store],
    }));
  };

  const handleActivate = () => {
    const updated: RadarPreferences = { ...draft, enabled: true };
    saveRadarPreferences(updated);
    onSave(updated);
    onClose();
  };

  const handleDisable = () => {
    const updated: RadarPreferences = { ...draft, enabled: false };
    saveRadarPreferences(updated);
    onSave(updated);
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_RADAR_PREFERENCES);
  };

  return (
    <Dialog onClose={onClose} labelledBy="personal-radar-title" className="radar-modal-shell">
      <div className="radar-modal-content">
        <header className="radar-modal-header">
          <div className="radar-header-icon">
            <Radar aria-hidden="true" />
          </div>
          <div>
            <h2 id="personal-radar-title">Configura tu Presupuesto y Categorías</h2>
            <p>
              Elige tu presupuesto máximo y las categorías que te interesan. Mostraremos solo las ofertas que se ajusten a tu dinero.
            </p>
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Cerrar configuración del Radar">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="radar-modal-body">
          {/* Sección 1: Categorías */}
          <fieldset className="radar-section">
            <legend className="radar-section-title">
              <span>1. ¿Qué categorías deseas monitorear?</span>
              <small>Si no seleccionas ninguna, monitoreará todo el catálogo.</small>
            </legend>
            <div className="radar-chips-grid">
              {RADAR_CATEGORIES.map((cat) => {
                const selected = draft.categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`radar-chip ${selected ? 'is-selected' : ''}`}
                    onClick={() => toggleCategory(cat.id)}
                    aria-pressed={selected}
                  >
                    {selected && <Check aria-hidden="true" className="chip-check" />}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Sección 2: Presupuesto Máximo */}
          <fieldset className="radar-section">
            <legend className="radar-section-title">
              <span>2. Presupuesto máximo por producto</span>
              <small>Filtra solo las ofertas que encajan con tu bolsillo.</small>
            </legend>
            <div className="radar-budget-row">
              {BUDGET_OPTIONS.map((opt) => {
                const isSelected = draft.maxBudget === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    className={`radar-pill ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setDraft((prev) => ({ ...prev, maxBudget: opt.value }))}
                    aria-pressed={isSelected}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="radar-section">
            <legend className="radar-section-title">
              <span>3. Qué precios quieres ver</span>
              <small>Distingue las rebajas anunciadas de los mínimos que sí tienen historial.</small>
            </legend>
            <div className="radar-rigor-options">
              <label className={`radar-radio-box ${draft.minRigor === 'all' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="minRigor"
                  value="all"
                  checked={draft.minRigor === 'all'}
                  onChange={() => setDraft((prev) => ({ ...prev, minRigor: 'all' }))}
                />
                <div>
                  <strong>Todas las opciones</strong>
                  <span>Muestra todo producto que cumpla con tu categoría y presupuesto.</span>
                </div>
              </label>

              <label className={`radar-radio-box ${draft.minRigor === 'discount_only' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="minRigor"
                  value="discount_only"
                  checked={draft.minRigor === 'discount_only'}
                  onChange={() => setDraft((prev) => ({ ...prev, minRigor: 'discount_only' }))}
                />
                <div>
                  <strong>Rebajas anunciadas</strong>
                  <span>Precio inferior a la referencia publicada por la tienda. No demuestra ahorro histórico.</span>
                </div>
              </label>

              <label className={`radar-radio-box ${draft.minRigor === 'historic_low' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="minRigor"
                  value="historic_low"
                  checked={draft.minRigor === 'historic_low'}
                  onChange={() => setDraft((prev) => ({ ...prev, minRigor: 'historic_low' }))}
                />
                <div>
                  <strong>Mínimos del periodo observado</strong>
                  <span>Captura reciente, registros de al menos dos días y un precio inferior a alguna captura previa.</span>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Sección 4: Tiendas */}
          <fieldset className="radar-section">
            <legend className="radar-section-title">
              <span>4. Almacenes de tu preferencia</span>
              <small>Selecciona tus tiendas habituales o déjalas todas activas.</small>
            </legend>
            <div className="radar-chips-grid">
              {availableStores.map((store) => {
                const selected = draft.stores.includes(store);
                return (
                  <button
                    key={store}
                    type="button"
                    className={`radar-chip ${selected ? 'is-selected' : ''}`}
                    onClick={() => toggleStore(store)}
                    aria-pressed={selected}
                  >
                    {selected && <Check aria-hidden="true" className="chip-check" />}
                    <span>{store}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* Footer del Modal */}
        <footer className="radar-modal-footer">
          <div className="radar-footer-stats">
            <Sparkles aria-hidden="true" />
            <span>
              Auditoría sobre <strong>{totalCatalogCount}</strong> productos ({liveMatches} {liveMatches === 1 ? 'coincidencia activa' : 'coincidencias activas'}).
            </span>
          </div>

          <div className="radar-footer-actions">
            <button type="button" className="btn btn-secondary radar-btn-reset" onClick={handleReset}>
              <RotateCcw aria-hidden="true" />
              Restablecer
            </button>

            {preferences.enabled && (
              <button type="button" className="btn btn-secondary" onClick={handleDisable}>
                Desactivar filtro
              </button>
            )}

            <button type="button" className="btn btn-primary" onClick={handleActivate}>
              <Radar aria-hidden="true" />
              {draft.enabled || preferences.enabled ? 'Guardar mi Presupuesto' : 'Aplicar mi Presupuesto'}
            </button>
          </div>
        </footer>
      </div>
    </Dialog>
  );
}
