import { escapeHtml } from '../../../packages/notifications/src/email.js';

export interface OgDealRecord {
  id: string;
  title: string;
  store: string;
  currentPrice: number;
  regularPrice?: number | null;
  imageUrl?: string | null;
  modelCode?: string;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function safeHttpsImage(raw: string | null | undefined, fallbackOrigin: string): string {
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'https:') return parsed.href;
    } catch {
      /* fall through to default card */
    }
  }
  return new URL('/og-card.png', fallbackOrigin).href;
}

function replaceMetaContent(html: string, attrName: 'property' | 'name', attrValue: string, content: string): string {
  const escapedContent = escapeHtml(content);
  const pattern = new RegExp(
    `(<meta\\b[^>]*\\b${attrName}="${attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*\\bcontent=")[^"]*(")`,
    'i',
  );
  if (pattern.test(html)) {
    return html.replace(pattern, `$1${escapedContent}$2`);
  }
  const reversePattern = new RegExp(
    `(<meta\\b[^>]*\\bcontent=")[^"]*("[^>]*\\b${attrName}="${attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>)`,
    'i',
  );
  if (reversePattern.test(html)) {
    return html.replace(reversePattern, `$1${escapedContent}$2`);
  }
  return html.replace('</head>', `  <meta ${attrName}="${attrValue}" content="${escapedContent}" />\n</head>`);
}

/**
 * Inyecta metadatos OpenGraph y Twitter Card del producto específico para
 * enlaces compartidos (?deal=...) en WhatsApp, Facebook y X.
 */
export function injectDealOpenGraph(html: string, deal: OgDealRecord, siteOrigin: string): string {
  const priceText = currency.format(deal.currentPrice);
  const titleText = `${deal.title} a ${priceText} en ${deal.store} · Radar Black Friday SV`;
  const hasRef = typeof deal.regularPrice === 'number' && deal.regularPrice > deal.currentPrice;
  const pct = hasRef ? Math.round(((deal.regularPrice! - deal.currentPrice) / deal.regularPrice!) * 100) : null;
  const descText = hasRef && pct && pct > 0
    ? `Precio verificado: ${priceText} en ${deal.store} (referencia anunciada ${currency.format(deal.regularPrice!)}, -${pct}%). Revisa el historial real y compara con otras tiendas de El Salvador.`
    : `Precio verificado hoy: ${priceText} en ${deal.store}. Revisa su historial de precios y compáralo entre tiendas de El Salvador en Radar Black Friday SV.`;

  const shareUrl = new URL('/', siteOrigin);
  shareUrl.searchParams.set('deal', deal.id);
  const imageUrl = safeHttpsImage(deal.imageUrl, siteOrigin);

  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(titleText)}</title>`);
  out = replaceMetaContent(out, 'name', 'description', descText);
  out = replaceMetaContent(out, 'property', 'og:title', titleText);
  out = replaceMetaContent(out, 'property', 'og:description', descText);
  out = replaceMetaContent(out, 'property', 'og:image', imageUrl);
  out = replaceMetaContent(out, 'property', 'og:url', shareUrl.href);
  out = replaceMetaContent(out, 'name', 'twitter:title', titleText);
  out = replaceMetaContent(out, 'name', 'twitter:description', descText);
  out = replaceMetaContent(out, 'name', 'twitter:image', imageUrl);

  return out;
}
