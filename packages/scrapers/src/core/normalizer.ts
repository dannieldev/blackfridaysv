import { ProductCategory } from '../types.js';

/**
 * Normaliza y extrae el código de modelo (MPN) de un título de producto.
 * Permite emparejar productos idénticos vendidos bajo distintos nombres entre Siman, Prado, Curacao y Walmart.
 */
export function extractModelCode(title: string, brand: string): string | null {
  const cleanTitle = title.toUpperCase().trim();

  // Patrones comunes de modelos por marca
  const brandPatterns: Record<string, RegExp[]> = {
    // LG TVs / Audio: ej. 55UR7800PSB, OLED55C3PSA, 65QNED80SRA
    LG: [
      /\b([0-9]{2}[A-Z]{2,4}[0-9]{4}[A-Z]{0,4})\b/i,
      /\b(OLED[0-9]{2}[A-Z0-9]+)\b/i,
      /\b([0-9]{2}[A-Z]{1,2}[0-9]{3}[A-Z0-9]*)\b/i,
    ],
    // Samsung: ej. UN55CU7000FXZA, QN65Q60CAFXZA, SM-S928B, SM-A556B
    SAMSUNG: [
      /\b(SM-[A-Z0-9]{4,6})\b/i, // Galaxy Phones
      /\b([A-Z]{2}[0-9]{2}[A-Z0-9]{4,12})\b/i, // Samsung TVs (QN65..., UN55...)
    ],
    // Apple: ej. A2849, A3106, MYD82LL/A o nombres canónicos (iPhone 15 Pro 128GB)
    APPLE: [
      /\b(A[0-9]{4})\b/i,
      /\b(IPHONE\s+(?:1[1-6]|SE|X|XR|XS)(?:\s+(?:PRO\s+MAX|PRO|PLUS))?(?:\s+[0-9]+GB)?)\b/i,
      /\b(MACBOOK\s+(?:AIR|PRO)(?:\s+M[1-4])?(?:\s+[0-9]{2}[\"'\s])?)\b/i,
    ],
    // Sony: ej. WH-1000XM5, XR-55A80L, CFI-2015
    SONY: [
      /\b(WH-[0-9]{4}XM[0-9])\b/i,
      /\b(XR-[0-9]{2}[A-Z0-9]+)\b/i,
      /\b(CFI-[0-9]{4}[A-Z]?)\b/i, // PS5
    ],
    // TCL / Hisense: ej. 55Q650G, 50P635, 55U6K
    TCL: [/\b([0-9]{2}[A-Z][0-9]{3,4}[A-Z]?)\b/i],
    HISENSE: [/\b([0-9]{2}[A-Z][0-9]{1,2}[A-Z0-9]*)\b/i],
    // Nintendo: ej. HEG-001 (OLED), HAC-001
    NINTENDO: [/\b(HEG-[0-9]{3}|HAC-[0-9]{3})\b/i],
  };

  const normalizedBrand = brand.toUpperCase().trim();
  const patterns = brandPatterns[normalizedBrand];

  if (patterns) {
    for (const pattern of patterns) {
      const match = cleanTitle.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }

  // Fallback genérico: busca secuencias de letras y números típicas de números de modelo (ej: 55UR7800, SM-G990)
  const genericMatch = cleanTitle.match(/\b([A-Z0-9]{2,5}-[A-Z0-9]{3,6})\b/i) ||
                       cleanTitle.match(/\b([0-9]{2}[A-Z]{2,4}[0-9]{3,4}[A-Z0-9]*)\b/i);

  if (genericMatch && genericMatch[1]) {
    return genericMatch[1].trim();
  }

  return null;
}

/**
 * Normaliza nombres de marca a su forma estándar canónica
 */
export function normalizeBrand(brand: string): string {
  if (!brand) return 'Genérico';
  const b = brand.trim().toLowerCase();
  
  if (b.includes('samsung')) return 'Samsung';
  if (b.includes('apple') || b.includes('iphone') || b.includes('macbook')) return 'Apple';
  if (b.includes('lg')) return 'LG';
  if (b.includes('sony') || b.includes('playstation')) return 'Sony';
  if (b.includes('tcl')) return 'TCL';
  if (b.includes('hisense')) return 'Hisense';
  if (b.includes('xiaomi') || b.includes('redmi') || b.includes('poco')) return 'Xiaomi';
  if (b.includes('mabe')) return 'Mabe';
  if (b.includes('whirlpool')) return 'Whirlpool';
  if (b.includes('nintendo')) return 'Nintendo';
  if (b.includes('lenovo')) return 'Lenovo';
  if (b.includes('hp') || b.includes('hewlett')) return 'HP';
  if (b.includes('dell')) return 'Dell';
  if (b.includes('oster')) return 'Oster';

  // Capitalización de la primera letra
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

/**
 * Limpia el título removiendo palabras de relleno publicitario de los almacenes
 */
export function cleanTitle(title: string): string {
  return title
    .replace(/\b(OFERTA|PROMOCION|DESCUENTO|SUPER PRECIO|NUEVO|EXCLUSIVO|COMBO|REGALO)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
