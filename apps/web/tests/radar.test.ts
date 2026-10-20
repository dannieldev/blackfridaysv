import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_RADAR_PREFERENCES,
  loadRadarPreferences,
  matchesRadar,
  saveRadarPreferences,
  type RadarPreferences,
} from '../src/lib/radar.ts';
import type { DealItem } from '../src/lib/deals.ts';

function makeDeal(overrides: Partial<DealItem> = {}): DealItem {
  return {
    id: 'test-tv',
    store: 'Almacenes Siman',
    brand: 'Samsung',
    modelCode: 'UN55CU7000',
    title: 'Pantalla Samsung 55 pulgadas 4K',
    category: 'tv_audio',
    currentPrice: 399,
    regularPrice: 499,
    baselinePrice30d: 450,
    dealScore: 'buena_oferta',
    verdictMessage: 'Oferta real',
    productUrl: 'https://sv.siman.com/test/p',
    inStock: true,
    dataSource: 'snapshot',
    ...overrides,
  };
}

test('matchesRadar returns true when radar is disabled', () => {
  const prefs: RadarPreferences = {
    enabled: false,
    categories: ['computacion'],
    maxBudget: 200,
    minRigor: 'historic_low',
    stores: ['walmart'],
  };
  const deal = makeDeal();
  assert.equal(matchesRadar(deal, prefs), true);
});

test('matchesRadar filters by category when selected', () => {
  const prefs: RadarPreferences = {
    enabled: true,
    categories: ['tv_audio'],
    maxBudget: null,
    minRigor: 'all',
    stores: [],
  };
  assert.equal(matchesRadar(makeDeal({ category: 'tv_audio' }), prefs), true);
  assert.equal(matchesRadar(makeDeal({ category: 'smartphones' }), prefs), false);
});

test('matchesRadar handles moda_calzado category', () => {
  const prefs: RadarPreferences = {
    enabled: true,
    categories: ['moda_calzado'],
    maxBudget: null,
    minRigor: 'all',
    stores: [],
  };
  assert.equal(matchesRadar(makeDeal({ category: 'moda_calzado', title: 'Zapatillas Nike' }), prefs), true);
  assert.equal(matchesRadar(makeDeal({ category: 'tv_audio' }), prefs), false);
});

test('matchesRadar maps gaming and legacy videojuegos bidirectionally', () => {
  const legacyPrefs: RadarPreferences = {
    enabled: true,
    categories: ['videojuegos'],
    maxBudget: null,
    minRigor: 'all',
    stores: [],
  };
  assert.equal(matchesRadar(makeDeal({ category: 'gaming' }), legacyPrefs), true);

  const gamingPrefs: RadarPreferences = {
    enabled: true,
    categories: ['gaming'],
    maxBudget: null,
    minRigor: 'all',
    stores: [],
  };
  assert.equal(matchesRadar(makeDeal({ category: 'gaming' }), gamingPrefs), true);
});

test('matchesRadar filters by budget ceiling and exact boundaries', () => {
  const prefs: RadarPreferences = {
    enabled: true,
    categories: [],
    maxBudget: 400,
    minRigor: 'all',
    stores: [],
  };
  assert.equal(matchesRadar(makeDeal({ currentPrice: 399.99 }), prefs), true);
  assert.equal(matchesRadar(makeDeal({ currentPrice: 400.00 }), prefs), true);
  assert.equal(matchesRadar(makeDeal({ currentPrice: 400.01 }), prefs), false);
  assert.equal(matchesRadar(makeDeal({ currentPrice: 500 }), prefs), false);
});

