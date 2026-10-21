import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { parseVtexProducts } from '../src/stores/vtex-adapter.js';
import { MagentoStoreAdapter } from '../src/stores/magento-adapter.js';
import { parseRafListing, rafScraper } from '../src/stores/raf.js';
import { extractModelCode } from '../src/core/normalizer.js';

const config = { storeId: 'prismamoda', baseUrl: 'https://www.prismamoda.com' };
function variant(itemId: string, price: number, size: string, quantity = 1, sellerId = '1') {
  return { itemId, variations: ['Talla'], Talla: [size], images: [{ imageUrl: 'https://example.com/shoe.jpg' }],
    sellers: [{ sellerId, sellerName: 'Comercio de prueba', commertialOffer: { Price: price, ListPrice: 100, AvailableQuantity: quantity } }] };
}
function fashion() {
  return { productId: '123', productName: 'Zapato de cuero', brand: 'Marca de moda',
    categories: ['/Moda/Damas/Zapatos/'], link: '/zapato/p',
    items: [variant('1001', 80, '37'), variant('1002', 60, '38')] };
}
afterEach(() => mock.restoreAll());

test('fashion uses the cheapest available SKU, exposes size and keeps its own history identity', () => {
  const source = fashion();
  const [first] = parseVtexProducts([source], config, 'moda_calzado');
  assert.equal(first.storeSku, '123.1002.1');
  assert.match(first.title, /Talla: 38/);
  assert.equal(new URL(first.productUrl).searchParams.get('skuId'), '1002');
  assert.equal(first.brand, 'Marca de moda');
  assert.equal(first.modelCode, null);
  source.items[1].sellers[0].commertialOffer.AvailableQuantity = 0;
  const [next] = parseVtexProducts([source], config, 'moda_calzado');
  assert.equal(next.storeSku, '123.1001.1');
  assert.equal(next.offerPrice, 80);
  assert.notEqual(next.storeSku, first.storeSku);
});

test('changing the marketplace seller changes the tracked identity', () => {
  const source = fashion(); source.items = [variant('1001', 50, 'M', 1, 'seller2')];
  const [product] = parseVtexProducts([source], config, 'moda_calzado');
  assert.equal(product.storeSku, '123.1001.seller2');
  assert.match(product.title, /Vende Comercio de prueba/);
});

test('shoe organizers and empty or unsafe product links are excluded without losing valid rows', () => {
  const source = fashion();
  const products = parseVtexProducts([
    { ...source, categories: ['/Hogar/Organizadores/'] },
    { ...source, link: 'https://elsewhere.example/product' }, { ...source, link: 'javascript:alert(1)' },
    { ...source, link: 'https://[' }, { ...source, link: '' }, source,
  ], config, 'moda_calzado');
  assert.equal(products.length, 1);
  assert.equal(parseVtexProducts([{ ...source, categories: ['/Ropa y Zapatería/Hombre/'] }], config, 'moda_calzado').length, 1);
});

test('technology retains existing product IDs and invalid prices do not become offers', () => {
  const source = fashion();
  assert.equal(parseVtexProducts([source], config, 'computacion')[0].storeSku, '123');
  source.items = [variant('1', NaN, 'M'), variant('2', 0, 'L')];
  assert.equal(parseVtexProducts([source], config, 'moda_calzado').length, 0);
});

test('RadioShack listing uses the real lazy image and decodes text and URL entities', () => {
  const adapter = new MagentoStoreAdapter({ storeId: 'radioshack', storeName: 'RadioShack', baseUrl: 'https://www.radioshackla.com/elsalvador', categoriesToSearch: [] });
  const [product] = adapter.parseListing(`<li class="item product product-item" data-product-sku="43929">
    <a class="product-item-link" href="https://www.radioshackla.com/elsalvador/parlante">Parlante RadioShack &quot;Portátil&quot;</a>
    <span data-price-amount="19.99" data-price-type="finalPrice"></span><span data-price-amount="29.99" data-price-type="oldPrice"></span>
    <img class="owl-lazy product-image-photo" src="data:image/png;base64,placeholder" data-src="https://example.com/photo.jpg?width=200&amp;height=200">
    </li>`, 'tv_audio', 50);
  assert.equal(product.title, 'Parlante RadioShack "Portátil"');
  assert.equal(product.imageUrl, 'https://example.com/photo.jpg?width=200&height=200');
  assert.equal(product.offerPrice, 19.99); assert.equal(product.regularPrice, 29.99);
});

const rafUrl = 'https://www.rafenlinea.com/39-laptops/6006-laptop.html';
const rafHtml = `<script type="application/ld+json">{"@type":"ItemList","itemListElement":[{"url":"${rafUrl}","name":"Laptop Dell Latitude con nombre completo"}]}</script>
  <article class="product-miniature js-product-miniature" data-id-product="6006" data-id-product-attribute="2">
    <a href="${rafUrl}"><img class="thumbnail-img" src="https://www.rafenlinea.com/laptop.jpg"></a>
    <h2><a href="${rafUrl}">Laptop Dell...</a></h2>
    <span class="price">$ 1,239.00</span><span class="regular-price">$ 1,499.00</span>
    <button data-button-action="add-to-cart">Comprar</button>
  </article>`;

test('RAF takes the complete structured name, decimal price, variant and explicit stock', () => {
  const [product] = parseRafListing(rafHtml, 'computacion');
  assert.equal(product.title, 'Laptop Dell Latitude con nombre completo');
  assert.equal(product.storeSku, '6006.2');
  assert.equal(product.offerPrice, 1239); assert.equal(product.regularPrice, 1499);
  assert.equal(product.inStock, true);
  assert.equal(parseRafListing(rafHtml.replace('data-button-action=', 'disabled data-button-action='), 'computacion')[0].inStock, false);
  assert.equal(parseRafListing(rafHtml.replaceAll(rafUrl, 'https://elsewhere.example/product'), 'computacion').length, 0);
});

test('RAF pagination is bounded and refuses next links outside the current category', async () => {
  const requested: string[] = [];
  mock.method(globalThis, 'fetch', async (url: string) => {
    requested.push(String(url));
    return new Response(rafHtml + '<a class="next js-search-link" href="https://elsewhere.example/private">Next</a>');
  });
  const products = await rafScraper.scrape({ categories: ['gaming'], maxItemsPerCategory: 50 });
  assert.equal(products.length, 1); assert.equal(requested.length, 1);
  assert.equal(requested[0], 'https://www.rafenlinea.com/200-consolas');
});

test('RAF reports a blocked category without inventing products or crashing the crawl', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('', { status: 403 }));
  let issues = 0;
  const products = await rafScraper.scrape({ categories: ['fotografia'], onIssue: () => { issues++; } });
  assert.deepEqual(products, []); assert.equal(issues, 4);
});

test('a shared Intel processor code cannot masquerade as the laptop manufacturer model', () => {
  assert.equal(extractModelCode('Laptop Dell Latitude Intel Core i5-1335U 8GB', 'Dell'), null);
  assert.equal(extractModelCode('Laptop HP 15-FC0250LA Ryzen 5', 'HP'), '15-FC0250LA');
});
