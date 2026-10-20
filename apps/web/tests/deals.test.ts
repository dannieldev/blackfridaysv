import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, mock, test } from 'node:test';
import { catalogProductId, comparableOffers, discountPercent, loadCatalog, money, storeLabel, type DealItem } from '../src/lib/deals.ts';
import { fetchLiveDeals } from '../src/lib/supabase.ts';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'siman-tv', store: 'Almacenes Siman', brand: 'Samsung', modelCode: 'UN32H5000FPXPA',
    title: 'Pantalla de 32&quot; Samsung', category: 'tv_audio', currentPrice: 219, regularPrice: 299,
    baselinePrice30d: 259, dealScore: 'falsa_oferta_inflada', productUrl: 'https://sv.siman.com/producto/p',
    imageUrl: 'https://example.com/product.jpg', updatedAt: '2026-10-15T19:00:00-06:00',
    ...overrides,
  };
}

function serve(data: unknown) {
  return mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  }));
}

afterEach(() => mock.restoreAll());

test('snapshot is validated, retains unknown stock and never fabricates historic evidence', async () => {
  const fetch = serve([
    row(), row({ id: 'prado-tv', store: 'Prado', inStock: false }),
    row({ id: 'invalid-price', currentPrice: -10 }), row({ id: 'invalid-url', productUrl: 'javascript:alert(1)' }),
    row(), null, 'bad record',
  ]);
  const deals = await fetchLiveDeals();
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(deals?.length, 2);
  assert.equal(deals?.[0].source, 'snapshot');
  assert.equal(deals?.[0].updated_at, '2026-10-16T01:00:00.000Z');
  assert.equal(deals?.[0].in_stock, null);
  assert.equal(deals?.[1].in_stock, false);
  assert.equal(deals?.[0].baseline_price_30d, null);
  assert.equal(deals?.[0].min_historic_price, null);
  assert.equal(deals?.[0].is_inflated, false);
  assert.equal(deals?.[0].history, undefined);
});

test('catalog decodes text without parsing markup and reports oldest capture', async () => {
  serve([
    row({ title: 'LG 55&quot; &amp; Audio &#xF1; &#243; &lt;img onerror=alert(1)&gt; &#x110000;' }),
    row({ id: 'older', modelCode: 'OTHER123', updatedAt: '2026-10-15T00:00:00Z' }),
  ]);
  const catalog = await loadCatalog();
  assert.equal(catalog.source, 'snapshot');
  assert.equal(catalog.updatedAt, '2026-10-15T00:00:00.000Z');
  assert.equal(catalog.deals[0].title, 'LG 55" & Audio ñ ó <img onerror=alert(1)> &#x110000;');
  assert.equal(catalog.deals[0].baselinePrice30d, 219);
  assert.equal(catalog.deals[0].history, undefined);
  assert.match(catalog.deals[0].verdictMessage, /no demuestra un ahorro histórico/);
});

test('model matches require brand, category and conservative manufacturer code', async () => {
  serve([
    row(), row({ id: 'prado', store: 'Prado', modelCode: 'UN32H5000', currentPrice: 159, inStock: false }),
    row({ id: 'walmart', store: 'Walmart El Salvador', modelCode: 'UN32H5000', currentPrice: 163.35 }),
    row({ id: 'different-variant', store: 'Omnisport', modelCode: 'UN32H5000FXZA' }),
    row({ id: 'different-category', store: 'Prado', category: 'smartphones' }),
    row({ id: 'generic1', brand: 'Genérico', modelCode: '280-15ML' }),
    row({ id: 'generic2', store: 'Prado', brand: 'Genérico', modelCode: '280-15ML' }),
    row({ id: 'no-model1', modelCode: 'N/A' }), row({ id: 'no-model2', store: 'Prado', modelCode: 'N/A' }),
  ]);
  const { deals } = await loadCatalog();
  assert.equal(deals[0].competitors?.length, 2);
  const available = comparableOffers(deals[0]);
  assert.equal(available[0].store, 'Walmart El Salvador');
  assert.equal(available[0].price, 163.35);
  assert.equal(available.length, 2);
  assert.equal(deals[3].competitors, undefined);
  assert.equal(deals[4].competitors, undefined);
  assert.equal(deals[5].competitors, undefined);
  assert.equal(deals[7].competitors, undefined);
});

test('comparison deduplicates stores and excludes sold-out and invalid offers', async () => {
  serve([row()]);
  const { deals } = await loadCatalog();
  const deal: DealItem = {
    ...deals[0], inStock: false,
    competitors: [
      { store: 'Prado', price: 150, inStock: false },
      { store: 'Walmart', price: 180 }, { store: 'Walmart El Salvador', price: 170, inStock: true },
      { store: 'Omnisport', price: Number.NaN },
    ],
  };
  assert.deepEqual(comparableOffers(deal).map(({ store, price }) => ({ store, price })), [
    { store: 'Walmart El Salvador', price: 170 },
  ]);
});

