import type { ProductCategory, ScrapedProduct, ScrapeOptions, StoreScraper } from '../types.js';
import { cleanTitle, extractModelCode } from '../core/normalizer.js';
import { isExcludedFromCatalog } from '../core/catalog-policy.js';
import { decodeHtmlEntities, detectBrand } from './magento-adapter.js';

const origin = 'https://aeon.com.sv';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const categories: { category: ProductCategory; path: string }[] = [
  { category: 'computacion', path: '/shop/category/computadoras-laptops-423' },
  { category: 'computacion', path: '/shop/category/perifericos-monitores-487' },
  { category: 'computacion', path: '/shop/category/tablets-401' },
  { category: 'computacion', path: '/shop/category/impresores-y-suministros-impresores-467' },
  { category: 'gaming', path: '/shop/category/consola-video-juego-571' },
  { category: 'tv_audio', path: '/shop/category/smart-life-smart-tv-557' },
  { category: 'tv_audio', path: '/shop/category/smart-life-televisor-561' },
  { category: 'tv_audio', path: '/shop/category/perifericos-audifonos-y-headset-433' },
  { category: 'smartphones', path: '/shop/category/smart-life-smartphones-393' },
];

function parseNumericPrice(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/,/g, '').replace(/[^\d.]/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/**
 * Parsea las tarjetas SSR de Odoo eCommerce en aeon.com.sv (schema.org/Product).
 */
export function parseAeonListing(html: string, category: ProductCategory, maxItems = 50): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const blocks = html.match(/<form\b[^>]*itemtype="http:\/\/schema\.org\/Product"[^>]*>[\s\S]*?<\/form>/gi) ?? [];

  for (const block of blocks) {
    if (products.length >= maxItems) break;

    const sku =
      block.match(/<input[^>]*name="product_id"[^>]*value="(\d+)"/i)?.[1] ??
      block.match(/product\.template\/(\d+)\//i)?.[1];
    if (!sku) continue;

    const hrefMatch =
      block.match(/<a\b[^>]*itemprop="name"[^>]*href="([^"]+)"/i)?.[1] ??
      block.match(/<a\b[^>]*itemprop="url"[^>]*href="([^"]+)"/i)?.[1];
    if (!hrefMatch) continue;

    let productUrl: string;
    try {
      const parsed = new URL(decodeHtmlEntities(hrefMatch), origin);
      if (parsed.origin !== origin) continue;
      parsed.search = '';
      productUrl = parsed.href;
    } catch {
      continue;
    }

    const rawTitle =
      block.match(/<a\b[^>]*itemprop="name"[^>]*content="([^"]+)"/i)?.[1] ??
      block.match(/<a\b[^>]*itemprop="name"[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    if (!rawTitle) continue;

    const title = cleanTitle(decodeHtmlEntities(rawTitle.replace(/<[^>]+>/g, '')));
    if (!title) continue;

    const offerPrice = parseNumericPrice(
      block.match(/<span\b[^>]*itemprop="price"[^>]*>([\d.,]+)<\/span>/i)?.[1] ??
      block.match(/class="oe_currency_value">([\d.,]+)<\/span>/i)?.[1]
    );
    if (offerPrice <= 0) continue;

    const delBlock = block.match(/<del\b[^>]*>[\s\S]*?<\/del>/i)?.[0] ?? '';
    const oldPrice = parseNumericPrice(
      delBlock.match(/class="oe_currency_value">([\d.,]+)<\/span>/i)?.[1]
    );
    const regularPrice = oldPrice > offerPrice ? oldPrice : null;

    if (isExcludedFromCatalog({ title, category, productUrl, offerPrice })) continue;

    const imgSrc = block.match(/<img\b[^>]*itemprop="image"[^>]*src="([^"]+)"/i)?.[1];
    let imageUrl: string | null = null;
    if (imgSrc) {
      try {
        imageUrl = new URL(decodeHtmlEntities(imgSrc), origin).href;
      } catch {
        imageUrl = null;
      }
    }

    const availableAttr = block.match(/data-pp-available="([01])"/i)?.[1];
    const inStock = availableAttr !== undefined
      ? availableAttr === '1'
      : !/agotado|out of stock/i.test(block);

    const brand = detectBrand(title);
    const modelCode = extractModelCode(title, brand, productUrl);

    products.push({
      storeId: 'aeon',
      storeSku: sku,
      title,
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

export const aeonScraper: StoreScraper = {
  storeId: 'aeon',
  storeName: 'Aeon El Salvador',

  async scrape(options?: ScrapeOptions): Promise<ScrapedProduct[]> {
    const products = new Map<string, ScrapedProduct>();
    const limit = Math.min(options?.maxItemsPerCategory ?? 50, 80);

    for (const entry of categories) {
      if (options?.categories && !options.categories.includes(entry.category)) continue;

      try {
        let count = 0;
        for (let page = 1; page <= 2 && count < limit; page++) {
          const path = page === 1 ? entry.path : `${entry.path}/page/${page}`;
          const url = new URL(path, origin).href;
          const res = await fetch(url, {
            signal: AbortSignal.timeout(20000),
            headers: {
              'User-Agent': UA,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'es-SV,es;q=0.9,en;q=0.8',
            },
          });
          if (!res.ok) {
            if (page === 1) throw new Error(`Aeon HTTP ${res.status}`);
            break;
          }
          const html = await res.text();
          const rows = parseAeonListing(html, entry.category, limit - count);
          if (!rows.length) break;
          for (const product of rows) {
            if (!products.has(product.storeSku)) {
              products.set(product.storeSku, product);
              count++;
            }
          }
          if (!html.includes(`/page/${page + 1}`)) break;
        }
      } catch (error) {
        options?.onIssue?.();
        console.error(
          `[Aeon] ${entry.path}: ${error instanceof Error ? error.message : 'falló la consulta'}`
        );
      }
    }

    return [...products.values()];
  },
};
