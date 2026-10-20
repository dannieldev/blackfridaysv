import { readPriceHistory } from './db/supabase.js';
import { mergeCatalog } from './core/catalog.js';
import { readSnapshot, writeSnapshot } from './core/snapshot.js';

// Reads Supabase only; publication remains a separate deploy step.
async function main() {
  const now = new Date().toISOString();
  const history = await readPriceHistory(now);
  const previous = readSnapshot();
  if (!previous.length) throw new Error('Se necesita un catálogo existente para asociar los SKU.');
  let updated = 0;
  const refreshed = previous.map(item => {
    const latest = history[item.id]?.filter(p => Number.isFinite(p.price) && p.price > 0
      && Number.isFinite(Date.parse(p.date)) && Date.parse(p.date) <= Date.parse(now))
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).at(-1);
    if (!latest || Date.parse(latest.date) <= Date.parse(item.updatedAt)) return item;
    updated++;
    return {
      ...item, currentPrice: latest.price,
      history: [...(item.history ?? []), { date: item.updatedAt, price: item.currentPrice }],
      regularPrice: latest.regularPrice && latest.regularPrice > 0 ? latest.regularPrice : null,
      updatedAt: new Date(latest.date).toISOString(),
      // Stock is not part of a price observation.
      inStock: null, refreshStatus: undefined, lastAttemptAt: undefined,
    };
  });
  const { items } = mergeCatalog(refreshed, [], now, history);
  writeSnapshot(items);
  console.log(JSON.stringify({
    catalogProducts: items.length, pricesUpdatedFromDatabase: updated,
    productsWithHistory: items.filter(p => (p.history?.length ?? 0) >= 2).length,
    observations: items.reduce((sum, p) => sum + (p.history?.length ?? 0), 0),
  }));
}

main().then(() => process.exit(0)).catch(() => {
  console.error('No se pudo exportar el historial completo. Se conserva el catálogo anterior.');
  process.exit(1);
});
