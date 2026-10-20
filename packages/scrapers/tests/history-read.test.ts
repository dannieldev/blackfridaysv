import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readPriceHistory } from '../src/db/supabase.js';

function source(failAt?: number) {
  const ranges: number[] = [];
  const points = Array.from({ length: 2005 }, (_, id) => ({
    id, store_product_id: 'database-uuid', offer_price: '100.50', regular_price: '150.00',
    captured_at: '2026-10-19T18:00:00Z',
  }));
  const client = { from(table: string) {
    let offset = 0;
    const query = {
      select() { return query; }, order() { return query; }, in() { return query; },
      gte() { return query; }, lte() { return query; },
      range(start: number) { offset = start; return query; },
      async abortSignal() {
        if (table === 'store_products') return { data: [{ id: 'database-uuid', store_id: 'siman', store_sku: 'sku-1' }], error: null };
        ranges.push(offset);
        return offset === failAt ? { data: null, error: { message: 'failed page' } }
          : { data: points.slice(offset, offset + 1000), error: null };
      },
    };
    return query;
  } } as unknown as SupabaseClient;
  return { client, ranges };
}

test('history export paginates past 1000 rows and maps database IDs to stable catalog IDs', async () => {
  const { client, ranges } = source();
  const history = await readPriceHistory('2026-10-20T00:00:00Z', client);
  assert.deepEqual(ranges, [0, 1000, 2000]);
  assert.equal(history['siman-sku-1'].length, 2005);
  assert.equal(history['siman-sku-1'][0].price, 100.5);
  assert.equal(history['siman-sku-1'][0].regularPrice, 150);
});

test('a failed history page rejects the partial export so the snapshot remains the fallback', async () => {
  await assert.rejects(readPriceHistory('2026-10-20T00:00:00Z', source(1000).client), /conserva el historial/);
});
