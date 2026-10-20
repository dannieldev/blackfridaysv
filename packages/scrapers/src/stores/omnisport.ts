import { Agent, fetch as undiciFetch } from 'undici';
import { StoreScraper, ScrapedProduct, ProductCategory, ScrapeOptions } from '../types.js';
import { extractModelCode, normalizeBrand, cleanTitle } from '../core/normalizer.js';

/**
 * Omnisport El Salvador — Plataforma propietaria en Laravel (PHP) con SSR.
 * 
 * Notas técnicas periciales:
 * - El servidor web omite el certificado intermedio en el handshake TLS, lo que produce
 *   UNABLE_TO_VERIFY_LEAF_SIGNATURE en clientes Node estrictos.
 *   Solución: Undici Agent con connect.rejectUnauthorized = false.
 * - Las rutas raíz (/categorias/video) listan subcategorías hijas; los productos residen en
 *   las hojas (/categorias/smart-tv, /categorias/celulares, etc.).
 * - Paginación estándar de Laravel mediante ?page=N (12 productos por página).
 * - Renderizado en servidor con tarjetas delimitadas por '<div class="rounded p-2 border h-full">'.
 */

const dispatcher = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

interface CategoryTarget {
  category: ProductCategory;
  subcategories: string[];
}

const OMNISPORT_CATEGORIES: CategoryTarget[] = [
  {
    category: 'tv_audio',
    subcategories: [
      'https://www.omnisport.com/categorias/smart-tv',
      'https://www.omnisport.com/categorias/4k-tv-y-8k-tv',
      'https://www.omnisport.com/categorias/oled-tv',
      'https://www.omnisport.com/categorias/qled-tv-y-qned-tv',
      'https://www.omnisport.com/categorias/barras-de-sonido',
      'https://www.omnisport.com/categorias/equipos-de-sonido',
    ],
  },
  {
    category: 'smartphones',
    subcategories: [
      'https://www.omnisport.com/categorias/celulares',
      'https://www.omnisport.com/categorias/smartwatch',
      'https://www.omnisport.com/categorias/tablets',
    ],
  },
  {
    category: 'computacion',
    subcategories: [
      'https://www.omnisport.com/categorias/computadoras',
      'https://www.omnisport.com/categorias/monitores',
      'https://www.omnisport.com/categorias/impresores',
    ],
  },
  {
    category: 'linea_blanca',
    subcategories: [
      'https://www.omnisport.com/categorias/refrigeradores',
      'https://www.omnisport.com/categorias/lavadoras',
      'https://www.omnisport.com/categorias/secadoras',
      'https://www.omnisport.com/categorias/cocinas',
      'https://www.omnisport.com/categorias/microondas',
      'https://www.omnisport.com/categorias/aires-acondicionados',
    ],
  },
  {
    category: 'gaming',
    subcategories: [
      'https://www.omnisport.com/categorias/consolas',
      'https://www.omnisport.com/categorias/juegos',
    ],
  },
];

export class OmnisportStoreScraper implements StoreScraper {
  readonly storeId = 'omnisport';
  readonly storeName = 'Omnisport El Salvador';

  async scrape(options?: ScrapeOptions): Promise<ScrapedProduct[]> {
    const maxPerCat = options?.maxItemsPerCategory ?? 50;
    const allProducts: ScrapedProduct[] = [];
    const seenSkus = new Set<string>();

    for (const catConfig of OMNISPORT_CATEGORIES) {
      if (options?.categories && !options.categories.includes(catConfig.category)) {
        continue;
      }

      console.log(`[${this.storeName}] Extrayendo categoría: ${catConfig.category}...`);
      let categoryProductCount = 0;

      for (const subcatUrl of catConfig.subcategories) {
        if (categoryProductCount >= maxPerCat) break;

        const subcatSlug = subcatUrl.split('/').pop() || subcatUrl;

        try {
          // Extraemos páginas hasta alcanzar el cupo o agotar el listado
          let page = 1;
          const maxPagesForSubcat = Math.ceil((maxPerCat - categoryProductCount) / 10) + 1;

          while (page <= Math.min(maxPagesForSubcat, 4)) {
            const pageUrl = page === 1 ? subcatUrl : `${subcatUrl}?page=${page}`;
            const html = await this.fetchHtml(pageUrl);

            if (!html) break;

            const parsed = this.parseProducts(html, catConfig.category);
            if (parsed.length === 0) break; // Fin de resultados

            let newFromPage = 0;
            for (const prod of parsed) {
              if (!seenSkus.has(prod.storeSku)) {
                seenSkus.add(prod.storeSku);
                allProducts.push(prod);
                categoryProductCount++;
                newFromPage++;

                if (categoryProductCount >= maxPerCat) break;
              }
            }

            if (newFromPage === 0 || categoryProductCount >= maxPerCat) break;
            page++;
          }
        } catch (err) {
          options?.onIssue?.();
          // Resiliencia: una subcategoría fallida jamás interrumpe la extracción de las demás
          console.warn(`[${this.storeName}] Advertencia en subcategoría "${subcatSlug}":`, (err as Error).message);
        }
      }

      console.log(`[${this.storeName}] Total acumulado categoría ${catConfig.category}: ${categoryProductCount}`);
    }

    console.log(`[${this.storeName}] Extracción completada. Total productos únicos: ${allProducts.length}`);
    return allProducts;
  }

