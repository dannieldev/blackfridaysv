import { ScrapedProduct, ProductCategory, ScrapeOptions } from '../types.js';
import { extractModelCode, normalizeBrand, cleanTitle } from '../core/normalizer.js';

export interface VtexStoreConfig {
  storeId: string;
  storeName: string;
  baseUrl: string; // ej: 'https://sv.siman.com' o 'https://www.walmart.com.sv'
  categoriesToSearch: {
    category: ProductCategory;
    terms: string[];
  }[];
}

interface VtexProduct {
  productId: string;
  productName: string;
  brand: string;
  link: string;
  items?: Array<{
    images?: Array<{ imageUrl: string }>;
    sellers?: Array<{
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

      for (const term of catConfig.terms) {
        try {
          const products = await this.searchVtexCatalog(term, maxPerCat, catConfig.category);
          for (const prod of products) {
            if (!seenSkus.has(prod.storeSku)) {
              seenSkus.add(prod.storeSku);
              allProducts.push(prod);
            }
          }
        } catch (err) {
          options?.onIssue?.();
          console.error(`[${this.config.storeName}] Error buscando término "${term}":`, err);
        }
      }
    }

    console.log(`[${this.config.storeName}] Total productos extraídos: ${allProducts.length}`);
    return allProducts;
  }

  private async searchVtexCatalog(
    query: string,
    limit: number,
    category: ProductCategory
  ): Promise<ScrapedProduct[]> {
    const to = Math.min(limit - 1, 49); // VTEX soporta hasta 50 por página
    const url = `${this.config.baseUrl}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(query)}&_from=0&_to=${to}`;

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

    const products: ScrapedProduct[] = [];

    for (const p of data) {
      const item = p.items?.[0];
      const seller = item?.sellers?.[0];
      const offer = seller?.commertialOffer;

      if (!offer || typeof offer.Price !== 'number' || offer.Price <= 0) {
        continue; // Ignorar productos sin precio válido
      }

      const brand = normalizeBrand(p.brand || 'Genérico');
      const title = cleanTitle(p.productName || '');
      const modelCode = extractModelCode(p.productName, brand);
      const regularPrice = offer.ListPrice && offer.ListPrice > offer.Price ? offer.ListPrice : null;

      products.push({
        storeId: this.config.storeId,
        storeSku: p.productId,
        title,
        brand,
        category,
        regularPrice,
        offerPrice: offer.Price,
        productUrl: p.link,
        imageUrl: item?.images?.[0]?.imageUrl || null,
        inStock: (offer.AvailableQuantity ?? 0) > 0,
        modelCode,
      });
    }

    return products;
  }
}
