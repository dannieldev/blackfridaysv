export interface CatalogEntry {
  title: string;
  category?: string;
  categories?: string[];
  productUrl?: string;
  currentPrice?: number | null;
  offerPrice?: number | null;
  price?: number | null;
}

const normalize = (value: string) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const BLACK_FRIDAY_CATEGORY_MIN_PRICES: Record<string, number> = {
  tv_audio: 25,
  smartphones: 50,
  computacion: 35,
  linea_blanca: 30,
  gaming: 35,
  moda_calzado: 25,
};

export const ABSOLUTE_MIN_PRICE = 15;
export const ABSOLUTE_MAX_PRICE = 4500;

/**
 * Filtro de calidad estricto para Black Friday:
 * Excluye productos minúsculos, baratijas de $1-$6, alimentos/snacks,
 * farmacia, ropa interior básica, cables sueltos, tuppers/menaje individual,
 * accesorios genéricos y precios fuera de rango o con errores de plataforma.
 */
export function isExcludedFromCatalog(entry: CatalogEntry): boolean {
  const cat = normalize(entry.category ?? '');
  const categories = [entry.category ?? '', ...(entry.categories ?? [])].map(normalize);
  const text = normalize(`${entry.title} ${(entry.productUrl ?? '').replace(/-/g, ' ')}`);

  // 1. Validar rangos de precios (si se proporciona precio numérico)
  const rawPrice = entry.currentPrice ?? entry.offerPrice ?? entry.price ?? null;
  const p = typeof rawPrice === 'number' && Number.isFinite(rawPrice) ? rawPrice : null;
  if (p !== null) {
    if (p < ABSOLUTE_MIN_PRICE || p > ABSOLUTE_MAX_PRICE) return true;
    const categoryMin = BLACK_FRIDAY_CATEGORY_MIN_PRICES[cat] ?? 20;
    if (p < categoryMin) return true;
  }

  // 2. Farmacia y Medicamentos
  if (categories.some(path => /(?:^|\/)(?:farmacia|medicamentos?|medicinas?)(?:\/|$)/.test(path))) return true;
  if (/\bprecio indicado por (?:tableta|capsula|sobre)\b/.test(text)) return true;
  if (/\b(?:medicamentos?|antigripal(?:es)?|analgesicos?|antibioticos?|antihistaminicos?)\b/.test(text)) return true;
  if (/\btabletas?\s+(?:masticables|recubiertas|sublinguales)\b/.test(text)) return true;
  const dosage = /\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg)\b/.test(text);
  const pharmaceuticalForm = /\b(?:tabletas?|comprimidos?|capsulas?|pastillas?|jarabe|supositorios?|inyectables?)\b/.test(text);
  if (dosage && pharmaceuticalForm) return true;

  // 3. Alimentos, Snacks, Golosinas y Bebidas (Cero churros, palomitas, galletas, etc.)
  if (/\b(palomitas|chitts|chips|galletas?|churros?|snack|dulce|bebida|soda|caramelo|gaseosa|refresco|alimento|comida)\b/.test(text)) return true;

  // 4. Aseo, Químicos, Cosméticos y Aromatizantes
  if (/\b(limpiador|aromatizante|hidratante|moisturiser|gladiator a\/c|shampoo|desodorante)\b/.test(text)) return true;

  // 5. Bisutería barata, baratijas, accesorios de pelo, llaveros y pines decorativos
  if (/\b(llavero|diadema|gancho(?:s)? para|cola(?:s)? para|pza de cola|pulsera|gargantilla|dije|mono|aretes?|pendientes?|anillo|cadena de fantasia|vincha|coletero|scrunchie|pin decorativo)\b/.test(text)) return true;

  // 6. Ropa interior, calcetines, crop tops, pijamas, uniformes y camisetas baratas
  if (/\b(panties?|panty|brasier|calzoncillo|calcetin(?:es)?|medias?|boxer|ropa interior|top tipo tubo|cropped|crop top|tank top|camison|intimates|sin mangas?|pijama|filipina|uniforme)\b/.test(text)) return true;
  if (/\b(camisetas?\b.*?\bgeorge|pack de camisetas?)\b/.test(text)) return true;
  if (/\b(camiseta|t-shirt)\b/.test(text) && p !== null && p < 28) return true;

  // 7. Sandalias de playa / baño básicas de plástico / chancletas
  if (/\b(sandalia(?:s)? de playa|chancleta(?:s)?|flip[- ]?flop|sandalia(?:s)? de bano)\b/.test(text)) return true;

  // 8. Menaje individual, tuppers y recipientes sueltos (permitir vajillas completas o juegos de ollas/sartenes)
  if (/\b(plato|bowl|taza|vaso|tupper|recipiente|tapa para microondas|organizador mainstays|deposito figmint|frasco para almacenamiento|molde figmint|bandeja de gres|cuchara|tenedor|cuchillo|servilletero)\b/.test(text)) {
    if (!/\b(vajilla|set de ollas|bateria de cocina|juego de vajilla)\b/.test(text)) return true;
  }
  // Repuestos menores de línea blanca
  if (/\b(manguera de lavadora|forro para lavadora|modulo wifi para|esterilizador a vapor|supresor cdp)\b/.test(text)) return true;

  // 9. Cables sueltos, adaptadores, soportes plásticos, protectores
  if (/\b(cable con puerto|cable usb|cable impresora|cable adaptador|adaptador mini display|cable tipo-a|cable tipo-c|cable hdmi|cable vga)\b/.test(text)) return true;
  if (/\b(soporte de celular|soporte para celular|soporte p celular|soporte d celular|soporte durabrad|soporte para carro|bolsa impermeable|tripode two powers|tripode para celular)\b/.test(text)) return true;
  if (/\b(soporte (?:giratorio )?para laptop|soporte de laptop)\b/.test(text)) return true;
  if (/\b(soporte (?:para|de) pantalla|rack para tv|soporte articulado)\b/.test(text)) return true;
  if (/\brepuestos de joystick\b/.test(text)) return true;

  // Accesorios clasificados erróneamente en categorías principales
  if (cat === 'smartphones' && /\b(case|funda|cover|protector|billetera con magsafe|power bank|cargador)\b/.test(text)) return true;
  if (cat === 'computacion' && /\b(mochila|bolso|funda|bolson|maletin)\b/.test(text)) return true;
  if (cat === 'gaming' && /\b(bolso|estuche|funda|protector)\b/.test(text)) return true;

  // 10. Juguetes infantiles de plástico en categorías tech/gaming
  if (/\b(juguete|fisher[- ]price|spark create imagine|peluche|figuras? super mario|figura de accion mario|mini auto|vehiculo nintendo)\b/.test(text)) return true;

  return false;
}
