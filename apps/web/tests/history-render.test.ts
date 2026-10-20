import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PriceSparkline } from '../src/components/PriceSparkline.tsx';
import { CatalogHealth } from '../src/components/CatalogHealth.tsx';
import type { DealItem } from '../src/lib/deals.ts';

const deal: DealItem = {
  id: 'siman-test', store: 'Siman', title: 'TV', brand: 'Samsung', modelCode: 'TEST123',
  category: 'tv_audio', currentPrice: 100, regularPrice: 200, baselinePrice30d: 150,
  dealScore: 'falsa_oferta_inflada', verdictMessage: '', inStock: null,
  productUrl: 'https://example.com/product', dataSource: 'snapshot',
};

test('missing history renders an honest empty state, never a fabricated SVG', () => {
  const html = renderToStaticMarkup(createElement(PriceSparkline, { deal }));
  assert.match(html, /Historial en formación/);
  assert.doesNotMatch(html, /<svg|Octubre|Precio inflado|Mínimo histórico comprobado/);
});

test('a long real series renders one accessible row per capture and only two chart endpoints', () => {
  const now = Date.now();
  const history = Array.from({ length: 70 }, (_, i) => ({ date: new Date(now - (69 - i) * 86400000).toISOString(), price: 169 - i }));
  const html = renderToStaticMarkup(createElement(PriceSparkline, { deal: { ...deal, history, checkedAt: history.at(-1)!.date } }));
  assert.match(html, /Mínimo del periodo/);
  assert.equal((html.match(/<tr>/g) ?? []).length, 71);
  assert.equal((html.match(/<circle/g) ?? []).length, 2);
  assert.doesNotMatch(html, /NaN|Infinity/);
  assert.match(html, /role="region" aria-label="Capturas de precio"/);
});

test('fresh and expired stores are counted separately without hiding older prices', () => {
  const recent = { ...deal, checkedAt: new Date().toISOString() };
  const expired = { ...deal, id: 'prado-test', store: 'Prado', checkedAt: '2020-01-01T00:00:00Z' };
  const html = renderToStaticMarkup(createElement(CatalogHealth, { deals: [recent, expired], onReload: () => {} }));
  assert.match(html, /1 de 2 precios necesitan una nueva captura/);
  assert.match(html, /1 recientes · 0 pendientes/);
  assert.match(html, /0 recientes · 1 pendientes/);
  assert.match(html, /Volver a consultar el catálogo/);
});
