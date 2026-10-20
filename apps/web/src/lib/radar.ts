import type { DealItem } from './deals.ts';
import { priceEvidence } from './priceHistory.ts';
import { freshness } from './freshness.ts';

export interface RadarPreferences {
  enabled: boolean;
  categories: string[];
  maxBudget: number | null; // null = sin límite
  minRigor: 'all' | 'discount_only' | 'historic_low';
  stores: string[];
}

export const DEFAULT_RADAR_PREFERENCES: RadarPreferences = {
  enabled: false,
  categories: [],
  maxBudget: null,
  minRigor: 'all',
  stores: [],
};

export const RADAR_STORAGE_KEY = 'bfsv_radar_preferences_v1';

export function loadRadarPreferences(): RadarPreferences {
  if (typeof localStorage === 'undefined') return DEFAULT_RADAR_PREFERENCES;
  try {
    const raw = localStorage.getItem(RADAR_STORAGE_KEY);
    if (!raw) return DEFAULT_RADAR_PREFERENCES;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_RADAR_PREFERENCES;
    const categories: string[] = Array.isArray(parsed.categories)
      ? Array.from(
          new Set(
            parsed.categories
              .map((c: unknown) => (c === 'videojuegos' ? 'gaming' : String(c).trim()))
              .filter((c: string): c is string => Boolean(c)),
          ),
        )
      : [];
    const stores: string[] = Array.isArray(parsed.stores)
      ? Array.from(
          new Set(
            parsed.stores
              .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
              .map((s: string) => s.trim()),
          ),
        )
      : [];
    return {
      enabled: Boolean(parsed.enabled),
      categories,
      maxBudget: typeof parsed.maxBudget === 'number' && parsed.maxBudget > 0 ? parsed.maxBudget : null,
      minRigor: ['all', 'discount_only', 'historic_low'].includes(parsed.minRigor) ? parsed.minRigor : 'all',
      stores,
    };
  } catch {
    return DEFAULT_RADAR_PREFERENCES;
  }
}

export function saveRadarPreferences(prefs: RadarPreferences): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(RADAR_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Si localStorage no está disponible, continuar sin fallar
  }
}

export function matchesRadar(deal: DealItem, prefs: RadarPreferences, now = Date.now()): boolean {
  if (!prefs.enabled) return true;

  // Filtro por categorías si seleccionó alguna
  if (prefs.categories.length > 0) {
    const matchesCat = prefs.categories.some((cat) => {
      if (cat === deal.category) return true;
      if (cat === 'videojuegos' && deal.category === 'gaming') return true;
      if (cat === 'gaming' && deal.category === 'videojuegos') return true;
      return false;
    });
    if (!matchesCat) return false;
  }

  // Filtro por presupuesto máximo
  if (prefs.maxBudget !== null && deal.currentPrice > prefs.maxBudget) {
    return false;
  }

  if (prefs.minRigor === 'historic_low') {
    if (!priceEvidence(deal, now).isObservedLow || freshness(deal, now) !== 'recent') return false;
  } else if (prefs.minRigor === 'discount_only') {
    const hasDiscount = (deal.regularPrice ?? 0) > deal.currentPrice;
    if (!hasDiscount) return false;
  }

  // Filtro por almacenes si seleccionó alguno (bidireccional y tolerante a prefijos como "Almacenes" o "La")
  if (prefs.stores.length > 0) {
    const dealStore = deal.store.toLowerCase();
    const dealStoreNormalized = dealStore.replace(/^almacenes\s+/, '').replace(/\s+el\s+salvador$/, '').replace(/^la\s+/, '').trim();
    const matchesStore = prefs.stores.some((store) => {
      const s = store.toLowerCase();
      const sNormalized = s.replace(/^almacenes\s+/, '').replace(/\s+el\s+salvador$/, '').replace(/^la\s+/, '').trim();
      return (
        dealStore.includes(s) ||
        s.includes(dealStore) ||
        dealStoreNormalized.includes(sNormalized) ||
        sNormalized.includes(dealStoreNormalized)
      );
    });
    if (!matchesStore) return false;
  }

  return true;
}
