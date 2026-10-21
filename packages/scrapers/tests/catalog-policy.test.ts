import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isExcludedFromCatalog } from '../src/core/catalog-policy.js';
import { mergeCatalog, type SnapshotItem } from '../src/core/catalog.js';
import { parseVtexProducts } from '../src/stores/vtex-adapter.js';
import type { ScrapedProduct } from '../src/types.js';

test('pharmacy categories and medicine presentations are outside the catalog', () => {
  for (const title of [
    'Loperakem 100 Tabletas - Precio indicado por tableta',
    'Anaflat NF caja 40 tableta masticables - Precio indicado por tableta',
    'Prenisolam 5mg caja 50 tabletas',
    'Tabletas masticables Tums sabores frasco 48 tabletas',
    'Antigripal en sobres', 'Jarabe pediátrico 10mg/5ml',
  ]) assert.equal(isExcludedFromCatalog({ title }), true, title);
  assert.equal(isExcludedFromCatalog({ title: 'Producto sin presentación', categories: ['/Salud/Medicamentos/'] }), true);
  assert.equal(isExcludedFromCatalog({ title: 'Producto sin presentación', category: 'farmacia' }), true);
});

test('tablet devices and ordinary household products are not confused with medicine', () => {
  for (const title of [
    'Tablet Samsung Galaxy', 'Soporte para laptop tableta y celular',
    'Tableta gráfica Wacom', 'Tabletas para lavavajillas 50 unidades',
    'Cápsulas de café 30 unidades', 'Gorra Mercedes AMG Petronas',
  ]) assert.equal(isExcludedFromCatalog({ title }), false, title);
});

test('failed refreshes cannot retain excluded medicine or accept it as a new product', () => {
  const old: SnapshotItem = {
    id: 'walmart-pill', store: 'Walmart', storeId: 'walmart', title: 'Prenisolam 5mg caja 50 tabletas',
    brand: 'Marca', modelCode: 'N/A', category: 'computacion', currentPrice: 5, regularPrice: 10,
    productUrl: 'https://example.com/pill', updatedAt: '2026-10-19T18:00:00Z',
  };
  const laptop = { ...old, id: 'walmart-laptop', title: 'Laptop Lenovo' };
  const incoming: ScrapedProduct = {
    storeId: 'walmart', storeSku: 'pill', title: old.title, brand: 'Marca', category: 'computacion',
    modelCode: null, offerPrice: 4, regularPrice: 10, productUrl: old.productUrl, imageUrl: null, inStock: true,
  };
  const merged = mergeCatalog([old, laptop], [{ storeId: 'walmart', products: [incoming], failed: true }], '2026-10-20T18:00:00Z');
  assert.deepEqual(merged.items.map(item => item.id), ['walmart-laptop']);
  assert.equal(merged.acceptedProducts.length, 0);
  assert.equal(merged.items[0].currentPrice, laptop.currentPrice);
});

test('VTEX pharmacy metadata excludes ambiguous names before they reach the snapshot', () => {
  const product = {
    productId: '123', productName: 'Presentación 20 unidades', brand: 'Marca',
    link: 'https://www.walmart.com.sv/producto/p', categories: ['/Farmacia/Salud/'],
    items: [{ sellers: [{ commertialOffer: { Price: 5, ListPrice: 10, AvailableQuantity: 2 } }] }],
  };
  assert.deepEqual(parseVtexProducts([product], { storeId: 'walmart', baseUrl: 'https://www.walmart.com.sv' }, 'computacion'), []);
});
