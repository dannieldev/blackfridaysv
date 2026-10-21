import { ScrapedProduct, ProductCategory, ScrapeOptions } from '../types.js';
import { extractModelCode, normalizeBrand, cleanTitle } from '../core/normalizer.js';

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
  categoriesToSearch: {
    category: ProductCategory;
    /** Ruta de la página de categoría server-rendered (se concatena a baseUrl) */
    path: string;
  }[];
}

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
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

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
        const html = await this.fetchHtml(this.config.baseUrl + catConfig.path);
        const products = this.parseListing(html, catConfig.category, maxPerCat);
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
   * GET con retry/backoff (503/429) y soporte para servidores que responden
   * con headers HTTP gigantes (Prado/Fastly => HeadersOverflowError en Node).
   */
  private async fetchHtml(url: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': UA, 'Accept': '*/*' } });
        if (res.ok) return await res.text();
        // 503/429 = overload; 406/403 = el CDN de algunas tiendas alterna bloqueos
        // transitorios por ruta. Reintentar con backoff antes de rendirse.
        if ([503, 429, 406, 403].includes(res.status)) {
          await new Promise((r) => setTimeout(r, 800 * attempts));
          continue;
        }
        throw new Error(`Magento HTTP Error ${res.status}: ${res.statusText}`);
      } catch (err) {
        const overflow =
          err instanceof Error &&
          /headers overflow/i.test(`${err.message} ${(err as NodeJS.ErrnoException).cause ?? ''}`);
        if (overflow && this.config.largeHeaders) {
          const text = await this.fetchWithLargeHeaderParser(url);
          if (text !== null) return text;
        }
        if (attempts >= maxAttempts) throw err;
        await new Promise((r) => setTimeout(r, 800 * attempts));
      }
    }

    throw new Error(`Magento: no se pudo obtener ${url}`);
  }

  /** Reintenta con undici y un parser de headers ampliado (128 KB). */
  private async fetchWithLargeHeaderParser(url: string): Promise<string | null> {
    try {
      const undici = await import('undici');
      const agent = new undici.Agent({ maxHeaderSize: 131072 });
      const res = await undici.fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: { 'User-Agent': UA, 'Accept': '*/*' },
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
   * Parsea el listing server-rendered de Magento Luma. Cada tarjeta vive en un
   * <li class="...product-item..."> con data-product-sku y price-box con
   * data-price-type="finalPrice" / "oldPrice".
   */
  parseListing(html: string, category: ProductCategory, maxItems: number): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];
    const blocks = html.match(/<li[^>]*class="[^"]*product-item[^"]*"[^>]*>[\s\S]*?<\/li>/g) ?? [];

    for (const block of blocks) {
      if (products.length >= maxItems) break;

      const storeSku =
        block.match(/data-product-sku="([^"]+)"/)?.[1] ??
        block.match(/data-product-id="(\d+)"/)?.[1] ??
        block.match(/product-item-info_(\d+)/)?.[1];
      if (!storeSku) continue;

      const linkTag = block.match(/<a\s+([^>]*product-item-link[^>]*)>([\s\S]*?)<\/a>/);
      if (!linkTag) continue;

      const title = decodeHtmlEntities(linkTag[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      if (!title) continue;

      const productUrl = linkTag[1].match(/href="([^"]+)"/)?.[1] ?? '';
      if (!productUrl) continue;

      const offerPrice = parsePrice(
        block.match(/data-price-amount="([\d.]+)"\s+data-price-type="finalPrice"/)?.[1]
      );
      if (offerPrice <= 0) continue; // Sin precio válido no aporta al radar

      const oldPriceRaw = block.match(/data-price-amount="([\d.]+)"\s+data-price-type="oldPrice"/)?.[1];
      const oldPrice = parsePrice(oldPriceRaw);
      const regularPrice = oldPrice > offerPrice ? oldPrice : null;

      const brand = detectBrand(title);
      const cleanedTitle = cleanTitle(title);
      const modelCode = extractModelCode(cleanedTitle, brand);
      const imageTag = block.match(/<img\b[^>]*class="[^"]*product-image-photo[^"]*"[^>]*>/)?.[0] ?? '';
      const imageSource = imageTag.match(/data-src="([^"]+)"/)?.[1] ?? imageTag.match(/\ssrc="([^"]+)"/)?.[1];
      const imageUrl = imageSource && /^https?:/.test(imageSource) ? decodeHtmlEntities(imageSource) : null;
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
