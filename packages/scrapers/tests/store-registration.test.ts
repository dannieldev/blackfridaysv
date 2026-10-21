import assert from 'node:assert/strict';
import { test } from 'node:test';
import { syncProductsToDatabase } from '../src/db/supabase.js';
import type { ScrapedProduct } from '../src/types.js';

test('new store registration precedes product writes, retains existing metadata and fails without losing the snapshot path', async context => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://database.example.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
  const requests: string[] = [];
  let blocked = false;
  context.mock.method(globalThis, 'fetch', async (input: string, init: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, 'database.example.invalid');
    requests.push(url.pathname);
    if (url.pathname.endsWith('/stores')) {
      assert.match(new Headers(init.headers).get('Prefer') ?? '', /resolution=ignore-duplicates/);
      const body = JSON.parse(String(init.body));
      assert.deepEqual(body.map((s: { id: string }) => s.id), ['prismamoda']);
      return blocked ? Response.json({ message: 'not allowed' }, { status: 403 }) : new Response(null, { status: 201 });
    }
    if (url.pathname.endsWith('/store_products')) return Response.json({ id: 'product-uuid' });
    assert.ok(url.pathname.endsWith('/price_history'));
    return new Response(null, { status: 201 });
  });
  const product: ScrapedProduct = { storeId: 'prismamoda', storeSku: '1.2.1', title: 'Zapato talla 38',
    brand: 'Marca', category: 'moda_calzado', modelCode: null, offerPrice: 40, regularPrice: 50,
    inStock: true, productUrl: 'https://www.prismamoda.com/zapato/p?skuId=2', imageUrl: null };
  try {
    const result = await syncProductsToDatabase([product], { dryRun: false });
    assert.equal(result.errors, 0); assert.equal(result.pricesRecorded, 1);
    assert.deepEqual(requests, ['/rest/v1/stores', '/rest/v1/store_products', '/rest/v1/price_history']);
    blocked = true;
    const failed = await syncProductsToDatabase([product], { dryRun: false });
    assert.equal(failed.errors, 1); assert.equal(failed.productsSynced, 0);
    assert.equal(requests.length, 4);
    await syncProductsToDatabase([product], { dryRun: true });
    assert.equal(requests.length, 4);
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});
