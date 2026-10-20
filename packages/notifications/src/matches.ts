import type { CatalogProduct, DeliveryPayload, Subscriber } from './contracts.js';
import { emailLayout, escapeHtml, usd } from './email.js';
import { unsubscribeToken } from './service.js';

interface Match { product: CatalogProduct; kind: 'alert' | 'digest'; reason: string }
export function selectMatches(subscriber: Subscriber, catalog: CatalogProduct[], now = Date.now()): Match[] {
  const matches: Match[] = [];
  for (const product of catalog) {
    const captured = Date.parse(product.updatedAt);
    if (!Number.isFinite(captured) || captured > now || now - captured > 86400000
      || product.refreshStatus === 'retained' || product.inStock === false
      || !Number.isFinite(product.currentPrice) || product.currentPrice <= 0) continue;
    const alert = subscriber.price_alerts.find(a => a.enabled && a.product_id === product.id);
    if (alert && product.currentPrice <= alert.target_price
      && (alert.last_notified_price === null || product.currentPrice < alert.last_notified_price)) {
      matches.push({ product, kind: 'alert', reason: `Cumple tu precio objetivo de ${usd(alert.target_price)} o menos.` });
      continue;
    }
    if (!subscriber.newsletter || (subscriber.categories.length && !subscriber.categories.includes(product.category))
      || (subscriber.max_budget !== null && product.currentPrice > subscriber.max_budget)
      || (subscriber.digest_prices[product.id] !== undefined && product.currentPrice >= subscriber.digest_prices[product.id])) continue;
    const points = (product.history ?? []).filter(p => Number.isFinite(p.price) && p.price > 0
      && Date.parse(p.date) <= captured && Date.parse(p.date) >= now - 90 * 86400000)
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const latest = points.at(-1);
    const previous = points.filter(p => Date.parse(p.date) < captured).at(-1);
    if (latest && previous && Date.parse(latest.date) === captured && latest.price === product.currentPrice && product.currentPrice < previous.price) {
      matches.push({ product, kind: 'digest', reason: `Bajó de ${usd(previous.price)} a ${usd(product.currentPrice)} entre las dos últimas capturas.` });
    }
  }
  return matches.sort((a, b) => Number(b.kind === 'alert') - Number(a.kind === 'alert') || a.product.currentPrice - b.product.currentPrice).slice(0, 10);
}

export async function notificationEmail(subscriber: Subscriber, catalog: CatalogProduct[], site: string, secret: string, now = Date.now()): Promise<DeliveryPayload | null> {
  const matches = selectMatches(subscriber, catalog, now);
  if (!matches.length) return null;
  const unsubscribe = new URL('/api/subscriptions/unsubscribe', site);
  unsubscribe.searchParams.set('token', await unsubscribeToken(subscriber.id, secret));
  const captureDate = (date: string) => new Intl.DateTimeFormat('es-SV', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/El_Salvador',
  }).format(new Date(date));
  const link = (id: string) => `${new URL('/', site).href}#deal-${encodeURIComponent(id)}`;
  const subject = `${matches.length === 1 ? 'Un precio que coincide' : `${matches.length} precios que coinciden`} con tus avisos`;
  const footer = 'Precios capturados, no reservas. Confirma disponibilidad, envío y precio final en la tienda. Horas de El Salvador.';
  return {
    validUntil: new Date(Math.min(...matches.map(m => Date.parse(m.product.updatedAt))) + 86400000).toISOString(),
    alertPrices: Object.fromEntries(matches.filter(m => m.kind === 'alert').map(m => [m.product.id, m.product.currentPrice])),
    digestPrices: Object.fromEntries(matches.map(m => [m.product.id, m.product.currentPrice])),
    mail: {
      subject,
      text: `${subject}\n\n${matches.map(({ product: p, reason }) => `${p.title}\n${p.store}: ${usd(p.currentPrice)}\n${reason}\nCaptura: ${captureDate(p.updatedAt)}\n${link(p.id)}`).join('\n\n')}\n\n${footer}\n\nDar de baja todos mis avisos: ${unsubscribe.href}`,
      html: emailLayout(subject, `${matches.map(({ product: p, reason }) => `<section style="border-bottom:1px solid #dce0d4;padding:16px 0"><h2 style="font-size:18px">${escapeHtml(p.title)}</h2><p>${escapeHtml(p.store)} · <strong>${usd(p.currentPrice)}</strong></p><p>${escapeHtml(reason)}</p><p style="font-size:12px">Captura: ${captureDate(p.updatedAt)}</p><a href="${escapeHtml(link(p.id))}" style="color:#242922">Ver precio y detalles</a></section>`).join('')}<p>${footer}</p><p><a href="${escapeHtml(unsubscribe.href)}" style="color:#242922">Dar de baja todos mis avisos</a></p>`),
      headers: { 'List-Unsubscribe': `<${unsubscribe.href}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click', 'Auto-Submitted': 'auto-generated' },
    },
  };
}