test('matchesRadar applies civic rigor levels', () => {
  const historicLowPrefs: RadarPreferences = {
    enabled: true,
    categories: [],
    maxBudget: null,
    minRigor: 'historic_low',
    stores: [],
  };
  assert.equal(matchesRadar(makeDeal({ dealScore: 'ganga_historica' }), historicLowPrefs), false);
  const checkedAt = new Date().toISOString();
  const history = [
    { date: new Date(Date.now() - 2 * 86400000).toISOString(), price: 499 },
    { date: checkedAt, price: 399 },
  ];
  assert.equal(matchesRadar(makeDeal({ checkedAt, history }), historicLowPrefs), true);
  assert.equal(matchesRadar(makeDeal({ checkedAt, history, refreshStatus: 'retained' }), historicLowPrefs), false);
  assert.equal(matchesRadar(makeDeal({ dealScore: 'buena_oferta' }), historicLowPrefs), false);
  assert.equal(matchesRadar(makeDeal({ dealScore: 'falsa_oferta_inflada' }), historicLowPrefs), false);

  const discountOnlyPrefs: RadarPreferences = {
    enabled: true,
    categories: [],
    maxBudget: null,
    minRigor: 'discount_only',
    stores: [],
  };
  assert.equal(matchesRadar(makeDeal({ dealScore: 'buena_oferta' }), discountOnlyPrefs), true);
  assert.equal(matchesRadar(makeDeal({ dealScore: 'ganga_historica' }), discountOnlyPrefs), true);
  assert.equal(matchesRadar(makeDeal({ dealScore: 'descuento_cosmetico', regularPrice: null }), discountOnlyPrefs), false);
  assert.equal(matchesRadar(makeDeal({ dealScore: 'descuento_cosmetico', regularPrice: 500, currentPrice: 400 }), discountOnlyPrefs), true);
});

test('matchesRadar filters by preferred stores case-insensitively and bidirectionally', () => {
  const prefs: RadarPreferences = {
    enabled: true,
    categories: [],
    maxBudget: null,
    minRigor: 'all',
    stores: ['Siman', 'Omnisport', 'La Curacao'],
  };
  assert.equal(matchesRadar(makeDeal({ store: 'Almacenes Siman' }), prefs), true);
  assert.equal(matchesRadar(makeDeal({ store: 'siman' }), prefs), true);
  assert.equal(matchesRadar(makeDeal({ store: 'La Curacao' }), prefs), true);
  // Bidirectional: Deal has "Curacao", preferences has "La Curacao"
  assert.equal(matchesRadar(makeDeal({ store: 'Curacao' }), prefs), true);
  assert.equal(matchesRadar(makeDeal({ store: 'curacao' }), prefs), true);
  assert.equal(matchesRadar(makeDeal({ store: 'Prado' }), prefs), false);
  assert.equal(matchesRadar(makeDeal({ store: 'Walmart El Salvador' }), prefs), false);

  // Preference has "Prado", deal has "Almacenes Prado"
  const pradoPrefs: RadarPreferences = {
    enabled: true,
    categories: [],
    maxBudget: null,
    minRigor: 'all',
    stores: ['Prado'],
  };
  assert.equal(matchesRadar(makeDeal({ store: 'Almacenes Prado' }), pradoPrefs), true);
  assert.equal(matchesRadar(makeDeal({ store: 'prado' }), pradoPrefs), true);
  assert.equal(matchesRadar(makeDeal({ store: 'Siman' }), pradoPrefs), false);
});

test('matchesRadar evaluates combined multi-criteria filters', () => {
  const combinedPrefs: RadarPreferences = {
    enabled: true,
    categories: ['smartphones', 'computacion'],
    maxBudget: 350,
    minRigor: 'discount_only',
    stores: ['Siman', 'Walmart'],
  };

  // Full match
  assert.equal(matchesRadar(makeDeal({
    category: 'smartphones',
    currentPrice: 299,
    regularPrice: 399,
    dealScore: 'buena_oferta',
    store: 'Almacenes Siman',
  }), combinedPrefs), true);

  // Fails on store
  assert.equal(matchesRadar(makeDeal({
    category: 'smartphones',
    currentPrice: 299,
    regularPrice: 399,
    dealScore: 'buena_oferta',
    store: 'La Curacao',
  }), combinedPrefs), false);

  // Fails on budget
  assert.equal(matchesRadar(makeDeal({
    category: 'smartphones',
    currentPrice: 399,
    regularPrice: 499,
    dealScore: 'buena_oferta',
    store: 'Almacenes Siman',
  }), combinedPrefs), false);

  // Fails on category
  assert.equal(matchesRadar(makeDeal({
    category: 'tv_audio',
    currentPrice: 299,
    regularPrice: 399,
    dealScore: 'buena_oferta',
    store: 'Almacenes Siman',
  }), combinedPrefs), false);
});

