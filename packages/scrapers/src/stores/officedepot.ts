import type { ProductCategory, ScrapedProduct, ScrapeOptions, StoreScraper } from '../types.js';
import { cleanTitle, extractModelCode, normalizeBrand } from '../core/normalizer.js';
import { isExcludedFromCatalog } from '../core/catalog-policy.js';
import { decodeHtmlEntities, detectBrand } from './magento-adapter.js';

const ORIGIN = 'https://www.officedepot.com.sv';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const SEARCH_TARGETS: Array<{ category: ProductCategory; path: string }> = [
  { category: 'computacion', path: '/officedepotSV/en/search/?text=laptop' },
  { category: 'computacion', path: '/officedepotSV/en/search/?text=monitor' },
  { category: 'computacion', path: '/officedepotSV/en/search/?text=impresora' },
  { category: 'computacion', path: '/officedepotSV/en/search/?text=tablet' },
  { category: 'smartphones', path: '/officedepotSV/en/search/?text=smartphone' },
  { category: 'tv_audio', path: '/officedepotSV/en/search/?text=smart+tv' },
  { category: 'tv_audio', path: '/officedepotSV/en/search/?text=bocina+jbl' },
  { category: 'gaming', path: '/officedepotSV/en/search/?text=consola' },
];

function parseNumericPrice(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/<[^>]*>/g, '').replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function parseOfficeDepotListing(html: string, category: ProductCategory, maxItems = 50): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const seen = new Set<string>();
  const blocks = html.split(/<div\s+class="product-item[^"]*"/i).slice(1);

  for (const block of blocks) {
    if (products.length >= maxItems) break;

    const dlMatch = block.match(
      /onProductClickDataLayer\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([\d.]+)'/
    );
    const sku =
      dlMatch?.[1]?.trim() ??
      block.match(/<div\s+class="product-sku"[\s\S]*?<span[^>]*>(\d+)<\/span>/i)?.[1]?.trim();
    if (!sku || seen.has(sku)) continue;

    const rawTitle =
      block.match(/<div\s+class="name\s+description-style"[^>]*>\s*<h2>([\s\S]*?)<\/h2>/i)?.[1] ??
      dlMatch?.[2] ??
      '';
    const title = cleanTitle(decodeHtmlEntities(rawTitle.replace(/<[^>]*>/g, '')));
    if (!title) continue;

    const href =
      block.match(/<a\s+href="(\/officedepotSV\/[^"]+\/p\/\d+)"/i)?.[1] ?? '';
    if (!href) continue;
    const productUrl = new URL(decodeHtmlEntities(href), ORIGIN).href;

    const discountedHtml = block.match(
      /<div\s+class="discountedPrice-grid[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    )?.[1];
    const offerPrice = parseNumericPrice(discountedHtml) || parseNumericPrice(dlMatch?.[5]);
    if (offerPrice <= 0) continue;

    if (isExcludedFromCatalog({ title, category, productUrl, offerPrice })) continue;

    const beforeHtml = block.match(
      /<div\s+class="beforePrice-grid[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    )?.[1];
    const oldPrice = parseNumericPrice(beforeHtml);
    const regularPrice = oldPrice > offerPrice ? oldPrice : null;

    const rawBrand = dlMatch?.[4]?.trim() || '';
    const brand = rawBrand ? normalizeBrand(rawBrand) : detectBrand(title);
    const imgSrc =
      block.match(/<img[^>]+data-src="([^"]+)"/i)?.[1] ??
      block.match(/<img[^>]+src="([^"]+)"/i)?.[1];
    const imageUrl = imgSrc
      ? new URL(decodeHtmlEntities(imgSrc), ORIGIN).href
      : null;

    const inStock = !/class="text-agotado"|cnt-btn-noDisponible/i.test(block);
    const modelCode = extractModelCode(title, brand);

    seen.add(sku);
    products.push({
      storeId: 'officedepot',
      storeSku: sku,
      title,
      brand,
      category,
      modelCode,
      offerPrice,
      regularPrice,
      productUrl,
      imageUrl,
      inStock,
    });
  }

  return products;
}

export const officedepotScraper: StoreScraper = {
  storeId: 'officedepot',
  storeName: 'Office Depot El Salvador',
  async scrape(options?: ScrapeOptions): Promise<ScrapedProduct[]> {
    const maxPerCat = options?.maxItemsPerCategory ?? 50;
    const allProducts = new Map<string, ScrapedProduct>();

    for (const target of SEARCH_TARGETS) {
      if (options?.categories && !options.categories.includes(target.category)) continue;

      try {
        const res = await fetch(`${ORIGIN}${target.path}`, {
          signal: AbortSignal.timeout(20000),
          headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-SV,es;q=0.9,en;q=0.8',
          },
        });
        if (!res.ok) throw new Error(`Office Depot HTTP ${res.status}`);
        const html = await res.text();
        const rows = parseOfficeDepotListing(html, target.category, maxPerCat);
        for (const prod of rows) {
          if (!allProducts.has(prod.storeSku)) {
            allProducts.set(prod.storeSku, prod);
          }
        }
      } catch (err) {
        options?.onIssue?.();
        console.error(`[Office Depot El Salvador] Error en "${target.path}":`, err);
      }
    }

    return [...allProducts.values()];
  },
};
