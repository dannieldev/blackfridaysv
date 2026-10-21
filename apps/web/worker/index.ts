import { CONSENT_VERSION, validateSubscription, type CatalogProduct } from '../../../packages/notifications/src/contracts.js';
import { confirmationEmail, escapeHtml, sendEmail } from '../../../packages/notifications/src/email.js';
import { Database, hashToken, isConfigured, randomToken, verifyUnsubscribe, type ServiceEnvironment } from '../../../packages/notifications/src/service.js';

export interface Env extends ServiceEnvironment { ASSETS: { fetch(request: Request): Promise<Response> } }
const privateHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...privateHeaders, 'Content-Type': 'application/json; charset=utf-8' },
});
function page(title: string, message: string, action?: { path: string; token: string; label: string }, status = 200) {
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · BlackFridaySV</title><style>@font-face{font-family:DM;src:url('/fonts/dm-sans.ttf')}body{margin:0;background:#fafbf7;color:#242922;font-family:DM,Arial,sans-serif}main{max-width:560px;padding:64px 24px;margin:auto}h1{font-size:32px;line-height:1.2}p{line-height:1.7}button{font:inherit;background:#d4f578;border:1px solid #56772d;border-radius:8px;min-height:48px;padding:12px 20px;cursor:pointer}a{display:inline-block;color:#242922;padding-block:16px}a:focus-visible,button:focus-visible{outline:3px solid #56772d;outline-offset:4px}</style></head><body><main><strong>blackfridaysv.</strong><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${action ? `<form method="post" action="${action.path}"><input type="hidden" name="token" value="${escapeHtml(action.token)}"><button>${escapeHtml(action.label)}</button></form>` : ''}<p><a href="/">Volver al catálogo</a></p></main></body></html>`, {
    status, headers: { ...privateHeaders, 'Content-Type': 'text/html; charset=utf-8', 'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" },
  });
}
function sameOrigin(request: Request, env: Env) {
  return request.headers.get('Origin') === new URL(env.SITE_URL).origin;
}
async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 8192) { await reader.cancel(); throw new Error('body_too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (url.pathname === '/api/subscriptions/config' && request.method === 'GET') return json({ enabled: isConfigured(env) });
  const db = new Database(env);
  try {
    if (url.pathname === '/api/subscriptions' && request.method === 'POST') {
      if (!isConfigured(env)) return json({ error: 'Los avisos por correo aún no están disponibles. Puedes guardar productos en este navegador.' }, 503);
      if (!sameOrigin(request, env)) return json({ error: 'Solicitud no permitida.' }, 403);
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Formato no admitido.' }, 415);
      let input;
      try { input = validateSubscription(JSON.parse(await readBody(request))); }
      catch (error) {
        const message = error instanceof SyntaxError ? 'Revisa el formato de la solicitud.'
          : error instanceof Error && error.message !== 'body_too_large' ? error.message : 'Solicitud demasiado grande.';
        return json({ error: message }, 400);
      }
      if (input.website) return json({ message: 'Revisa tu correo para confirmar los avisos.' }, 202);
      const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
      const ipAllowed = await db.rpc<boolean>('bf_email_rate_limit', {
        p_key: await hashToken(`${env.EMAIL_TOKEN_SECRET}:ip:${ip}`), p_limit: 10, p_seconds: 3600,
      });
      if (!ipAllowed) return json({ error: 'Se han solicitado varios correos desde esta conexión. Inténtalo más tarde.' }, 429);
      const emailAllowed = await db.rpc<boolean>('bf_email_rate_limit', {
        p_key: await hashToken(`${env.EMAIL_TOKEN_SECRET}:email:${input.email}`), p_limit: 3, p_seconds: 86400,
      });
      if (!emailAllowed) return json({ error: 'Ya se solicitaron varios correos. Revisa tu bandeja y spam; si no llegan, inténtalo mañana.' }, 429);
      let product: CatalogProduct | undefined;
      if (input.alert) {
        const response = await env.ASSETS.fetch(new Request(new URL('/data/deals-snapshot.json', request.url)));
        if (!response.ok) throw new Error('catalog_unavailable');
        const catalog = await response.json() as CatalogProduct[];
        product = catalog.find(p => p.id === input.alert!.productId);
        if (!product) return json({ error: 'El producto ya no está en el catálogo. Selecciona otro.' }, 400);
      }
      const token = randomToken();
      const rows = await db.request<{ id: string }[]>('email_opt_ins', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ email: input.email, token_hash: await hashToken(token), consent_version: CONSENT_VERSION,
          source: input.alert ? 'product' : 'newsletter', payload: { newsletter: input.newsletter,
            categories: input.categories, maxBudget: input.maxBudget, alert: input.alert } }),
      });
      const confirmationUrl = new URL('/api/subscriptions/confirm', env.SITE_URL);
      confirmationUrl.searchParams.set('token', token);
      await sendEmail(env, input.email, confirmationEmail(input, confirmationUrl.href, product?.title), `confirm/${rows[0].id}`);
      return json({ message: 'Revisa tu correo y confirma los avisos. Si no aparece, busca en spam.' }, 202);
    }
    if (url.pathname === '/api/subscriptions/confirm') {
      if (request.method === 'GET') {
        const token = url.searchParams.get('token') ?? '';
        if (!/^[a-f0-9]{64}$/.test(token)) return page('Enlace inválido', 'Solicita un nuevo correo de confirmación desde el catálogo.', undefined, 400);
        return page('Confirma tus avisos', 'Al confirmar activas los avisos que solicitaste. Puedes darte de baja desde cualquier correo.',
          { path: url.pathname, token, label: 'Confirmar mi suscripción' });
      }
      if (request.method === 'POST') {
        if (!sameOrigin(request, env)) return page('Solicitud no permitida', 'Abre el enlace desde el correo recibido.', undefined, 403);
        const token = new URLSearchParams(await readBody(request)).get('token') ?? '';
        if (!/^[a-f0-9]{64}$/.test(token)) return page('Enlace inválido', 'Solicita un nuevo correo desde el catálogo.', undefined, 400);
        const id = await db.rpc<string | null>('bf_confirm_subscription', { p_hash: await hashToken(token) });
        return id ? page('Tu correo está confirmado', 'Los avisos que solicitaste están activos. Recibirás como máximo un resumen al día cuando haya coincidencias.')
          : page('Este enlace ya no está disponible', 'Puede haber vencido o haberse utilizado. Si ya confirmaste, tus avisos siguen activos salvo que te hayas dado de baja.', undefined, 410);
      }
    }
    if (url.pathname === '/api/subscriptions/unsubscribe') {
      const body = request.method === 'POST' ? new URLSearchParams(await readBody(request)) : null;
      const token = url.searchParams.get('token') ?? body?.get('token') ?? '';
      const id = await verifyUnsubscribe(token, env.EMAIL_TOKEN_SECRET);
      if (!id) return page('Enlace inválido', 'Abre el enlace de baja incluido en tu correo.', undefined, 400);
      if (request.method === 'GET') return page('Dar de baja todos mis avisos', 'Dejarás de recibir alertas de productos y resúmenes de ofertas de BlackFridaySV.',
        { path: url.pathname, token, label: 'Dar de baja mis avisos' });
      if (request.method === 'POST') {
        const oneClick = body?.get('List-Unsubscribe') === 'One-Click';
        if (!oneClick && !sameOrigin(request, env)) return page('Solicitud no permitida', 'Abre el enlace desde tu correo.', undefined, 403);
        await db.rpc('bf_unsubscribe', { p_subscriber: id });
        return oneClick ? new Response(null, { status: 204, headers: privateHeaders })
          : page('Tus avisos están dados de baja', 'No recibirás nuevos avisos. Si había un correo en proceso de envío, aún podría llegar. Puedes volver a suscribirte cuando quieras.');
      }
    }
    return json({ error: 'Ruta o método no disponible.' }, 404);
  } catch (error) {
    console.error('Worker Error:', error);
    if (url.pathname === '/api/subscriptions/confirm' && error instanceof Error && error.message === 'alert_limit') {
      return page('Ya tienes veinte alertas activas', 'Puedes actualizar el precio objetivo de un producto que ya sigues. Para empezar de nuevo, da de baja todos tus avisos desde un correo y vuelve a elegir los productos.', undefined, 409);
    }
    return url.pathname === '/api/subscriptions'
      ? json({ error: 'No pudimos completar la solicitud. Si recibes un correo de confirmación, puedes usarlo; si no, vuelve a intentarlo más tarde.' }, 503)
      : page('No pudimos completar la solicitud', 'Inténtalo de nuevo más tarde con el mismo enlace.', undefined, 503);
  }
}

export default { fetch: handleRequest };
