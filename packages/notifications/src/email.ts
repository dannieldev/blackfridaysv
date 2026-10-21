import type { Mail, SubscriptionInput } from './contracts.js';
import { CATEGORY_LABELS } from './contracts.js';
import type { ServiceEnvironment } from './service.js';

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const usd = (price: number) => new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(price);
export function emailLayout(title: string, body: string) {
  return `<!doctype html><html lang="es"><meta charset="utf-8"><body style="margin:0;background:#fafbf7;color:#242922;font-family:'DM Sans',Arial,sans-serif"><main style="max-width:560px;margin:auto;padding:32px 24px"><p style="font-weight:bold">blackfridaysv.</p><h1 style="font-size:26px;line-height:1.2">${escapeHtml(title)}</h1>${body}<p style="font-size:12px;color:#61685c;margin-top:32px">BlackFridaySV · Una iniciativa independiente de @dannieldev para compradores en El Salvador.</p></main></body></html>`;
}
export function confirmationEmail(input: SubscriptionInput, url: string, productTitle?: string): Mail {
  const details = [
    ...(input.alert ? [`Alerta para ${productTitle ?? 'el producto seleccionado'} cuando su precio sea ${usd(input.alert.targetPrice)} o menos.`] : []),
    ...(input.newsletter ? [`Acceso prioritario y comparativas de ofertas en ${input.categories.length ? input.categories.map(c => CATEGORY_LABELS[c]).join(', ') : 'todas las categorías de almacenes de El Salvador'}${input.maxBudget ? `, hasta ${usd(input.maxBudget)}` : ''}.`] : []),
  ];
  const notice = 'Al confirmar aseguras tu lugar en la Wishlist de BlackFridaySV para recibir comparativas reales cuando se lancen las ofertas. El enlace vence en 24 horas. Puedes darte de baja en 1 clic en cualquier momento.';
  return {
    subject: '✨ Confirma tu lugar en la Wishlist de BlackFridaySV',
    text: `Bienvenido a BlackFridaySV\n\nConfirma tu suscripción a la Wishlist oficial:\n\n${details.join('\n')}\n\nActiva tu confirmación aquí:\n${url}\n\n${notice}`,
    html: emailLayout(
      '¡Bienvenido a BlackFridaySV!',
      `<p>Estás a un solo paso de unirte a la <strong>Wishlist Oficial de BlackFridaySV</strong>. Muy pronto recibirás las mejores comparativas de precios de todos los almacenes de El Salvador y las verdaderas ofertas de Black Friday.</p>
       <div style="background:#f0f2ea;padding:16px;border-radius:8px;margin:20px 0">
         <strong style="display:block;margin-bottom:8px">Tus preferencias registradas:</strong>
         <ul style="margin:0;padding-left:20px">${details.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>
       </div>
       <p style="margin:24px 0">
         <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 24px;background:#d4f578;color:#1e261f;font-weight:700;text-decoration:none;border-radius:8px">Confirmar mi lugar en la Wishlist</a>
       </p>
       <p style="font-size:12px;color:#61685c">${notice}</p>`
    ),
  };
}
export async function sendEmail(env: ServiceEnvironment, to: string, mail: Mail, key: string, transport: typeof fetch = (url, init) => fetch(url, init)): Promise<string> {
  const response = await transport('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], ...mail }),
  });
  if (!response.ok) throw new Error(`email_${response.status}`);
  const result = await response.json() as { id?: string };
  if (!result.id) throw new Error('email_missing_id');
  return result.id;
}
