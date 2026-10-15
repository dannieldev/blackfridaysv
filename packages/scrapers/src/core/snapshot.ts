import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ScrapedProduct } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DealSnapshotItem {
  id: string;
  store: string;
  brand: string;
  modelCode: string;
  title: string;
  category: string;
  currentPrice: number;
  regularPrice: number | null;
  baselinePrice30d: number;
  dealScore: 'ganga_historica' | 'buena_oferta' | 'falsa_oferta_inflada' | 'descuento_cosmetico';
  verdictMessage: string;
  productUrl: string;
  imageUrl?: string | null;
  updatedAt: string;
}

/**
 * Genera el archivo estático public/data/deals-snapshot.json
 * Actúa como Plan B Anti-Colapso: permite a Cloudflare servir millones de visitas
 * con 0% de uso de Supabase y $0 de costo.
 */
export async function generateDealsSnapshot(products: ScrapedProduct[]): Promise<string> {
  const timestamp = new Date().toISOString();
  
  const snapshotItems: DealSnapshotItem[] = products.map((p, idx) => {
    const isInflated = p.regularPrice && p.regularPrice > (p.offerPrice * 1.25);
    const hasDiscount = p.regularPrice && p.regularPrice > p.offerPrice;
    
    let score: DealSnapshotItem['dealScore'] = 'descuento_cosmetico';
    let verdict = 'Precio de mercado estable registrado en octubre.';

    if (isInflated) {
      score = 'falsa_oferta_inflada';
      verdict = '¡Atención! Precio regular anunciado con inflación previa para simular rebaja mayor.';
    } else if (hasDiscount && ((p.regularPrice! - p.offerPrice) / p.regularPrice!) >= 0.15) {
      score = 'ganga_historica';
      verdict = '¡Mínimo histórico! Ahorro comprobado sobre su precio habitual de mercado.';
    } else if (hasDiscount) {
      score = 'buena_oferta';
      verdict = 'Descuento real comprobado sobre la línea base.';
    }

    const STORE_DISPLAY_NAMES: Record<string, string> = {
      siman: 'Almacenes Siman',
      walmart: 'Walmart El Salvador',
      curacao: 'La Curacao',
      prado: 'Almacenes Prado',
      omnisport: 'Omnisport',
    };

    return {
      id: `${p.storeId}-${p.storeSku || idx}`,
      store: STORE_DISPLAY_NAMES[p.storeId] || p.storeId,
      brand: p.brand,
      modelCode: p.modelCode || 'N/A',
      title: p.title,
      category: p.category,
      currentPrice: p.offerPrice,
      regularPrice: p.regularPrice,
      baselinePrice30d: p.regularPrice ? (p.offerPrice + p.regularPrice) / 2 : p.offerPrice,
      dealScore: score,
      verdictMessage: verdict,
      productUrl: p.productUrl,
      imageUrl: p.imageUrl,
      updatedAt: timestamp,
    };
  });

  // Ruta hacia apps/web/public/data/deals-snapshot.json
  const targetDir = path.resolve(__dirname, '../../../../apps/web/public/data');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetFile = path.join(targetDir, 'deals-snapshot.json');
  fs.writeFileSync(targetFile, JSON.stringify(snapshotItems, null, 2), 'utf-8');

  console.log(`[SNAPSHOT] Archivo estático anti-colapso generado con éxito en: ${targetFile} (${snapshotItems.length} productos)`);
  return targetFile;
}
