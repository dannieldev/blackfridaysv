import { ProductCategory } from '../types.js';

/**
 * Normaliza y extrae el código de modelo (MPN) de un título de producto o metadato adicional.
 * Permite emparejar productos idénticos vendidos bajo distintos nombres entre todas las tiendas de El Salvador.
 * Retorna siempre un código sin espacios (usando guiones) compatible con el comparador pericial.
 */
export function extractModelCode(title: string, brand: string, extraHint?: string | null): string | null {
  const clean = `${title} ${extraHint ?? ''}`.replace(/_/g, ' ').toUpperCase().trim();
  const isAccessoryOrGame = /\b(JUEGO|VIDEOJUEGO|CONTROL|MANDO|DUALSENSE|JOY-?CON|HEADSET|AUDIFONOS|AURICULARES|FUNDA|CASE|COBERTOR|PROTECTOR|CARGADOR|CABLE|ADAPTADOR)\b/i.test(clean);
  const isConsole = /\bCONSOLA\b/i.test(clean) && !isAccessoryOrGame;

  // Patrones comunes de modelos por marca (priorizando códigos alfanuméricos exactos de fabricante)
  const brandPatterns: Record<string, RegExp[]> = {
    // LG TVs / Audio / Línea Blanca: ej. 55UR7800PSB, OLED55C3PSA, 65QNED80SRA, WT19BSB
    LG: [
      /\b([0-9]{2}[A-Z]{2,4}[0-9]{4}[A-Z]{0,4})\b/i,
      /\b(OLED[0-9]{2}[A-Z0-9]+)\b/i,
      /\b([0-9]{2}[A-Z]{1,2}[0-9]{3}[A-Z0-9]*)\b/i,
      /\b(WT[0-9]{2}[A-Z0-9]{3,8}|LM[0-9]{2,3}[A-Z0-9]{3,8}|GS[0-9]{2}[A-Z0-9]{3,8})\b/i,
    ],
    // Samsung: ej. UN55CU7000FXZA, QN65Q60CAFXZA, SM-S928B, SM-A556B
    SAMSUNG: [
      /\b(SM-[A-Z0-9]{4,7})\b/i,
      /\b([UQ]N[0-9]{2}[A-Z0-9]{4,12})\b/i,
      /\b(R[SBT][0-9]{2}[A-Z0-9]{5,10}|WA[0-9]{2}[A-Z0-9]{4,10})\b/i,
      ...(isAccessoryOrGame ? [] : [
        /\b(GALAXY\s+(?:S2[2-6]|A[0-5][0-9]|Z\s*FLIP\s*[4-7]|Z\s*FOLD\s*[4-7])(?:\s+(?:FE|ULTRA|PLUS|\+))?(?:\s+5G)?\s+[0-9]{2,3}\s*GB)\b/i,
      ]),
    ],
    // Apple: ej. A2849, A3106, IPHONE 15 PRO MAX 256GB
    APPLE: [
      /\b(A[0-9]{4})\b/i,
      ...(isAccessoryOrGame ? [] : [
        /\b(IPHONE\s+(?:1[2-6]|SE)(?:\s+(?:PRO\s+MAX|PRO|PLUS))?\s+[0-9]{2,3}\s*GB)\b/i,
      ]),
    ],
    // Sony: ej. WH-1000XM5, WF-1000XM5, XR-55A80L, CFI-2015
    SONY: [
      /\b(W[HF]-[0-9]{3,4}[A-Z0-9]*)\b/i,
      /\b(XR-[0-9]{2}[A-Z0-9]+|KD-[0-9]{2}[A-Z0-9]+)\b/i,
      /\b(CFI-[0-9]{4}[A-Z]?)\b/i,
      /\b(SRS-[A-Z]{2}[0-9]{2,3})\b/i,
      ...(isConsole ? [/\b(PLAYSTATION\s*5\s+(?:SLIM\s+DIGITAL|SLIM|PRO|DIGITAL))\b/i] : []),
    ],
    // HP: ej. 15-FC0250LA, 14-EP0012LA, 24-CR0233LA
    HP: [
      /\b([0-9]{2}-[A-Z]{2}[0-9]{4}[A-Z]{1,3})\b/i,
      /\b([0-9][A-Z0-9]{5,6}#[A-Z]{3})\b/i,
    ],
    // TCL / Hisense / Toshiba / Dahua
    TCL: [/\b([0-9]{2}[A-Z][0-9]{1,4}[A-Z]{0,3})\b/i],
    HISENSE: [/\b([0-9]{2}[A-Z][0-9]{1,2}[A-Z0-9]*)\b/i],
    TOSHIBA: [/\b([0-9]{2}[A-Z][0-9]{2,3}[A-Z]?)\b/i],
    DAHUA: [/\b(DHI-[A-Z0-9-]{5,15}|LTV[0-9]{2}-[A-Z0-9]{3,8})\b/i],
    // Nintendo: ej. HEG-001 (OLED), HAC-001, HDH-001
    NINTENDO: [
      /\b(HEG-[0-9]{3}|HAC-[0-9]{3}|HDH-[0-9]{3}|BEE-[0-9]{3})\b/i,
      ...(isConsole ? [/\b(NINTENDO\s+SWITCH\s+(?:OLED|LITE|2))\b/i] : []),
    ],
    // Xiaomi / Redmi / Poco (exige capacidad GB para celulares o modelo exacto para audífonos)
    XIAOMI: [
      ...(isAccessoryOrGame ? [] : [
        /\b((?:REDMI\s+NOTE\s+[0-9]{1,2}(?:\s+PRO(?:\s+PLUS|\+)?)?|REDMI\s+[0-9]{1,2}[A-Z]|REDMI\s+A[235]|POCO\s+[XMFC][0-9](?:\s+PRO)?)(?:\s+5G)?\s+[0-9]{2,3}\s*GB)\b/i,
      ]),
      /\b(REDMI\s+BUDS\s+[0-9](?:\s+(?:PRO|LITE|ACTIVE))?)\b/i,
    ],
    // Motorola
    MOTOROLA: [
      /\b(XT[0-9]{4}-[0-9])\b/i,
      ...(isAccessoryOrGame ? [] : [
        /\b(MOTO\s+(?:G[0-9]{2}|E[0-9]{2}|EDGE\s+[0-9]{2})(?:\s+(?:PRO|NEO|POWER|FUSION))?(?:\s+5G)?\s+[0-9]{2,3}\s*GB)\b/i,
      ]),
    ],
    // Honor
    HONOR: [
      ...(isAccessoryOrGame ? [] : [
        /\b(HONOR\s+(?:X[5-9][A-C]|MAGIC\s*[5-7]\s*(?:LITE|PRO)?|[0-9]{2,3}\s*(?:LITE|PRO)?)(?:\s+5G)?\s+[0-9]{2,3}\s*GB)\b/i,
      ]),
    ],
    // JBL
    JBL: [
      /\b(PARTYBOX\s+(?:110|120|310|320|710|ENCORE|ON-THE-GO))\b/i,
      /\b(JBL\s+(?:CHARGE\s*[45]|FLIP\s*[56]|XTREME\s*[34]|BOOMBOX\s*[23]|GO\s*[345]|CLIP\s*[45]|TUNE\s*[0-9]{3}BT))\b/i,
    ],
    // Epson / Canon / GoPro / Insta360
    EPSON: [/\b(L[0-9]{4})\b/i],
    CANON: [/\b(EOS\s+R[0-9]{1,3}|PIXMA\s+G[0-9]{4})\b/i],
    GOPRO: [...(isAccessoryOrGame ? [] : [/\b(HERO\s*1[0-3]\s*BLACK)\b/i])],
    INSTA360: [...(isAccessoryOrGame ? [] : [/\b(INSTA360\s+(?:X[34]|ACE\s*PRO|GO\s*3S?))\b/i])],
    // Mabe / Whirlpool / Frigidaire
    MABE: [/\b(RM[A-Z0-9]{6,12}|LM[A-Z0-9]{6,12}|EM[A-Z0-9]{6,12}|MSM[A-Z0-9]{5,12}|HMM[A-Z0-9]{5,12})\b/i],
    WHIRLPOOL: [/\b([0-9]?W[RTLS][A-Z0-9]{6,12})\b/i],
    FRIGIDAIRE: [/\b(FR[A-Z0-9]{5,12}|FF[A-Z0-9]{5,12}|FL[A-Z0-9]{5,12})\b/i],
  };

  const formatCode = (raw: string): string =>
    raw.trim().replace(/\s+([0-9]{2,3})\s*GB$/i, '-$1GB').replace(/\s+/g, '-').replace(/[^A-Z0-9./-]/gi, '').replace(/^-+|-+$/g, '').toUpperCase();

  const normalizedBrand = normalizeBrand(brand).toUpperCase().trim();
  const patterns = brandPatterns[normalizedBrand];

  if (patterns) {
    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match && match[1]) {
        const candidate = formatCode(match[1]);
        if (candidate.length >= 5 && /[A-Z]/.test(candidate) && /\d/.test(candidate)) {
          return candidate;
        }
      }
    }
  }

  // Fallback genérico: busca secuencias alfanuméricas de modelos reales (ej: 55UR7800, SM-G990, 50S5K, 55V6C)
  const genericMatch =
    clean.match(/\b([A-Z]{2,5}-[A-Z0-9]{3,8}(?:-[A-Z0-9]{1,5})?)\b/i) ||
    clean.match(/\b([0-9]{2}[A-Z]{1,4}[0-9]{1,4}[A-Z]{1,4}[A-Z0-9]*)\b/i) ||
    clean.match(/\b([A-Z]{2,4}[0-9]{2,4}[A-Z]{2,6}[0-9]{0,4})\b/i);

  if (genericMatch && genericMatch[1]) {
    const candidate = formatCode(genericMatch[1]);
    // Evitar falsos positivos con procesadores Intel Core (i3-1215U, i5-1335U), Wi-Fi, USB, RAM/ROM
    if (
      candidate.length >= 5 &&
      !/^I[3579]-/i.test(candidate) &&
      !/^(?:WIFI|USB|HDMI|DDR[45]|RYZEN|CORE|GEN[0-9]|1080P|2160P)/i.test(candidate)
    ) {
      return candidate;
    }
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
  if (b.includes('apple') || b.includes('iphone') || b.includes('macbook') || b.includes('ipad')) return 'Apple';
  if (b === 'lg' || b.startsWith('lg ')) return 'LG';
  if (b.includes('sony') || b.includes('playstation')) return 'Sony';
  if (b.includes('tcl')) return 'TCL';
  if (b.includes('hisense')) return 'Hisense';
  if (b.includes('xiaomi') || b.includes('redmi') || b.includes('poco')) return 'Xiaomi';
  if (b.includes('motorola') || b.startsWith('moto ')) return 'Motorola';
  if (b.includes('honor')) return 'Honor';
  if (b.includes('huawei')) return 'Huawei';
  if (b.includes('jbl')) return 'JBL';
  if (b.includes('mabe')) return 'Mabe';
  if (b.includes('whirlpool')) return 'Whirlpool';
  if (b.includes('frigidaire')) return 'Frigidaire';
  if (b.includes('nintendo')) return 'Nintendo';
  if (b.includes('lenovo')) return 'Lenovo';
  if (b.includes('hp') || b.includes('hewlett')) return 'HP';
  if (b.includes('dell')) return 'Dell';
  if (b.includes('oster')) return 'Oster';
  if (b.includes('toshiba')) return 'Toshiba';
  if (b.includes('asus')) return 'Asus';
  if (b.includes('acer')) return 'Acer';
  if (b.includes('epson')) return 'Epson';
  if (b.includes('canon')) return 'Canon';
  if (b.includes('gopro')) return 'GoPro';
  if (b.includes('insta360')) return 'Insta360';
  if (b.includes('dahua')) return 'Dahua';

  // Capitalización de la primera letra
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

const MOJIBAKE_MAP: [RegExp, string][] = [
  [/Ã±/g, 'ñ'], [/Ã‘/g, 'Ñ'],
  [/Ã¡/g, 'á'], [/Ã©/g, 'é'], [/Ã­/g, 'í'], [/Ã³/g, 'ó'], [/Ãº/g, 'ú'],
  [/Ã\x81/g, 'Á'], [/Ã‰/g, 'É'], [/Ã\x8d/g, 'Í'], [/Ã“/g, 'Ó'], [/Ãš/g, 'Ú'],
  [/Ã¼/g, 'ü'], [/Â°/g, '°'], [/Â¨/g, ''],
];

/**
 * Limpia el título removiendo palabras de relleno publicitario y corrigiendo mojibake UTF-8
 */
export function cleanTitle(title: string): string {
  let cleaned = title;
  for (const [pattern, replacement] of MOJIBAKE_MAP) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned
    .replace(/\b(OFERTA|PROMOCION|DESCUENTO|SUPER PRECIO|NUEVO|EXCLUSIVO|COMBO|REGALO)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
