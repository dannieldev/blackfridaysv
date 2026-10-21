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
    ...(input.newsletter ? [`Resumen de bajadas en ${input.categories.length ? input.categories.map(c => CATEGORY_LABELS[c]).join(', ') : 'todas las categorías'}${input.maxBudget ? `, hasta ${usd(input.maxBudget)}` : ''}.`] : []),
  ];
  const notice = 'Recibirás como máximo un resumen al día, sólo si hay coincidencias. El enlace vence en 24 horas. Si no lo solicitaste, ignora este correo: no activaremos avisos.';
  return {
    subject: 'Confirma tus avisos de BlackFridaySV',
    text: `Confirma tus avisos\n\n${details.join('\n')}\n\n${url}\n\n${notice}`,
    html: emailLayout('Confirma tus avisos', `<ul>${details.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul><p><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 20px;background:#d4f578;color:#1e261f;font-weight:bold;text-decoration:none">Confirmar mi correo</a></p><p>${notice}</p>`),
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