test('advertised discounts and money formatting use their stated basis', () => {
  assert.equal(discountPercent({ currentPrice: 75, regularPrice: 100 }), 25);
  assert.equal(discountPercent({ currentPrice: 100, regularPrice: 100 }), null);
  assert.equal(discountPercent({ currentPrice: 110, regularPrice: 100 }), null);
  assert.equal(discountPercent({ currentPrice: 100, regularPrice: null }), null);
  assert.equal(discountPercent({ currentPrice: Number.NaN, regularPrice: 100 }), null);
  assert.equal(discountPercent({ currentPrice: -10, regularPrice: 100 }), null);
  assert.equal(discountPercent({ currentPrice: 50, regularPrice: Number.POSITIVE_INFINITY }), null);
  assert.equal(money(1234.5), '$1,234.50');
  assert.equal(storeLabel('Almacenes Siman'), 'Siman');
  assert.equal(storeLabel('Walmart El Salvador'), 'Walmart');
  assert.equal(storeLabel('La Curacao El Salvador'), 'La Curacao');
  assert.equal(storeLabel('Prado El Salvador'), 'Prado');
  assert.equal(storeLabel('Omnisport'), 'Omnisport');
  assert.equal(storeLabel('Tienda Desconocida'), 'Tienda Desconocida');
});

test('database IDs match snapshot links and saved IDs only when store slug and SKU are known', () => {
  const database = { source: 'database' as const, store_id: 'siman', store_sku: '1234-AB', store_product_id: '03fcc45b-725f-490a-bec9-d058b3339c33' };
  const snapshot = { source: 'snapshot' as const, store_id: 'siman', store_sku: 'siman-1234-AB', store_product_id: 'siman-1234-AB' };
  assert.equal(catalogProductId(database), catalogProductId(snapshot));
  assert.equal(catalogProductId({ ...database, store_id: '2cf6b078-c299-4c80-8d58-a82c1019ce9f' }), database.store_product_id);
  assert.equal(catalogProductId({ ...database, store_sku: '' }), database.store_product_id);
  assert.equal(catalogProductId({ ...database, store_id: '' }), database.store_product_id);
});

test('only explicit valid observations become history', async context => {
  context.mock.method(Date, 'now', () => Date.parse('2026-10-20T00:00:00Z'));
  serve([row({ history: [
    { date: '2026-10-15T00:00:00Z', price: 219 },
    { date: '2026-10-01T00:00:00Z', price: 230 },
    { date: 'not-a-date', price: 250 }, { date: '2026-10-10T00:00:00Z', price: -1 },
  ] })]);
  const { deals } = await loadCatalog();
  assert.deepEqual(deals[0].history, [
    { date: '2026-10-01T00:00:00.000Z', price: 230 },
    { date: '2026-10-15T00:00:00.000Z', price: 219 },
  ]);
});

test('unavailable catalog falls back to labeled examples without purchase links or false history', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
  const catalog = await loadCatalog();
  assert.equal(catalog.source, 'demo');
  assert.equal(catalog.deals.length, 6);
  assert.ok(catalog.deals.some(d => d.category === 'moda_calzado'));
  assert.ok(catalog.deals.some(d => d.category === 'smartphones'));
  assert.ok(catalog.deals.some(d => d.category === 'gaming'));
  for (const deal of catalog.deals) {
    assert.equal(deal.dataSource, 'demo');
    assert.equal(deal.productUrl, '');
    assert.equal(deal.history, undefined);
    assert.equal(deal.regularPrice, null);
    assert.match(deal.verdictMessage, /No es una oferta real/);
  }
});

test('snapshot timeout aborts the request and reaches contingency', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  mock.method(globalThis, 'fetch', (_url: unknown, options: RequestInit) => new Promise((_, reject) => {
    options.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const pending = loadCatalog();
  context.mock.timers.tick(3500);
  assert.equal((await pending).source, 'demo');
});

test('real snapshot retains the catalog, moda_calzado items, and safe cross-store matches', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../public/data/deals-snapshot.json', import.meta.url), 'utf8'));
  serve(snapshot);
  const catalog = await loadCatalog();
  assert.equal(catalog.deals.length, snapshot.length);
  assert.ok(catalog.deals.filter(deal => deal.competitors?.length).every(deal => deal.modelCode !== 'N/A'));
  assert.ok(catalog.deals.every(deal => deal.inStock === null || typeof deal.inStock === 'boolean'));
  for (const deal of catalog.deals) {
    const original = snapshot.find((item: { id: string }) => item.id === deal.id);
    assert.equal(deal.currentPrice, original.currentPrice);
    assert.equal(deal.checkedAt, original.updatedAt);
    assert.ok((deal.history ?? []).every(p => Number.isFinite(Date.parse(p.date)) && p.price > 0));
  }
  const modaDeals = catalog.deals.filter(deal => deal.category === 'moda_calzado');
  assert.equal(modaDeals.length, snapshot.filter((item: { category: string }) => item.category === 'moda_calzado').length);
  assert.ok(modaDeals.every(deal => deal.currentPrice > 0));
});
