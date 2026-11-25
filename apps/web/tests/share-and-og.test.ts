import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDealShareUrl, buildDealShareMessage, buildWhatsAppShareUrl } from '../src/lib/share.ts';
import { injectDealOpenGraph } from '../worker/og.ts';
import { handleRequest, type Env } from '../worker/index.ts';

const baseHtml = `<!doctype html>
<html lang="es">
<head>
  <title>Radar Black Friday SV 2026</title>
  <meta name="description" content="Default desc" />
  <meta property="og:title" content="Default OG Title" />
  <meta property="og:description" content="Default OG Desc" />
  <meta property="og:image" content="https://blackfridaysv.dannieldev.com/og-card.png" />
  <meta property="og:url" content="https://blackfridaysv.dannieldev.com/" />
  <meta name="twitter:title" content="Default Twitter Title" />
  <meta name="twitter:description" content="Default Twitter Desc" />
  <meta name="twitter:image" content="https://blackfridaysv.dannieldev.com/og-card.png" />
</head>
<body></body>
</html>`;

test('buildDealShareUrl and buildWhatsAppShareUrl emit canonical ?deal= links with verified verdict', () => {
  const deal = {
    id: 'siman-10055',
    title: 'Smart TV Samsung 55" 4K',
    store: 'Almacenes Siman',
    currentPrice: 399.99,
  };
  const url = buildDealShareUrl(deal, 'https://blackfridaysv.dannieldev.com');
  assert.equal(url, 'https://blackfridaysv.dannieldev.com/?deal=siman-10055');

  const msg = buildDealShareMessage(
    deal,
    { level: 'worth', reason: '20% menos que su precio habitual', savingPercent: 20 },
    'https://blackfridaysv.dannieldev.com',
  );
  assert.match(msg, /\$399\.99/);
  assert.match(msg, /Siman/);
  assert.match(msg, /Bajó 20% real/);
  assert.match(msg, /\?deal=siman-10055/);

  const wa = buildWhatsAppShareUrl(
    deal,
    { level: 'worth', reason: '20% menos', savingPercent: 20 },
    'https://blackfridaysv.dannieldev.com',
  );
  assert.ok(wa.startsWith('https://wa.me/?text='));
  assert.ok(decodeURIComponent(wa).includes('https://blackfridaysv.dannieldev.com/?deal=siman-10055'));
});

test('injectDealOpenGraph escapes hostile HTML and rejects non-https image URLs', () => {
  const out = injectDealOpenGraph(
    baseHtml,
    {
      id: 'aeon-99',
      title: 'Laptop "Gaming" <script>alert(1)</script>',
      store: 'Aeon & Co',
      currentPrice: 899,
      regularPrice: 1099,
      imageUrl: 'javascript:alert(1)',
    },
    'https://blackfridaysv.dannieldev.com',
  );

  assert.ok(!out.includes('<script>alert(1)</script>'));
  assert.ok(out.includes('&quot;Gaming&quot; &lt;script&gt;'));
  assert.ok(out.includes('Aeon &amp; Co'));
  assert.ok(out.includes('property="og:image" content="https://blackfridaysv.dannieldev.com/og-card.png"'));
  assert.ok(out.includes('property="og:url" content="https://blackfridaysv.dannieldev.com/?deal=aeon-99"'));
});

test('Cloudflare Worker serves dynamic product OpenGraph HTML for GET /?deal=<id>', async () => {
  const snapshot = [
    {
      id: 'tropigas-5500',
      title: 'Smart TV LG 55" 4K UHD',
      store: 'Almacenes Tropigas',
      currentPrice: 449,
      regularPrice: 549,
      imageUrl: 'https://cdn.example.com/lg-55.jpg',
    },
  ];
  const env = {
    SITE_URL: 'https://blackfridaysv.dannieldev.com',
    ASSETS: {
      async fetch(req: Request) {
        const u = new URL(req.url);
        if (u.pathname === '/data/deals-snapshot.json') {
          return new Response(JSON.stringify(snapshot), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(baseHtml, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      },
    },
  } as unknown as Env;

  const res = await handleRequest(
    new Request('https://blackfridaysv.dannieldev.com/?deal=tropigas-5500'),
    env,
  );
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Smart TV LG 55&quot; 4K UHD a \$449\.00 en Almacenes Tropigas/);
  assert.match(html, /property="og:image" content="https:\/\/cdn\.example\.com\/lg-55\.jpg"/);
  assert.equal(res.headers.get('Cache-Control'), 'public, max-age=300');
});
