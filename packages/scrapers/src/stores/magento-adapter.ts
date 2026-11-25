import { ScrapedProduct, ProductCategory, ScrapeOptions } from '../types.js';
import { extractModelCode, normalizeBrand, cleanTitle } from '../core/normalizer.js';
import { BLACK_FRIDAY_CATEGORY_MIN_PRICES, isExcludedFromCatalog } from '../core/catalog-policy.js';

export interface MagentoLiveSearchConfig {
  environmentId: string;
  apiKey: string;
  websiteCode: string;
  storeCode: string;
  storeViewCode: string;
}

export interface MagentoStoreConfig {
  storeId: string;
  storeName: string;
  baseUrl: string;
  /**
   * Activar cuando el servidor responde con headers HTTP gigantes
   * (Fastly/Imperva) que desbordan el parser por defecto de Node
   * (HeadersOverflowError). Requiere `undici` en dependencies.
   */
  largeHeaders?: boolean;
  /**
   * Configuración opcional de Adobe Commerce Catalog Service (Live Search GraphQL).
   * Permite extraer el catálogo de Grupo Unicomer (La Curacao, RadioShack, Almacenes Tropigas)
   * mediante JSON ligero en milisegundos sin bloqueos 406 de CDN y con MPN oficial.
   */
  liveSearch?: MagentoLiveSearchConfig;
  categoriesToSearch: {
    category: ProductCategory;
    /** Ruta de la página de categoría (ej. '/c/audio' o '/tv-y-entretenimiento') */
    path: string;
  }[];
}

interface CatalogServiceItem {
  productView?: {
    sku?: string;
    name?: string;
    url?: string;
    inStock?: boolean;
    images?: Array<{ url?: string }>;
    attributes?: Array<{ name?: string; label?: string; value?: string }>;
    price?: {
      final?: { amount?: { value?: number } };
      regular?: { amount?: { value?: number } };
    };
    priceRange?: {
      minimum?: {
        final?: { amount?: { value?: number } };
        regular?: { amount?: { value?: number } };
      };
    };
  };
}

const LIVE_SEARCH_QUERY = `query ($phrase: String!, $filter: [SearchClauseInput!], $pageSize: Int!) {
  productSearch(phrase: $phrase, filter: $filter, page_size: $pageSize, current_page: 1) {
    items {
      productView {
        sku
        name
        url
        inStock
        images { url }
        attributes { name label value }
        ... on SimpleProductView {
          price {
            final { amount { value } }
            regular { amount { value } }
          }
        }
        ... on ComplexProductView {
          priceRange {
            minimum {
              final { amount { value } }
              regular { amount { value } }
            }
          }
        }
      }
    }
  }
}`;

/** Marcas reconocibles en títulos de tiendas Magento (sin marca explícita en el listing) */
const KNOWN_BRANDS = [
  'Samsung', 'LG', 'Sony', 'Xiaomi', 'Redmi', 'Poco', 'Apple', 'iPhone', 'iPad', 'MacBook',
  'TCL', 'Hisense', 'Whirlpool', 'Mabe', 'Oster', 'HP', 'Hewlett', 'Lenovo', 'Dell',
  'Nintendo', 'Xbox', 'PlayStation', 'Epson', 'Honor', 'Huawei', 'Motorola', 'Nokia',
  'JBL', 'Bose', 'Acer', 'Asus', 'MSI', 'Electrolux', 'Frigidaire', 'Telstar', 'Kalley',
  'Noblex', 'Sanyo', 'Panasonic', 'Philips', 'Gemini', 'Haier', 'Daewoo', 'Continental',
  'RadioShack', 'Canon', 'Nikon', 'Fujifilm', 'Insta360', 'GoPro', 'Brother', 'Aiwa', 'CDP',
];

