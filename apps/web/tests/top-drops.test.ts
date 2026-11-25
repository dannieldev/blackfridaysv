import test from 'node:test';
import assert from 'node:assert/strict';
import { selectTopRealDrops, selectTopStoreGaps } from '../src/lib/topDrops.ts';
import type { DealItem } from '../src/lib/deals.ts';

const NOW = Date.parse('2026-11-25T16:00:00.000Z');

function makeDeal(overrides: Partial<DealItem>): DealItem {
  return {
    id: 'siman-1',
    store: 'Almacenes Siman',
    brand: 'Samsung',
    modelCode: 'UN55DU7000',
    title: 'Smart TV Samsung 55" 4K',
    category: 'tv_audio',
    currentPrice: 399,
    regularPrice: 549,
    baselinePrice30d: 499,
    dealScore: 'ganga_historica',
    verdictMessage: '',
    productUrl: 'https://sv.siman.com/tv',
    inStock: true,
    dataSource: 'snapshot',
    checkedAt: '2026-11-25T14:00:00.000Z',
    history: [
      { date: '2026-11-10T12:00:00.000Z', price: 500 },
      { date: '2026-11-15T12:00:00.000Z', price: 500 },
      { date: '2026-11-20T12:00:00.000Z', price: 500 },
      { date: '2026-11-25T14:00:00.000Z', price: 399 },
    ],
    ...overrides,
  };
}

test('selectTopRealDrops ranks verified green drops by real percentage and excludes out-of-stock or unverified items', () => {
  const drop20 = makeDeal({
    id: 'siman-tv',
    currentPrice: 400,
    history: [
      { date: '2026-11-10T12:00:00.000Z', price: 500 },
      { date: '2026-11-15T12:00:00.000Z', price: 500 },
      { date: '2026-11-25T14:00:00.000Z', price: 400 },
    ],
  }); // 20% off 500
  const drop30 = makeDeal({
    id: 'curacao-tv',
    store: 'La Curacao',
    modelCode: '55UR7800PSB',
    title: 'Smart TV LG 55" 4K',
    currentPrice: 350,
    history: [
      { date: '2026-11-10T12:00:00.000Z', price: 500 },
      { date: '2026-11-14T12:00:00.000Z', price: 500 },
      { date: '2026-11-25T14:00:00.000Z', price: 350 },
    ],
  });
  const soldOut = makeDeal({ id: 'walmart-out', modelCode: 'SOLD-1', inStock: false, currentPrice: 200 });
  const unverified = makeDeal({ id: 'prado-new', modelCode: 'NEW-1', history: [{ date: '2026-11-25T14:00:00.000Z', price: 200 }] });

  const drops = selectTopRealDrops([drop20, drop30, soldOut, unverified], NOW, 5);
  assert.equal(drops.length, 2);
  assert.equal(drops[0].deal.id, 'curacao-tv');
  assert.equal(drops[0].dropPercent, 30);
  assert.equal(drops[0].savingsUsd, 150);
  assert.equal(drops[1].deal.id, 'siman-tv');
  assert.equal(drops[1].dropPercent, 20);
});

test('selectTopStoreGaps highlights exact cross-store price gaps with the cheapest store first', () => {
  const cheapest = makeDeal({
    id: 'tropigas-tv',
    store: 'Almacenes Tropigas',
    currentPrice: 420,
    competitors: [
      { store: 'Almacenes Siman', price: 529, inStock: true, checkedAt: '2026-11-25T13:00:00.000Z' },
    ],
  });
  const expensive = makeDeal({
    id: 'siman-tv',
    store: 'Almacenes Siman',
    currentPrice: 529,
    competitors: [
      { store: 'Almacenes Tropigas', price: 420, inStock: true, checkedAt: '2026-11-25T13:00:00.000Z' },
    ],
  });

  const gaps = selectTopStoreGaps([expensive, cheapest], NOW, 5);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].deal.id, 'tropigas-tv');
  assert.equal(gaps[0].cheapestStore, 'Tropigas');
  assert.equal(gaps[0].highestStore, 'Siman');
  assert.equal(gaps[0].savingsUsd, 109);
  assert.equal(gaps[0].storeCount, 2);
});
