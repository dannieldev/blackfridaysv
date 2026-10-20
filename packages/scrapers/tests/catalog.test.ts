import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { mergeCatalog, mergeHistory, type SnapshotItem } from '../src/core/catalog.js';
import { readSnapshot, writeSnapshot } from '../src/core/snapshot.js';
import { syncProductsToDatabase } from '../src/db/supabase.js';
import type { ScrapedProduct } from '../src/types.js';

const before = '2026-10-18T18:00:00.000Z';
const now = '2026-10-19T18:00:00.000Z';
function old(storeId = 'siman', sku = '1'): SnapshotItem {
  return {
    id: `${storeId}-${sku}`, store: storeId, brand: 'Samsung', modelCode: 'TEST123',
    title: 'TV', category: 'tv_audio', currentPrice: 150, regularPrice: 200,
    productUrl: 'https://example.com/tv', updatedAt: before,
  };
}
function product(storeId = 'siman', storeSku = '1'): ScrapedProduct {
  return { storeId, storeSku, brand: 'Samsung', modelCode: 'TEST123', title: 'TV',
    category: 'tv_audio', offerPrice: 100, regularPrice: 200,
    productUrl: 'https://example.com/tv', imageUrl: null, inStock: true };
}

test('a single-store crawl preserves other stores and appends only actual captures', () => {
  const result = mergeCatalog([old(), old('prado')], [{ storeId: 'siman', products: [product()] }], now);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[1].updatedAt, before);
  assert.equal(result.items[0].inStock, true);
  assert.deepEqual(result.items[0].history, [{ date: before, price: 150 }, { date: now, price: 100 }]);
  assert.equal(result.items[0].refreshStatus, 'updated');
  assert.equal(result.items[1].refreshStatus, undefined);
});

test('store failure retains old prices and timestamps and marks them pending', () => {
  const { items, stores, acceptedProducts } = mergeCatalog([old()], [{ storeId: 'siman', products: [], failed: true }], now);
  assert.equal(items[0].currentPrice, 150);
  assert.equal(items[0].updatedAt, before);
  assert.equal(items[0].lastAttemptAt, now);
  assert.equal(items[0].refreshStatus, 'retained');
  assert.equal(stores[0].reason, 'fetch_failed');
  assert.equal(acceptedProducts.length, 0);
});

test('a collapse below half the prior coverage cannot publish or sync a tiny subset', () => {
  const previous = Array.from({ length: 20 }, (_, i) => old('siman', String(i)));
  const result = mergeCatalog(previous, [{ storeId: 'siman', products: [product('siman', '0')] }], now);
  assert.equal(result.items.length, 20);
  assert.equal(result.acceptedProducts.length, 0);
  assert.equal(result.stores[0].reason, 'low_coverage');
  assert.ok(result.items.every(p => p.updatedAt === before && p.refreshStatus === 'retained'));
});

test('partial extraction can update valid rows but cannot delete absent products', () => {
  const result = mergeCatalog([old(), old('siman', '2')], [{ storeId: 'siman', products: [product()], failed: true }], now);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].updatedAt, now);
  assert.equal(result.items[1].updatedAt, before);
  assert.equal(result.stores[0].status, 'partial');
  assert.equal(result.stores[0].retained, 1);
});

test('invalid prices, foreign stores and unsafe links do not enter the catalog', () => {
  const result = mergeCatalog([old()], [{ storeId: 'siman', products: [
    product(), { ...product('siman', '2'), offerPrice: NaN },
    product('prado'), { ...product('siman', '3'), productUrl: 'javascript:alert(1)' },
  ] }], now);
  assert.equal(result.acceptedProducts.length, 1);
  assert.equal(result.stores[0].reason, 'invalid_products');
});

test('history keeps 90 days, deduplicates dates and ignores future/invalid prices', () => {
  assert.deepEqual(mergeHistory([
    { date: before, price: 150 }, { date: before, price: 150 }, { date: now, price: 100 },
    { date: now, price: -1 }, { date: 'bad', price: 100 },
    { date: '2027-01-01T00:00:00Z', price: 1 }, { date: '2026-01-01T00:00:00Z', price: 1 },
  ], now), [{ date: before, price: 150 }, { date: now, price: 100 }]);
});

test('database observations merge with snapshot history without inventing a baseline', () => {
  const result = mergeCatalog([old()], [{ storeId: 'siman', products: [product()] }], now, {
    'siman-1': [{ date: '2026-10-17T18:00:00.000Z', price: 170 }],
  });
  assert.equal(result.items[0].history?.length, 3);
  assert.equal('dealScore' in result.items[0], false);
  assert.equal('baselinePrice30d' in result.items[0], false);
});

test('empty or corrupt input never overwrites the last catalog', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bfsv-snapshot-'));
  const file = join(directory, 'snapshot.json');
  try {
    writeSnapshot([old()], file);
    assert.throws(() => writeSnapshot([], file));
    assert.equal(readSnapshot(file).length, 1);
    writeFileSync(file, '{"incomplete":true}');
    assert.throws(() => readSnapshot(file));
    assert.equal(readFileSync(file, 'utf8'), '{"incomplete":true}');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('explicit dry-run synchronizes no remote data and works without credentials', async () => {
  const stats = await syncProductsToDatabase([product()], { dryRun: true, capturedAt: now });
  assert.equal(stats.dryRun, true);
  assert.equal(stats.errors, 0);
});
