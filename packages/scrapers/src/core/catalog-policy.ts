interface CatalogEntry {
  title: string;
  category?: string;
  categories?: string[];
  productUrl?: string;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Also checks legacy titles because older snapshots labeled pharmacy results as computing. */
export function isExcludedFromCatalog(entry: CatalogEntry): boolean {
  const categories = [entry.category ?? '', ...(entry.categories ?? [])].map(normalize);
  if (categories.some(path => /(?:^|\/)(?:farmacia|medicamentos?|medicinas?)(?:\/|$)/.test(path))) return true;

  const text = normalize(`${entry.title} ${(entry.productUrl ?? '').replace(/-/g, ' ')}`);
  if (/\bprecio indicado por (?:tableta|capsula|sobre)\b/.test(text)) return true;
  if (/\b(?:medicamentos?|antigripal(?:es)?|analgesicos?|antibioticos?|antihistaminicos?)\b/.test(text)) return true;
  if (/\btabletas?\s+(?:masticables|recubiertas|sublinguales)\b/.test(text)) return true;
  const dosage = /\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg)\b/.test(text);
  const pharmaceuticalForm = /\b(?:tabletas?|comprimidos?|capsulas?|pastillas?|jarabe|supositorios?|inyectables?)\b/.test(text);
  return dosage && pharmaceuticalForm;
}
