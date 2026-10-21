import { ScrapedProduct, ProductCategory, ScrapeOptions } from '../types.js';
import { extractModelCode, normalizeBrand, cleanTitle } from '../core/normalizer.js';
import { isExcludedFromCatalog } from '../core/catalog-policy.js';

export interface VtexStoreConfig {
  storeId: string;
  storeName: string;
  baseUrl: string; // ej: 'https://sv.siman.com' o 'https://www.walmart.com.sv'
  categoriesToSearch: {
    category: ProductCategory;
    terms?: string[];
    categoryPaths?: string[];
  }[];
}

interface VtexProduct {
  productId: string;
  productName: string;
  brand: string;
  categories?: string[];
  link: string;
  items?: Array<{
    itemId?: string;
    variations?: string[];
    [key: string]: unknown;
    images?: Array<{ imageUrl: string }>;
    sellers?: Array<{
      sellerId?: string;
      sellerName?: string;
      commertialOffer?: {
        Price: number;
        ListPrice: number;
        AvailableQuantity: number;
      };
    }>;
  }>;
}

export class VtexStoreAdapter {
  private config: VtexStoreConfig;

  constructor(config: VtexStoreConfig) {
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

      const searches = [
        ...(catConfig.terms ?? []).map(term => ({ key: 'ft', value: term })),
        ...(catConfig.categoryPaths ?? []).map(path => ({ key: 'fq', value: `C:/${path}/` })),
      ];
      for (const search of searches) {
        try {
          const products = await this.searchVtexCatalog(search, maxPerCat, catConfig.category);
          for (const prod of products) {
            if (!seenSkus.has(prod.storeSku)) {
              seenSkus.add(prod.storeSku);
              allProducts.push(prod);
            }
          }
        } catch (err) {
          options?.onIssue?.();
          console.error(`[${this.config.storeName}] Error consultando "${search.value}":`, err);
        }
      }
    }

    console.log(`[${this.config.storeName}] Total productos extraídos: ${allProducts.length}`);
    return allProducts;
  }

  private async searchVtexCatalog(
    query: { key: string; value: string },
    limit: number,
    category: ProductCategory
  ): Promise<ScrapedProduct[]> {
    const to = Math.min(limit - 1, 49);
    const url = `${this.config.baseUrl}/api/catalog_system/pub/products/search?${query.key}=${encodeURIComponent(query.value)}&_from=0&_to=${to}`;

    let res: Response | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        res = await fetch(url, {
          signal: AbortSignal.timeout(20000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
        });

        if (res.ok) break;

        if (res.status === 503 || res.status === 429) {
          await new Promise((r) => setTimeout(r, 800 * attempts));
          continue;
        }

        throw new Error(`VTEX HTTP Error ${res.status}: ${res.statusText}`);
      } catch (err) {
        if (attempts >= maxAttempts) throw err;
        await new Promise((r) => setTimeout(r, 800 * attempts));
      }
    }

    if (!res || !res.ok) {
      throw new Error('VTEX no respondió después de los reintentos.');
    }

    const data: VtexProduct[] = await res.json();
    if (!Array.isArray(data)) throw new Error('VTEX devolvió un catálogo con formato inválido.');

    return parseVtexProducts(data, this.config, category);
  }
}

export function parseVtexProducts(data: VtexProduct[], config: Pick<VtexStoreConfig, 'storeId' | 'baseUrl'>, category: ProductCategory): ScrapedProduct[] {
  return data.flatMap(p => {
    if (!p.productName || isExcludedFromCatalog({ title: p.productName, categories: p.categories, productUrl: p.link })) return [];
    const fashion = category === 'moda_calzado';
    if (fashion && !p.categories?.some(path => /\/(?:Moda|Ropa[^/]*|Calzado[^/]*|Accesorios)\//i.test(path))) return [];
    const candidates = (fashion ? p.items ?? [] : p.items?.slice(0, 1) ?? []).flatMap(item =>
      (fashion ? item.sellers ?? [] : item.sellers?.slice(0, 1) ?? []).map(seller => ({ item, seller, offer: seller.commertialOffer })))
      .filter(c => c.offer && Number.isFinite(c.offer.Price) && c.offer.Price > 0);
    // Fashion history belongs to one SKU and seller; changing size must not create a fake price drop.
    if (fashion) candidates.sort((a, b) => Number((b.offer!.AvailableQuantity ?? 0) > 0) - Number((a.offer!.AvailableQuantity ?? 0) > 0)
      || a.offer!.Price - b.offer!.Price || String(a.item.itemId).localeCompare(String(b.item.itemId))
      || String(a.seller.sellerId).localeCompare(String(b.seller.sellerId)));
    const selected = candidates[0];
    if (!selected || !p.productId || !p.productName) return [];
    const { item, seller, offer } = selected;
    if (typeof p.link !== 'string' || !p.link) return [];
    let productUrl: URL;
    try { productUrl = new URL(p.link, config.baseUrl); } catch { return []; }
    if (productUrl.origin !== new URL(config.baseUrl).origin) return [];
    const sellerId = seller.sellerId ?? '1';
    if (fashion && (!item.itemId || !/^[A-Za-z0-9_-]+$/.test(item.itemId) || !/^[A-Za-z0-9_-]+$/.test(sellerId))) return [];
    const variants = (item.variations ?? []).flatMap(key => Array.isArray(item[key]) ? [`${key}: ${(item[key] as string[]).join(', ')}`] : []);
    const brand = fashion ? (p.brand?.trim() || 'Sin marca') : normalizeBrand(p.brand || 'Genérico');
    const title = cleanTitle(p.productName);
    const modelCode = extractModelCode(title, brand);
    if (fashion) productUrl.searchParams.set('skuId', item.itemId!);
    return [{
      storeId: config.storeId, storeSku: fashion ? `${p.productId}.${item.itemId}.${sellerId}` : p.productId,
      title: title + (fashion && variants.length ? ` · ${variants.join(' / ')}` : '')
        + (fashion && sellerId !== '1' && seller.sellerName ? ` · Vende ${seller.sellerName}` : ''),
      brand, category, modelCode: fashion ? null : modelCode,
      regularPrice: offer!.ListPrice > offer!.Price ? offer!.ListPrice : null,
      offerPrice: offer!.Price, productUrl: productUrl.href, imageUrl: item.images?.[0]?.imageUrl ?? null,
      inStock: typeof offer!.AvailableQuantity === 'number' ? offer!.AvailableQuantity > 0 : null,
    }];
  });
}
