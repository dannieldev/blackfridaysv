import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesRadar, type RadarPreferences } from '../src/lib/radar.ts';
import { getRegionalBenchmark } from '../src/lib/regionalBenchmark.ts';
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

test('matchesRadar filters by budget ceiling', () => {
  const prefs: RadarPreferences = {
    enabled: true,
    categories: [],
    maxBudget: 400,
    minRigor: 'all',
    stores: [],
  };
  assert.equal(matchesRadar(makeDeal({ currentPrice: 399 }), prefs), true);
  assert.equal(matchesRadar(makeDeal({ currentPrice: 401 }), prefs), false);
});

test('matchesRadar applies civic rigor levels', () => {
  const historicLowPrefs: RadarPreferences = {
    enabled: true,
    categories: [],
    maxBudget: null,
    minRigor: 'historic_low',
    stores: [],
  };
  assert.equal(matchesRadar(makeDeal({ dealScore: 'ganga_historica' }), historicLowPrefs), true);
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
});

test('matchesRadar filters by preferred stores', () => {
  const prefs: RadarPreferences = {
    enabled: true,
    categories: [],
    maxBudget: null,
    minRigor: 'all',
    stores: ['Siman', 'Omnisport'],
  };
  assert.equal(matchesRadar(makeDeal({ store: 'Almacenes Siman' }), prefs), true);
  assert.equal(matchesRadar(makeDeal({ store: 'Prado' }), prefs), false);
});

test('getRegionalBenchmark provides context for exclusive products', () => {
  const inflatedDeal = makeDeal({
    dealScore: 'falsa_oferta_inflada',
    currentPrice: 2399,
    regularPrice: 3099,
    baselinePrice30d: 2749,
  });
  const benchmarkInflated = getRegionalBenchmark(inflatedDeal);
  assert.equal(benchmarkInflated.status, 'overpriced');
  assert.match(benchmarkInflated.statusLabel, /inflado/i);

  const gangaDeal = makeDeal({
    dealScore: 'ganga_historica',
    currentPrice: 649,
    regularPrice: 799,
    baselinePrice30d: 724,
  });
  const benchmarkGanga = getRegionalBenchmark(gangaDeal);
  assert.equal(benchmarkGanga.status, 'exceptional_deal');
  assert.match(benchmarkGanga.statusLabel, /competitivo/i);
});
