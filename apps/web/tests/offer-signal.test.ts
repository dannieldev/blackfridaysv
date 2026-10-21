import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { offerSignal, compareSignals } from '../src/lib/offerSignal.ts';
import { OfferSignals, SignalBadge } from '../src/components/OfferSignals.tsx';
import type { DealItem } from '../src/lib/deals.ts';

const now = Date.parse('2026-10-20T18:00:00Z');
const date = (days: number) => new Date(now - days * 86400000).toISOString();
const base: DealItem = {
  id: 'siman-test', store: 'Siman', title: 'TV', brand: 'Samsung', modelCode: 'TEST123',
  category: 'tv_audio', currentPrice: 90, regularPrice: 999, baselinePrice30d: 999,
  dealScore: 'ganga_historica', verdictMessage: '', inStock: true,
  productUrl: 'https://example.com/product', dataSource: 'snapshot', checkedAt: date(0),
};
function withHistory(current: number, prices: number[] = [100, 100]): DealItem {
  return { ...base, currentPrice: current, history: [
    ...prices.map((price, i) => ({ date: date(prices.length - i), price })),
    { date: date(0), price: current },
  ] };
}

test('green needs a repeated real reference and handles the exact 10% boundary', () => {
  const signal = offerSignal(withHistory(90), now);
  assert.equal(signal.level, 'worth');
  assert.match(signal.reason, /\$100\.00/);
  assert.equal(offerSignal(withHistory(90.01), now).level, 'regular');
  assert.equal(offerSignal(withHistory(89.99), now).level, 'worth');
});

test('red handles a 10% increase without floating-point boundary errors', () => {
  assert.equal(offerSignal(withHistory(110), now).level, 'wait');
  assert.equal(offerSignal(withHistory(109.99), now).level, 'regular');
  assert.equal(offerSignal(withHistory(100), now).level, 'regular');
});

test('advertised percentages and old verdict fields cannot qualify an unobserved deal', () => {
  assert.equal(offerSignal(base, now).level, 'unknown');
  assert.equal(offerSignal(withHistory(90, [100]), now).level, 'unknown');
  assert.equal(offerSignal(withHistory(90, []), now).level, 'unknown');
});

test('several captures on one local day are not several days of evidence', () => {
  const deal = withHistory(90);
  deal.history = [
    { date: '2026-10-19T09:00:00Z', price: 100 },
    { date: '2026-10-19T20:00:00Z', price: 100 },
    { date: date(0), price: 90 },
  ];
  assert.equal(offerSignal(deal, now).level, 'unknown');
});

test('a one-day spike cannot turn a return to the old price into a great discount', () => {
  assert.equal(offerSignal(withHistory(100, [100, 100, 200]), now).level, 'regular');
  assert.equal(offerSignal(withHistory(90, [80, 100, 100]), now).level, 'regular');
});

test('the repeated reference must fall within 30 days, even if the chart keeps 90', () => {
  const deal = withHistory(90);
  deal.history![0].date = date(32);
  deal.history![1].date = date(31);
  assert.equal(offerSignal(deal, now).level, 'unknown');
});

test('demo, expired, future, retained, invalid and sold-out prices remain gray', () => {
  for (const overrides of [
    { dataSource: 'demo' as const }, { checkedAt: date(2) }, { checkedAt: date(-1) },
    { refreshStatus: 'retained' as const }, { inStock: false }, { currentPrice: NaN },
    { currentPrice: 0 }, { currentPrice: -90 }, { checkedAt: 'invalid' },
  ]) assert.equal(offerSignal({ ...withHistory(90), ...overrides }, now).level, 'unknown');
});

test('current price must match its timestamped history', () => {
  assert.equal(offerSignal({ ...withHistory(90), currentPrice: 85 }, now).level, 'unknown');
});

test('a cheaper competitor must be recent, in stock and at least 10% cheaper', () => {
  const other = { store: 'RAF', price: 90, inStock: true, checkedAt: date(0) };
  const deal = { ...withHistory(100), competitors: [other] };
  assert.equal(offerSignal(deal, now).level, 'wait');
  for (const overrides of [{ price: 90.01 }, { inStock: null }, { inStock: false },
    { checkedAt: date(2) }, { refreshStatus: 'retained' as const }]) {
    assert.equal(offerSignal({ ...deal, competitors: [{ ...other, ...overrides }] }, now).level, 'regular');
  }
  assert.equal(offerSignal({ ...deal, category: 'moda_calzado' }, now).level, 'regular');
});

test('opportunity sorting prioritizes proven savings and preserves a neutral group', () => {
  const scores = [offerSignal(base, now), offerSignal(withHistory(110), now),
    offerSignal(withHistory(100), now), offerSignal(withHistory(90), now), offerSignal(withHistory(70), now)];
  assert.deepEqual(scores.sort(compareSignals).map(s => s.level), ['worth', 'worth', 'regular', 'unknown', 'wait']);
  assert.ok(scores[0].savingPercent > scores[1].savingPercent);
});

test('compact signal filters expose text, real zero counts and pressed state without explanatory paragraphs', () => {
  const html = renderToStaticMarkup(createElement(OfferSignals, {
    selected: 'worth', counts: { worth: 0, regular: 3, wait: 1, unknown: 12 },
    loading: false, onSelect: () => {},
  }));
  assert.equal((html.match(/aria-pressed=/g) ?? []).length, 4);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.match(html, /Vale la pena/); assert.match(html, /signal-count">0</);
  assert.doesNotMatch(html, /<details|<p>|Elige una señal|Bajada comprobada|¿Cómo evaluamos/);
  assert.match(html, /Ver todas las señales/);
  const badge = renderToStaticMarkup(createElement(SignalBadge, { signal: offerSignal(withHistory(90), now), explain: true }));
  assert.match(badge, /Vale la pena/); assert.match(badge, /\$100\.00/);
});
