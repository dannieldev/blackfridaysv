import type { DealItem } from './deals.ts';

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
    return {
      enabled: Boolean(parsed.enabled),
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      maxBudget: typeof parsed.maxBudget === 'number' && parsed.maxBudget > 0 ? parsed.maxBudget : null,
      minRigor: ['all', 'discount_only', 'historic_low'].includes(parsed.minRigor) ? parsed.minRigor : 'all',
      stores: Array.isArray(parsed.stores) ? parsed.stores : [],
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

export function matchesRadar(deal: DealItem, prefs: RadarPreferences): boolean {
  if (!prefs.enabled) return true;

  // Filtro por categorías si seleccionó alguna
  if (prefs.categories.length > 0 && !prefs.categories.includes(deal.category)) {
    return false;
  }

  // Filtro por presupuesto máximo
  if (prefs.maxBudget !== null && deal.currentPrice > prefs.maxBudget) {
    return false;
  }

  // Filtro por rigor cívico de ofertas
  if (prefs.minRigor === 'historic_low') {
    if (deal.dealScore !== 'ganga_historica') return false;
  } else if (prefs.minRigor === 'discount_only') {
    const hasDiscount = (deal.regularPrice ?? 0) > deal.currentPrice;
    const isGoodScore = deal.dealScore === 'ganga_historica' || deal.dealScore === 'buena_oferta';
    if (!hasDiscount && !isGoodScore) return false;
  }

  // Filtro por almacenes si seleccionó alguno
  if (prefs.stores.length > 0) {
    const dealStore = deal.store.toLowerCase();
    const matchesStore = prefs.stores.some((store) => dealStore.includes(store.toLowerCase()));
    if (!matchesStore) return false;
  }

  return true;
}