/** Decodifica entidades HTML comunes de Magento (&#x20;, &, &nbsp;...). */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function parsePrice(raw: string | undefined): number {
  if (!raw) return 0;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function detectBrand(title: string): string {
  const t = title.toLowerCase();
  for (const brand of KNOWN_BRANDS) {
    if (t.includes(brand.toLowerCase())) return normalizeBrand(brand);
  }
  return 'Genérico';
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export class MagentoStoreAdapter {
  private config: MagentoStoreConfig;

  constructor(config: MagentoStoreConfig) {
    this.config = config;
  }

  get storeId(): string {
    return this.config.storeId;
  }

  get storeName(): string {
    return this.config.storeName;
  }

  async scrape(options?: ScrapeOptions): Promise<ScrapedProduct[]> {
    const maxPerCat = options?.maxItemsPerCategory ?? 50;
    const allProducts: ScrapedProduct[] = [];
    const seenSkus = new Set<string>();

    for (const catConfig of this.config.categoriesToSearch) {
      if (options?.categories && !options.categories.includes(catConfig.category)) {
        continue;
      }

      console.log(`[${this.config.storeName}] Extrayendo categoría: ${catConfig.category}...`);

      try {
        const products = this.config.liveSearch
          ? await this.fetchLiveSearchCategory(catConfig.path, catConfig.category, maxPerCat)
          : this.parseListing(await this.fetchHtml(this.config.baseUrl + catConfig.path), catConfig.category, maxPerCat);

        for (const prod of products) {
          if (!seenSkus.has(prod.storeSku)) {
            seenSkus.add(prod.storeSku);
            allProducts.push(prod);
          }
        }
        console.log(`[${this.config.storeName}] ${products.length} productos en ${catConfig.path}`);
      } catch (err) {
        options?.onIssue?.();
        // Fallback graceful: una categoría caída nunca tira el proceso completo
        console.error(`[${this.config.storeName}] Error en categoría "${catConfig.path}":`, err);
      }
    }

    console.log(`[${this.config.storeName}] Total productos extraídos: ${allProducts.length}`);
    return allProducts;
  }

  /**
   * Consulta el endpoint JSON GraphQL de Adobe Commerce Catalog Service (Live Search).
   */
  async fetchLiveSearchCategory(path: string, category: ProductCategory, maxItems: number): Promise<ScrapedProduct[]> {
    const ls = this.config.liveSearch!;
    const categoryPath = path.replace(/^\/+|\/+$/g, '');
    const minPrice = BLACK_FRIDAY_CATEGORY_MIN_PRICES[category] ?? 25;
    const pageSize = Math.min(Math.max(maxItems, 24), 60);

    const res = await fetch('https://catalog-service.adobe.io/graphql', {
      method: 'POST',
      signal: AbortSignal.timeout(20000),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Magento-Environment-Id': ls.environmentId,
        'Magento-Website-Code': ls.websiteCode,
        'Magento-Store-Code': ls.storeCode,
        'Magento-Store-View-Code': ls.storeViewCode,
        'X-Api-Key': ls.apiKey,
      },
      body: JSON.stringify({
        query: LIVE_SEARCH_QUERY,
        variables: {
          phrase: '',
          pageSize,
          filter: [
            { attribute: 'categoryPath', eq: categoryPath },
            { attribute: 'visibility', in: ['Catalog', 'Catalog, Search'] },
            { attribute: 'inStock', eq: 'true' },
            { attribute: 'price', range: { from: minPrice, to: 4500 } },
          ],
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`LiveSearch GraphQL HTTP ${res.status}`);
    }

    const payload = (await res.json()) as { data?: { productSearch?: { items?: CatalogServiceItem[] } } };
    const items = payload.data?.productSearch?.items;
    if (!Array.isArray(items)) {
      throw new Error('LiveSearch GraphQL devolvió respuesta sin lista de productos');
    }

    return this.parseLiveSearchItems(items, category, maxItems);
  }

  parseLiveSearchItems(items: CatalogServiceItem[], category: ProductCategory, maxItems: number): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];
    const expectedOrigin = new URL(this.config.baseUrl).origin;

    for (const entry of items) {
      if (products.length >= maxItems) break;
      const pv = entry.productView;
      if (!pv?.sku || !pv?.name || !pv?.url) continue;

      const finalVal = pv.price?.final?.amount?.value ?? pv.priceRange?.minimum?.final?.amount?.value ?? 0;
      const regVal = pv.price?.regular?.amount?.value ?? pv.priceRange?.minimum?.regular?.amount?.value ?? 0;
      const offerPrice = parsePrice(String(finalVal));
      const oldPrice = parsePrice(String(regVal));
      if (offerPrice <= 0) continue;

      let productUrl = pv.url.trim();
      try {
        const parsedUrl = new URL(productUrl, this.config.baseUrl);
        if (parsedUrl.origin !== expectedOrigin) continue;
        productUrl = parsedUrl.href;
      } catch {
        continue;
      }

      const title = cleanTitle(decodeHtmlEntities(pv.name));
      if (!title || isExcludedFromCatalog({ title, category, productUrl, offerPrice })) continue;

      const attrs = pv.attributes ?? [];
      const brandAttr = attrs.find(a => a.name === 'marca')?.value?.trim();
      const mpnAttr =
        attrs.find(a => a.name === 'mpn_iden_del_prod_t')?.value?.trim() ||
        attrs.find(a => a.name === 'modelo_comercial_iden_del_prod_t')?.value?.trim() ||
        null;

      const brand = brandAttr ? normalizeBrand(brandAttr) : detectBrand(title);
      const modelCode = extractModelCode(title, brand, mpnAttr);
      const imageRaw = pv.images?.[0]?.url;
      const imageUrl = imageRaw && /^https?:/.test(imageRaw) ? decodeHtmlEntities(imageRaw) : null;

      products.push({
        storeId: this.config.storeId,
        storeSku: String(pv.sku).trim(),
        title,
        brand,
        category,
        regularPrice: oldPrice > offerPrice ? oldPrice : null,
        offerPrice,
        productUrl,
        imageUrl,
        inStock: pv.inStock ?? true,
        modelCode,
      });
    }

    return products;
  }

  /**
   * GET con retry/backoff (503/429) y soporte para servidores que responden
   * con headers HTTP gigantes (Prado/Fastly => HeadersOverflowError en Node).
   */
  private async fetchHtml(url: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(20000),
          headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-SV,es;q=0.9,en;q=0.8',
          },
        });
        if (res.ok) return await res.text();
        if ([503, 429, 406, 403].includes(res.status)) {
          await new Promise((r) => setTimeout(r, 800 * attempts));
          continue;
        }
        throw new Error(`Magento HTTP Error ${res.status}: ${res.statusText}`);
      } catch (err) {
        const isOverflowOrTls =
          err instanceof Error &&
          /headers overflow|unable to verify/i.test(`${err.message} ${(err as NodeJS.ErrnoException).cause ?? ''}`);
        if (isOverflowOrTls) {
          const text = await this.fetchWithLargeHeaderParser(url);
          if (text !== null) return text;
        }
        if (attempts >= maxAttempts) throw err;
        await new Promise((r) => setTimeout(r, 800 * attempts));
      }
    }

    throw new Error(`Magento: no se pudo obtener ${url}`);
  }

  /** Reintenta con undici y un parser de headers ampliado (128 KB) con TLS permisivo. */
  private async fetchWithLargeHeaderParser(url: string): Promise<string | null> {
    try {
      const undici = await import('undici');
      const agent = new undici.Agent({ maxHeaderSize: 131072, connect: { rejectUnauthorized: false } });
      const res = await undici.fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-SV,es;q=0.9,en;q=0.8',
        },
        dispatcher: agent,
      });
      if (!res.ok) return null;
      return await res.text();
    } catch (err) {
      console.warn(`[${this.config.storeName}] Fallback undici falló:`, err);
      return null;
    }
  }

  /**
   * Parsea el listing server-rendered de Magento Luma. Soporta tanto `<li class="...product-item...">`
   * como bloques `<div class="...product-item-info...">` de Magezon PageBuilder.
   */
  parseListing(html: string, category: ProductCategory, maxItems: number): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];
    const liBlocks = html.match(/<li[^>]*class="[^"]*product-item[^"]*"[^>]*>[\s\S]*?<\/li>/g) ?? [];
    const divBlocks = liBlocks.length
      ? []
      : html.split(/<div[^>]*class="[^"]*product-item-info[^"]*"[^>]*>/i).slice(1);
    const blocks = liBlocks.length ? liBlocks : divBlocks;

    for (const block of blocks) {
      if (products.length >= maxItems) break;

      const linkTag = block.match(/<a\s+([^>]*product-item-link[^>]*)>([\s\S]*?)<\/a>/);
      if (!linkTag) continue;

      const title = decodeHtmlEntities(linkTag[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      if (!title) continue;

      const productUrl = decodeHtmlEntities(linkTag[1].match(/href="([^"]+)"/)?.[1] ?? '');
      if (!productUrl) continue;

      const storeSku =
        block.match(/data-product-sku="([^"]+)"/)?.[1] ??
        block.match(/product-item-info_(\d+)/)?.[1] ??
        productUrl.match(/-(\d{8,14})\/p(?:$|\?)/)?.[1] ??
        block.match(/data-product-id="(\d+)"/)?.[1];
      if (!storeSku) continue;

      const offerPrice = parsePrice(
        block.match(/data-price-amount="([\d.]+)"\s+data-price-type="finalPrice"/)?.[1]
      );
      if (offerPrice <= 0) continue;

      const oldPriceRaw = block.match(/data-price-amount="([\d.]+)"\s+data-price-type="oldPrice"/)?.[1];
      const oldPrice = parsePrice(oldPriceRaw);
      const regularPrice = oldPrice > offerPrice ? oldPrice : null;

      const brand = detectBrand(title);
      const cleanedTitle = cleanTitle(title);
      const imageTag = block.match(/<img\b[^>]*class="[^"]*product-image-photo[^"]*"[^>]*>/)?.[0] ?? '';
      const imageSource = imageTag.match(/data-src="([^"]+)"/)?.[1] ?? imageTag.match(/\ssrc="([^"]+)"/)?.[1];
      const imageUrl = imageSource && /^https?:/.test(imageSource) ? decodeHtmlEntities(imageSource) : null;
      const modelCode = extractModelCode(cleanedTitle, brand, imageUrl);
      const inStock = !/agotado|out of stock|out-of-stock/i.test(block);

      products.push({
        storeId: this.config.storeId,
        storeSku,
        title: cleanedTitle,
        brand,
        category,
        regularPrice,
        offerPrice,
        productUrl,
        imageUrl,
        inStock,
        modelCode,
      });
    }

    return products;
  }
}
