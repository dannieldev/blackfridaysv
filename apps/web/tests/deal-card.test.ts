import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DealBadge, DealCard } from '../src/App.tsx';
import type { DealItem } from '../src/lib/deals.ts';

const baseDeal: DealItem = {
  id: 'siman-tv-1',
  store: 'Almacenes Siman',
  title: 'Smart TV 55 Pulgadas 4K UHD',
  brand: 'Samsung',
  modelCode: 'UN55CU7000',
  category: 'tv_audio',
  currentPrice: 399,
  regularPrice: 599,
  baselinePrice30d: 450,
  dealScore: 'buena_oferta',
  verdictMessage: 'Rebaja comprobada',
  inStock: true,
  productUrl: 'https://sv.siman.com/tv',
  dataSource: 'snapshot',
  checkedAt: '2026-10-20T12:00:00Z',
};

test('DealBadge renders advertised discount when there is a regular price', () => {
  const html = renderToStaticMarkup(createElement(DealBadge, { deal: baseDeal }));
  assert.match(html, /deal-verdict-badge/);
  assert.match(html, /33% anunciado/);
});

test('DealBadge renders historic low when observed price history confirms it', () => {
  const yesterday = new Date(Date.now() - 86400000 * 2).toISOString();
  const today = new Date().toISOString();
  const dealWithHistory: DealItem = {
    ...baseDeal,
    checkedAt: today,
    currentPrice: 350,
    history: [
      { date: yesterday, price: 450 },
      { date: today, price: 350 },
    ],
  };
  const html = renderToStaticMarkup(createElement(DealBadge, { deal: dealWithHistory }));
  assert.match(html, /verdict-historic-low/);
  assert.match(html, /Con descuento/);
});

test('DealBadge warns when a competitor is cheaper', () => {
  const dealWithCompetitor: DealItem = {
    ...baseDeal,
    competitors: [
      { store: 'Prado', price: 320, inStock: true },
    ],
  };
  const html = renderToStaticMarkup(createElement(DealBadge, { deal: dealWithCompetitor }));
  assert.match(html, /verdict-cheaper-elsewhere/);
  assert.match(html, /Más barato en Prado/);
});

test('DealBadge warns when price increased', () => {
  const yesterday = new Date(Date.now() - 86400000 * 2).toISOString();
  const today = new Date().toISOString();
  const dealPriceUp: DealItem = {
    ...baseDeal,
    checkedAt: today,
    currentPrice: 500,
    history: [
      { date: yesterday, price: 400 },
      { date: today, price: 500 },
    ],
  };
  const html = renderToStaticMarkup(createElement(DealBadge, { deal: dealPriceUp }));
  assert.match(html, /verdict-price-up/);
  assert.match(html, /Precio aumentado/);
});

test('DealCard in simple mode is lightweight and omits sparkline and capture status', () => {
  const html = renderToStaticMarkup(
    createElement(DealCard, {
      deal: baseDeal,
      saved: false,
      onSave: () => {},
      onOpen: () => {},
      mode: 'simple',
    })
  );
  assert.match(html, /deal-card-simple/);
  assert.match(html, /Ver oferta/);
  assert.doesNotMatch(html, /card-sparkline/);
  assert.doesNotMatch(html, /capture-status/);
});

test('DealCard in detailed mode renders full sparkline and capture status', () => {
  const html = renderToStaticMarkup(
    createElement(DealCard, {
      deal: baseDeal,
      saved: false,
      onSave: () => {},
      onOpen: () => {},
      mode: 'detailed',
    })
  );
  assert.match(html, /deal-card-detailed/);
  assert.match(html, /Ver precio y detalles/);
  assert.match(html, /card-sparkline/);
  assert.match(html, /capture-status/);
});
