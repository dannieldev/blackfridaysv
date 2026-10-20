import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SubscriptionModal } from '../src/components/SubscriptionModal.tsx';

test('subscription form starts without consent and announces availability before enabling submit', () => {
  const html = renderToStaticMarkup(createElement(SubscriptionModal, { product: null, onClose: () => {} }));
  assert.match(html, /type="email"[^>]*required/);
  assert.match(html, /type="checkbox" required=""/);
  assert.doesNotMatch(html, /checked=""/);
  assert.match(html, /Comprobando disponibilidad/);
  assert.match(html, /type="submit" disabled=""/);
  assert.match(html, /otra pestaña/);
  assert.match(html, /dialog[^>]*aria-labelledby/);
});
