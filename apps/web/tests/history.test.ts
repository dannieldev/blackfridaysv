import assert from 'node:assert/strict';
import { test } from 'node:test';
import { priceEvidence } from '../src/lib/priceHistory.ts';
import { freshness } from '../src/lib/freshness.ts';

const now = Date.parse('2026-10-19T18:00:00Z');
const checkedAt = new Date(now).toISOString();
const yesterday = new Date(now - 86400000).toISOString();

test('missing history cannot become a low or generate synthetic points', () => {
  assert.deepEqual(priceEvidence({ currentPrice: 100, checkedAt }, now).points, []);
  assert.equal(priceEvidence({ currentPrice: 100, checkedAt }, now).isObservedLow, false);
});

test('observed low needs different local days, a changed price and an exact current capture', () => {
  const deal = { currentPrice: 100, checkedAt, history: [{ date: yesterday, price: 150 }, { date: checkedAt, price: 100 }] };
  assert.equal(priceEvidence(deal, now).isObservedLow, true);
  assert.equal(priceEvidence({ ...deal, currentPrice: 90 }, now).isObservedLow, false);
  assert.equal(priceEvidence({ ...deal, checkedAt: undefined }, now).isObservedLow, false);
  assert.equal(priceEvidence({ ...deal, history: deal.history.map(p => ({ ...p, price: 100 })) }, now).isObservedLow, false);
  assert.equal(priceEvidence({ ...deal, history: [{ date: '2026-10-19T10:00:00Z', price: 150 }, deal.history[1]] }, now).isObservedLow, false);
});

test('invalid, future, older than 90 days and post-capture observations are excluded', () => {
  const result = priceEvidence({ currentPrice: 100, checkedAt: yesterday, history: [
    { date: 'invalid', price: 100 }, { date: '2026-06-01T00:00:00Z', price: 50 },
    { date: yesterday, price: -1 }, { date: '2027-01-01T00:00:00Z', price: 10 },
    { date: checkedAt, price: 20 }, { date: yesterday, price: 100 },
    { date: yesterday, price: 100 },
  ] }, now);
  assert.deepEqual(result.points, [{ date: yesterday, price: 100 }]);
});

test('an intermediate spike is evidence of variation, never an accusation of inflation', () => {
  const evidence = priceEvidence({ currentPrice: 100, checkedAt, history: [
    { date: new Date(now - 2 * 86400000).toISOString(), price: 100 },
    { date: yesterday, price: 200 }, { date: checkedAt, price: 100 },
  ] }, now);
  assert.equal(evidence.label, 'Mínimo del periodo');
  assert.equal(evidence.points.length, 3);
});

test('freshness distinguishes expired, invalid, future and retained captures at the 24 h boundary', () => {
  assert.equal(freshness({ checkedAt }, now), 'recent');
  assert.equal(freshness({ checkedAt: yesterday }, now), 'recent');
  assert.equal(freshness({ checkedAt: yesterday }, now + 1), 'stale');
  assert.equal(freshness({ checkedAt, refreshStatus: 'retained' }, now), 'retained');
  assert.equal(freshness({ checkedAt: 'bad' }, now), 'unknown');
  assert.equal(freshness({ checkedAt: new Date(now + 1).toISOString() }, now), 'unknown');
});
