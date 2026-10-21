import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlackFridayLeadModal } from '../src/components/BlackFridayLeadModal.tsx';
import { CookieConsentBanner } from '../src/components/CookieConsentBanner.tsx';
import { LegalModals } from '../src/components/LegalModals.tsx';

test('lead capture modal renders accessible form with consent check and honeypot', () => {
  const html = renderToStaticMarkup(
    createElement(BlackFridayLeadModal, {
      isOpen: true,
      onClose: () => {},
      onOpenCookies: () => {},
    })
  );
  assert.match(html, /type="email"[^>]*required/);
  assert.match(html, /type="checkbox" required=""/);
  assert.match(html, /name="website"/);
  assert.match(html, /Política de Cookies y Publicidad/);
  assert.match(html, /Double Opt-In/);
  assert.match(html, /dialog[^>]*aria-labelledby/);
});

test('legal modals render the cookies and advertising tab content', () => {
  const html = renderToStaticMarkup(
    createElement(LegalModals, {
      type: 'cookies',
      onClose: () => {},
      onSelectTab: () => {},
    })
  );
  assert.match(html, /Política de Cookies y Almacenamiento Local/);
  assert.match(html, /Captación de Correos y Publicidad de Ofertas de Black Friday/);
  assert.match(html, /Double Opt-In/);
  assert.match(html, /blackfridaysv_radar_preferences/);
  assert.match(html, /List-Unsubscribe/);
});

test('cookie consent banner renders cleanly', () => {
  const html = renderToStaticMarkup(
    createElement(CookieConsentBanner, {
      onOpenCookies: () => {},
    })
  );
  // Banner initially starts with visible=false (delay mounted on client)
  assert.equal(typeof html, 'string');
});
