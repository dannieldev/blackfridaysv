export type ProductCategory = 
  | 'tv_audio' 
  | 'smartphones' 
  | 'computacion' 
  | 'linea_blanca' 
  | 'gaming';

export interface ScrapedProduct {
  storeId: string;
  storeSku: string;
  title: string;
  brand: string;
  category: ProductCategory;
  regularPrice: number | null;
  offerPrice: number;
  productUrl: string;
  imageUrl: string | null;
  inStock: boolean;
  modelCode: string | null;
}

export interface ScrapeOptions {
  maxItemsPerCategory?: number;
  categories?: ProductCategory[];
  searchTerms?: string[];
}

export interface StoreScraper {
  storeId: string;
  storeName: string;
  scrape(options?: ScrapeOptions): Promise<ScrapedProduct[]>;
}