test('loadRadarPreferences and saveRadarPreferences handle edge cases and malformed storage', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => { store.set(key, val); },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });

  // Default when empty
  assert.deepEqual(loadRadarPreferences(), DEFAULT_RADAR_PREFERENCES);

  // Corrupted JSON fallback
  store.set('bfsv_radar_preferences_v1', 'not valid json {{{');
  assert.deepEqual(loadRadarPreferences(), DEFAULT_RADAR_PREFERENCES);

  // Primitive non-object JSON values (null, numbers, booleans)
  store.set('bfsv_radar_preferences_v1', 'null');
  assert.deepEqual(loadRadarPreferences(), DEFAULT_RADAR_PREFERENCES);
  store.set('bfsv_radar_preferences_v1', '12345');
  assert.deepEqual(loadRadarPreferences(), DEFAULT_RADAR_PREFERENCES);
  store.set('bfsv_radar_preferences_v1', 'true');
  assert.deepEqual(loadRadarPreferences(), DEFAULT_RADAR_PREFERENCES);

  // Sanitization of invalid fields
  store.set('bfsv_radar_preferences_v1', JSON.stringify({
    enabled: 'yes',
    categories: ['videojuegos', 'smartphones', 123],
    maxBudget: -50,
    minRigor: 'invalid_rigor',
    stores: null,
  }));
  const loaded = loadRadarPreferences();
  assert.equal(loaded.enabled, true);
  assert.deepEqual(loaded.categories, ['gaming', 'smartphones', '123']);
  assert.equal(loaded.maxBudget, null);
  assert.equal(loaded.minRigor, 'all');
  assert.deepEqual(loaded.stores, []);

  // Save valid preferences
  saveRadarPreferences({
    enabled: true,
    categories: ['tv_audio'],
    maxBudget: 500,
    minRigor: 'historic_low',
    stores: ['Prado'],
  });
  const reloaded = loadRadarPreferences();
  assert.equal(reloaded.enabled, true);
  assert.deepEqual(reloaded.categories, ['tv_audio']);
  assert.equal(reloaded.maxBudget, 500);
  assert.equal(reloaded.minRigor, 'historic_low');
  assert.deepEqual(reloaded.stores, ['Prado']);
});

test('matchesRadar with enabled=true and empty criteria matches all products in catalog', () => {
  const emptyActivePrefs: RadarPreferences = {
    enabled: true,
    categories: [],
    maxBudget: null,
    minRigor: 'all',
    stores: [],
  };
  assert.equal(matchesRadar(makeDeal({ category: 'moda_calzado', currentPrice: 50 }), emptyActivePrefs), true);
  assert.equal(matchesRadar(makeDeal({ category: 'gaming', currentPrice: 500 }), emptyActivePrefs), true);
  assert.equal(matchesRadar(makeDeal({ category: 'tv_audio', currentPrice: 2000 }), emptyActivePrefs), true);
});

test('matchesRadar supports multiple selected categories including moda_calzado', () => {
  const multiPrefs: RadarPreferences = {
    enabled: true,
    categories: ['moda_calzado', 'gaming', 'smartphones'],
    maxBudget: null,
    minRigor: 'all',
    stores: [],
  };
  assert.equal(matchesRadar(makeDeal({ category: 'moda_calzado' }), multiPrefs), true);
  assert.equal(matchesRadar(makeDeal({ category: 'gaming' }), multiPrefs), true);
  assert.equal(matchesRadar(makeDeal({ category: 'smartphones' }), multiPrefs), true);
  assert.equal(matchesRadar(makeDeal({ category: 'tv_audio' }), multiPrefs), false);
  assert.equal(matchesRadar(makeDeal({ category: 'computacion' }), multiPrefs), false);
});
