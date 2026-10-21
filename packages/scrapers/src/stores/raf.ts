import type { ProductCategory, ScrapedProduct, ScrapeOptions, StoreScraper } from '../types.js';
import { cleanTitle, extractModelCode } from '../core/normalizer.js';
import { decodeHtmlEntities, detectBrand } from './magento-adapter.js';

const origin = 'https://www.rafenlinea.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const categories: { category: ProductCategory; path: string }[] = [
  { category: 'computacion', path: '/39-laptops' }, { category: 'computacion', path: '/41-monitores' },
  { category: 'computacion', path: '/264-multifuncionales' }, { category: 'smartphones', path: '/52-telefonos' },
  { category: 'tv_audio', path: '/36-bocinas' }, { category: 'tv_audio', path: '/31-audifonos-y-manos-libres' },
  { category: 'gaming', path: '/200-consolas' },
  { category: 'fotografia', path: '/18-camaras-mirrorless' },
  { category: 'fotografia', path: '/15-camaras-dslr' },
  { category: 'fotografia', path: '/336-camaras-de-accion' },
  { category: 'fotografia', path: '/19-camaras-instantaneas' },
];
const price = (value: string | undefined) => Number((value ?? '').replace(/<[^>]*>/g, '').replace(/[^\d.]/g, ''));

export function parseRafListing(html: string, category: ProductCategory): ScrapedProduct[] {
  const names = new Map<string, string>();
  for (const script of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(script[1]);
      if (data['@type'] === 'ItemList') for (const item of data.itemListElement ?? []) {
        if (typeof item.url === 'string' && typeof item.name === 'string') names.set(item.url, item.name);
      }
    } catch { /* A malformed optional structured-data block does not erase the listing. */ }
  }
  return (html.match(/<article\b[^>]*class="[^"]*product-miniature[^"]*"[^>]*>[\s\S]*?<\/article>/g) ?? []).flatMap(block => {
    const id = block.match(/data-id-product="(\d+)"/)?.[1];
    const variant = block.match(/data-id-product-attribute="(\d+)"/)?.[1];
    const productUrl = decodeHtmlEntities(block.match(/<a\b[^>]*href="([^"]+)"/)?.[1] ?? '');
    const rawName = names.get(productUrl) ?? block.match(/<h[23]\b[^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/)?.[1];
    const offerPrice = price(block.match(/<span\b[^>]*class="price"[^>]*>([\s\S]*?)<\/span>/)?.[1]);
    if (!id || !rawName || !Number.isFinite(offerPrice) || offerPrice <= 0 || !productUrl.startsWith(`${origin}/`)) return [];
    const title = cleanTitle(decodeHtmlEntities(rawName).replace(/<[^>]*>/g, ''));
    const regular = price(block.match(/<span\b[^>]*class="regular-price"[^>]*>([\s\S]*?)<\/span>/)?.[1]);
    const image = block.match(/<img\b[^>]*class="thumbnail-img"[^>]*>/)?.[0];
    const imageUrl = image?.match(/\ssrc="([^"]+)"/)?.[1];
    const buy = block.match(/<button\b[^>]*data-button-action="add-to-cart"[^>]*>/)?.[0];
    const brand = detectBrand(title);
    return [{ storeId: 'raf', storeSku: variant && variant !== '0' ? `${id}.${variant}` : id, title, brand, category,
      modelCode: extractModelCode(title, brand), offerPrice, regularPrice: regular > offerPrice ? regular : null,
      productUrl, imageUrl: imageUrl ? decodeHtmlEntities(imageUrl) : null,
      inStock: buy ? !/\bdisabled\b/.test(buy) : /agotado|out.of.stock/i.test(block) ? false : null }];
  });
}

export const rafScraper: StoreScraper = {
  storeId: 'raf', storeName: 'RAF El Salvador',
  async scrape(options?: ScrapeOptions) {
    const products = new Map<string, ScrapedProduct>();
    const limit = Math.min(options?.maxItemsPerCategory ?? 50, 100);
    for (const entry of categories) {
      if (options?.categories && !options.categories.includes(entry.category)) continue;
      let next: string | null = new URL(entry.path, origin).href;
      let count = 0;
      const visited = new Set<string>();
      try {
        while (next && count < limit && !visited.has(next)) {
          visited.add(next);
          const response: Response = await fetch(next, {
            signal: AbortSignal.timeout(20000),
            headers: { 'User-Agent': UA, 'Accept': '*/*' },
          });
          if (!response.ok) throw new Error(`RAF HTTP ${response.status}`);
          const html: string = await response.text();
          const rows = parseRafListing(html, entry.category);
          if (!rows.length) throw new Error('RAF: listado sin productos verificables');
          for (const product of rows.slice(0, limit - count)) products.set(product.storeSku, product);
          count += rows.length;
          const anchor = html.match(/<a\b[^>]*class="[^"]*\bnext\b[^"]*"[^>]*>/)?.[0];
          const href = anchor?.match(/href="([^"]+)"/)?.[1];
          const candidate = href ? new URL(decodeHtmlEntities(href), origin) : null;
          next = candidate?.origin === origin && candidate.pathname === entry.path ? candidate.href : null;
        }
      } catch (error) { options?.onIssue?.(); console.error(`[RAF] ${entry.path}: ${error instanceof Error ? error.message : 'falló la consulta'}`); }
    }
    return [...products.values()];
  },
};
