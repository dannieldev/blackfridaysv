import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_GA_ID,
  getMeasurementId,
  getGTMId,
  getClarityId,
  getFacebookPixelId,
  getGoogleAdsId,
  trackEvent,
  trackDealClick,
  trackSearch,
  trackCategoryFilter,
  trackSaveDeal,
  trackLeadSubmission,
  trackPriceAlertCreated,
} from '../src/lib/analytics.ts';

test('analytics identifiers fallback safely when window and env are empty', () => {
  assert.equal(getMeasurementId(), DEFAULT_GA_ID);
  assert.equal(getGTMId(), undefined);
  assert.equal(getClarityId(), 'z97nys8fg7');
  assert.equal(getFacebookPixelId(), undefined);
  assert.equal(getGoogleAdsId(), undefined);
});

test('trackEvent and specific helpers execute safely without throwing in server/headless environment', () => {
  assert.doesNotThrow(() => {
    trackEvent('test_event', { sample: 123 });
    trackDealClick('Siman', 'Samsung 55 TV', 499, 'https://sv.siman.com');
    trackSearch('Samsung', 12);
    trackCategoryFilter('tv_audio', 'TV y audio');
    trackSaveDeal('siman-tv-1', 'Samsung 55 TV', 'save');
    trackLeadSubmission('wishlist', { categories_count: 3 });
    trackPriceAlertCreated('siman-tv-1', 'Samsung 55 TV', 350, 'Siman');
  });
});
