export interface ServiceEnvironment {
  SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string; EMAIL_FROM: string; EMAIL_TOKEN_SECRET: string; SITE_URL: string;
  SUBSCRIPTIONS_ENABLED?: string;
}

export class Database {
  constructor(private env: Pick<ServiceEnvironment, 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'>, private transport: typeof fetch = (url, init) => fetch(url, init)) {}
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.transport(`${this.env.SUPABASE_URL}/rest/v1/${path}`, {
      ...init, signal: AbortSignal.timeout(15000),
      headers: { apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
        ...(this.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}` } : {}),
        'Content-Type': 'application/json', ...init.headers },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(error.message === 'alert_limit' ? 'alert_limit' : `database_${response.status}`);
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  }
  rpc<T>(name: string, parameters: Record<string, unknown>): Promise<T> {
    return this.request<T>(`rpc/${name}`, { method: 'POST', body: JSON.stringify(parameters) });
  }
}

const encoder = new TextEncoder();
const hex = (value: ArrayBuffer) => [...new Uint8Array(value)].map(b => b.toString(16).padStart(2, '0')).join('');
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
export const hashToken = async (value: string) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
async function signingKey(secret: string) {
  if (secret.length < 32) throw new Error('missing_token_secret');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function unsubscribeToken(id: string, secret: string): Promise<string> {
  return `${id}.${hex(await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(`unsubscribe:${id}`)))}`;
}
export async function verifyUnsubscribe(token: string, secret: string): Promise<string | null> {
  const match = token.match(/^([a-f0-9-]{36})\.([a-f0-9]{64})$/);
  if (!match) return null;
  const signature = Uint8Array.from(match[2].match(/../g)!, h => parseInt(h, 16));
  return await crypto.subtle.verify('HMAC', await signingKey(secret), signature, encoder.encode(`unsubscribe:${match[1]}`)) ? match[1] : null;
}
export function isConfigured(env: Partial<ServiceEnvironment>): env is ServiceEnvironment {
  return env.SUBSCRIPTIONS_ENABLED === 'true' && Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    && env.RESEND_API_KEY && env.EMAIL_FROM && env.SITE_URL && (env.EMAIL_TOKEN_SECRET?.length ?? 0) >= 32);
}
