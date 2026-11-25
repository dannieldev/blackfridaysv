import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { parseVtexProducts } from '../src/stores/vtex-adapter.js';
import { MagentoStoreAdapter } from '../src/stores/magento-adapter.js';
import { parseRafListing, rafScraper } from '../src/stores/raf.js';
import { parseOfficeDepotListing } from '../src/stores/officedepot.js';
import { parseAeonListing } from '../src/stores/aeon.js';
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
  assert.equal(extractModelCode('Celular Xiaomi Redmi Note 13 Pro 256GB', 'Xiaomi'), 'REDMI-NOTE-13-PRO-256GB');
  assert.equal(extractModelCode('Pantalla Dahua Smart TV 55" 4K', 'Dahua', 'TecnoAvance-DHI-LTV55-SN400_medidasTV.jpg'), 'DHI-LTV55-SN400');
});

test('Unicomer LiveSearch GraphQL extracts official MPN and filters out cheap accessories', () => {
  const adapter = new MagentoStoreAdapter({
    storeId: 'tropigas',
    storeName: 'Almacenes Tropigas',
    baseUrl: 'https://www.almacenestropigas.com.sv',
    categoriesToSearch: [],
  });
  const items = [
    {
      productView: {
        sku: '468955800012',
        name: 'Pantalla TCL 55" LED 4K UHD 55V6C',
        url: 'https://www.almacenestropigas.com.sv/televisor-tcl-google-tv-led-55-4k-uhd-55v6c-468955800012/p',
        inStock: true,
        images: [{ url: 'https://www.almacenestropigas.com.sv/media/catalog/product/4/6/468955800012.jpg' }],
        attributes: [
          { name: 'marca', value: 'TCL' },
          { name: 'mpn_iden_del_prod_t', value: '55V6C' },
        ],
        price: {
          final: { amount: { value: 349 } },
          regular: { amount: { value: 499 } },
        },
      },
    },
    {
      productView: {
        sku: '441826000001',
        name: 'Control Remoto Universal RadioShack Negro 1503281',
        url: 'https://www.almacenestropigas.com.sv/control-remoto-universal-441826000001/p',
        inStock: true,
        price: {
          final: { amount: { value: 8.99 } },
          regular: { amount: { value: 8.99 } },
        },
      },
    },
  ];
  const parsed = adapter.parseLiveSearchItems(items, 'tv_audio', 50);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].storeId, 'tropigas');
  assert.equal(parsed[0].brand, 'TCL');
  assert.equal(parsed[0].modelCode, '55V6C');
  assert.equal(parsed[0].offerPrice, 349);
  assert.equal(parsed[0].regularPrice, 499);
});

test('Office Depot listing parses valid laptops and excludes laptop backpacks', () => {
  const html = `
    <div class="product-item">
      <a href="/officedepotSV/en/Laptops/LAPTOP-HP-15-FC0250LA/p/10001"
         onclick="onProductClickDataLayer('10001','Laptop HP 15-FC0250LA Ryzen 5','Laptops','HP','549.00', 'title', 1);">
        <div class="name description-style"><h2>Laptop HP 15-FC0250LA Ryzen 5</h2></div>
        <div class="discountedPrice-grid">$549.<span class="decimal-digit-price-format">00</span></div>
        <div class="beforePrice-grid">$699.<span class="decimal-digit-price-format">00</span></div>
      </a>
    </div>
    <div class="product-item">
      <a href="/officedepotSV/en/Mochilas/MOCHILA-PARA-LAPTOP-TARGUS/p/10002"
         onclick="onProductClickDataLayer('10002','Mochila para Laptop Targus 15.6','Mochilas','TARGUS','37.90', 'title', 2);">
        <div class="name description-style"><h2>Mochila para Laptop Targus 15.6</h2></div>
        <div class="discountedPrice-grid">$37.<span class="decimal-digit-price-format">90</span></div>
      </a>
    </div>`;
  const parsed = parseOfficeDepotListing(html, 'computacion', 50);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].storeSku, '10001');
  assert.equal(parsed[0].brand, 'HP');
  assert.equal(parsed[0].modelCode, '15-FC0250LA');
  assert.equal(parsed[0].offerPrice, 549);
  assert.equal(parsed[0].regularPrice, 699);
});

test('Aeon Odoo SSR listing parses valid laptops with MPN and excludes cheap accessories', () => {
  const html = `
    <form action="/shop/cart/update" method="post" itemscope="itemscope" itemtype="http://schema.org/Product" data-pp-available="1">
      <input name="product_id" type="hidden" value="96895"/>
      <a itemprop="url" href="/shop/laptop-hp-victus-15-fa2014la-105290?category=423">
        <img itemprop="image" src="/web/image/product.template/105290/image_512"/>
      </a>
      <a itemprop="name" href="/shop/laptop-hp-victus-15-fa2014la-105290?category=423" content="Laptop HP Victus 15-fa2014la RTX 3050">Laptop HP Victus 15-fa2014la RTX 3050</a>
      <span itemprop="price">999.0</span>
      <del><span class="oe_currency_value">1,169.00</span></del>
    </form>
    <form action="/shop/cart/update" method="post" itemscope="itemscope" itemtype="http://schema.org/Product" data-pp-available="1">
      <input name="product_id" type="hidden" value="96896"/>
      <a itemprop="name" href="/shop/cable-usb-c-105291" content="Cable USB-C 2m">Cable USB-C 2m</a>
      <span itemprop="price">9.99</span>
    </form>`;
  const parsed = parseAeonListing(html, 'computacion', 50);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].storeId, 'aeon');
  assert.equal(parsed[0].storeSku, '96895');
  assert.equal(parsed[0].brand, 'HP');
  assert.equal(parsed[0].modelCode, '15-FA2014LA');
  assert.equal(parsed[0].offerPrice, 999);
  assert.equal(parsed[0].regularPrice, 1169);
  assert.equal(parsed[0].productUrl, 'https://aeon.com.sv/shop/laptop-hp-victus-15-fa2014la-105290');
  assert.equal(parsed[0].imageUrl, 'https://aeon.com.sv/web/image/product.template/105290/image_512');
});