  private async fetchHtml(url: string): Promise<string | null> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await undiciFetch(url, {
          dispatcher,
          signal: AbortSignal.timeout(20000),
          headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          },
        });

        if (res.ok) {
          return await res.text();
        }

        if ([503, 502, 504, 429, 406, 403].includes(res.status)) {
          await new Promise((r) => setTimeout(r, 800 * attempts));
          continue;
        }

        if (res.status === 404) {
          return null;
        }

        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      } catch (err) {
        if (attempts >= maxAttempts) {
          console.warn(`[${this.storeName}] Falló fetch en ${url} tras ${maxAttempts} intentos:`, (err as Error).message);
          throw err;
        }
        await new Promise((r) => setTimeout(r, 800 * attempts));
      }
    }

    throw new Error('Omnisport no respondió después de los reintentos.');
  }

  private parseProducts(html: string, category: ProductCategory): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];
    const blocks = html.split('<div class="rounded p-2 border h-full">');

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];

      // URL y SKU
      const urlMatch = block.match(/href="(https:\/\/www\.omnisport\.com\/productos\/[^"]+)"/i);
      if (!urlMatch) continue;
      const productUrl = urlMatch[1];
      const skuMatch = productUrl.match(/\/productos\/([^/?#]+)/);
      const storeSku = skuMatch ? skuMatch[1] : '';

      // Título
      const titleMatch = block.match(/<p class="font-gothic">\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/p>/i);
      const rawTitle = titleMatch
        ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim()
        : '';
      if (!rawTitle) continue;

      // Marca
      const brandMatch = block.match(/<p class="[^"]*text-black[^"]*">([\s\S]*?)<\/p>/i);
      const rawBrand = brandMatch ? brandMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      const brand = normalizeBrand(rawBrand || 'Genérico');
      const title = cleanTitle(rawTitle);
      const modelCode = extractModelCode(title, brand);

      // Imagen
      const imgMatch =
        block.match(/<img[^>]+src="([^"]+)"[^>]+class="inline rounded"/i) ||
        block.match(/<img[^>]+src="([^"]+)"/i);
      const imageUrl = imgMatch ? imgMatch[1] : null;

      // Precio de oferta (ej: $299.00)
      const offerMatch = block.match(
        /<span[^>]*class="text-sm"[^>]*>\$<\/span>\s*([0-9,]+)\.\s*<span[^>]*class="price-decimals"[^>]*>\s*([0-9]{2})\s*<\/span>/i
      );
      let offerPrice = 0;
      if (offerMatch) {
        const intPart = offerMatch[1].replace(/,/g, '');
        const decPart = offerMatch[2];
        offerPrice = parseFloat(`${intPart}.${decPart}`);
      } else {
        const simplePriceMatch = block.match(/class="text-main font-bold[^"]*"[^>]*>[\s\S]*?\$([0-9,]+(?:\.[0-9]{2})?)/i);
        if (simplePriceMatch) {
          offerPrice = parseFloat(simplePriceMatch[1].replace(/,/g, ''));
        }
      }

      if (offerPrice <= 0) continue;

      // Precio regular (tachado, ej: $385.00)
      const regMatch = block.match(/line-through[^>]*>\s*\$([0-9,]+(?:\.[0-9]{2})?)\s*<\/span>/i);
      let regularPrice: number | null = null;
      if (regMatch) {
        const parsedReg = parseFloat(regMatch[1].replace(/,/g, ''));
        if (parsedReg > offerPrice) regularPrice = parsedReg;
      }

      const inStock = block.includes('/carrito/agregar-producto') && !/agotado|out of stock/i.test(block);

      products.push({
        storeId: this.storeId,
        storeSku,
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
}

export const omnisportScraper = new OmnisportStoreScraper();
