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

test('electronic tablets and legitimate fashion products are not confused with medicine', () => {
  for (const title of [
    'Tablet Samsung Galaxy Tab A9', 'Tableta gráfica Wacom Intuos',
    'Apple iPad Pro 11 Pulgadas', 'Gorra Mercedes AMG Petronas',
  ]) assert.equal(isExcludedFromCatalog({ title, currentPrice: 150 }), false, title);
});

test('cheap trinkets, keychains, hair accessories, and $1-$6 items are excluded from Black Friday', () => {
  for (const item of [
    { title: 'Llavero color celeste con dije de unicornio para niña', currentPrice: 1.99, category: 'moda_calzado' },
    { title: 'Diadema color crema con estampado floral para niña', currentPrice: 1.99, category: 'moda_calzado' },
    { title: 'Pulsera elástica inspiración mamá con cuentas decorativas', currentPrice: 1.99, category: 'moda_calzado' },
    { title: 'Collar diseño tipo gargantilla color plateado para mujer', currentPrice: 1.99, category: 'moda_calzado' },
    { title: 'Set de 5 pzs de cola y ganchos para cabello', currentPrice: 1.99, category: 'moda_calzado' },
    { title: 'Sandalias de playa básicas color azul', currentPrice: 6, category: 'moda_calzado' },
  ]) assert.equal(isExcludedFromCatalog(item), true, item.title);
});

test('loose cables, cheap phone mounts, and plastic single dishes are excluded', () => {
  for (const item of [
    { title: 'Cable Tech/Impresora Xtech Tc3026Ftxusb 2 0', currentPrice: 1.96, category: 'computacion' },
    { title: 'Cable USB tipo-A a USB tipo-C', currentPrice: 6.5, category: 'computacion' },
    { title: 'Soporte Durabrad Para Celular', currentPrice: 3, category: 'smartphones' },
    { title: 'Bolsa Impermeable Para Celular', currentPrice: 1.25, category: 'smartphones' },
    { title: 'Plato hondo celeste', currentPrice: 4.9, category: 'linea_blanca' },
    { title: 'Tapa Para Microondas Mainstays', currentPrice: 1.75, category: 'linea_blanca' },
    { title: 'Organizador Mainstays para refrigeradora -3 L', currentPrice: 4.25, category: 'linea_blanca' },
    { title: 'Palomitas Chipps Extra Mantequilla 85 G', currentPrice: 1.65, category: 'linea_blanca' },
  ]) assert.equal(isExcludedFromCatalog(item), true, item.title);

  // Full dinnerware sets and cookware batteries are allowed
  assert.equal(isExcludedFromCatalog({
    title: 'Vajilla completa de cerámica 16 piezas', currentPrice: 45, category: 'linea_blanca',
  }), false);
  assert.equal(isExcludedFromCatalog({
    title: 'Batería de cocina de acero inoxidable 10 piezas', currentPrice: 89, category: 'linea_blanca',
  }), false);
});

test('category minimum price boundaries and extreme glitches are enforced', () => {
  // Baby toys or cheap shirts in tech/gaming
  assert.equal(isExcludedFromCatalog({
    title: 'Camiseta Nintendo Super Mario para niña', currentPrice: 4, category: 'gaming',
  }), true);
  assert.equal(isExcludedFromCatalog({
    title: 'Celular Spark Create Imagine para bebé surtido', currentPrice: 5, category: 'smartphones',
  }), true);

  // Extreme glitches (VTEX 10000000 placeholder)
  assert.equal(isExcludedFromCatalog({
    title: 'Celular Samsung Galaxy S26 Ultra', currentPrice: 10000000, category: 'smartphones',
  }), true);
  assert.equal(isExcludedFromCatalog({
    title: 'Zapato de niña', currentPrice: 0, category: 'moda_calzado',
  }), true);

  // Legitimate Black Friday products pass
  assert.equal(isExcludedFromCatalog({
    title: 'Smart TV Samsung 55 Pulgadas 4K UHD', currentPrice: 389, category: 'tv_audio',
  }), false);
  assert.equal(isExcludedFromCatalog({
    title: 'Celular Xiaomi Redmi Note 17 256GB', currentPrice: 199, category: 'smartphones',
  }), false);
  assert.equal(isExcludedFromCatalog({
    title: 'Laptop HP 15 Pulgadas Core i5 16GB RAM', currentPrice: 549, category: 'computacion',
  }), false);
  assert.equal(isExcludedFromCatalog({
    title: 'Refrigeradora Mabe 11 pies no frost', currentPrice: 429, category: 'linea_blanca',
  }), false);
  assert.equal(isExcludedFromCatalog({
    title: 'Consola PlayStation 5 Slim 1TB', currentPrice: 499, category: 'gaming',
  }), false);
  assert.equal(isExcludedFromCatalog({
    title: 'Zapatillas Deportivas Nike Air Max para Hombre', currentPrice: 89, category: 'moda_calzado',
  }), false);
});

test('failed refreshes cannot retain excluded medicine or accept it as a new product', () => {
  const old: SnapshotItem = {
    id: 'walmart-pill', store: 'Walmart', storeId: 'walmart', title: 'Prenisolam 5mg caja 50 tabletas',
    brand: 'Marca', modelCode: 'N/A', category: 'computacion', currentPrice: 5, regularPrice: 10,
    productUrl: 'https://example.com/pill', updatedAt: '2026-10-19T18:00:00Z',
  };
  const laptop = { ...old, id: 'walmart-laptop', title: 'Laptop Lenovo IdeaPad 15', currentPrice: 450, regularPrice: 600 };
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
