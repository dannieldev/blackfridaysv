export const CONSENT_VERSION = '2026-10-20-v1';
export const CATEGORY_LABELS: Record<string, string> = {
  tv_audio: 'TV y audio', smartphones: 'Celulares', computacion: 'Computación',
  linea_blanca: 'Electrodomésticos', gaming: 'Videojuegos', moda_calzado: 'Moda y calzado', fotografia: 'Fotografía',
};
export interface SubscriptionInput {
  email: string;
  consent: true;
  newsletter: boolean;
  categories: string[];
  maxBudget: number | null;
  alert: { productId: string; targetPrice: number } | null;
  website?: string;
}
export interface CatalogProduct {
  id: string; title: string; store: string; category: string; currentPrice: number;
  updatedAt: string; inStock?: boolean | null; refreshStatus?: string;
  history?: { date: string; price: number }[];
}
export interface Subscriber {
  id: string; email: string; newsletter: boolean; categories: string[];
  max_budget: number | null; digest_prices: Record<string, number>;
  price_alerts: { product_id: string; target_price: number; last_notified_price: number | null; enabled: boolean }[];
}
export interface Mail { subject: string; html: string; text: string; headers?: Record<string, string> }
export interface DeliveryPayload {
  mail: Mail; alertPrices: Record<string, number>; digestPrices: Record<string, number>; validUntil: string;
}

export function validateSubscription(value: unknown): SubscriptionInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Revisa los datos del formulario.');
  const input = value as Record<string, unknown>;
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) throw new Error('Escribe un correo válido.');
  if (input.consent !== true) throw new Error('Acepta recibir los avisos que solicitas.');
  if (typeof input.newsletter !== 'boolean') throw new Error('Selecciona qué avisos quieres recibir.');
  const categories = Array.isArray(input.categories) ? [...new Set(input.categories)] : [];
  if (categories.some(c => typeof c !== 'string' || !Object.hasOwn(CATEGORY_LABELS, c))) throw new Error('Selecciona categorías válidas.');
  const budget = input.maxBudget;
  if (budget != null && (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0.01 || budget > 1000000)) throw new Error('Escribe un presupuesto válido.');
  let alert: SubscriptionInput['alert'] = null;
  if (input.alert != null) {
    const a = input.alert as Record<string, unknown>;
    if (typeof a.productId !== 'string' || !/^(siman|walmart|curacao|prado|omnisport|radioshack|raf|prismamoda)-[A-Za-z0-9._-]{1,100}$/.test(a.productId)
      || typeof a.targetPrice !== 'number' || !Number.isFinite(a.targetPrice) || a.targetPrice < 0.01 || a.targetPrice > 1000000) {
      throw new Error('Revisa el producto y el precio objetivo.');
    }
    alert = { productId: a.productId, targetPrice: Math.round(a.targetPrice * 100) / 100 };
  }
  if (!input.newsletter && !alert) throw new Error('Elige una alerta o el resumen de ofertas.');
  return { email, consent: true, newsletter: input.newsletter, categories: categories as string[],
    maxBudget: typeof budget === 'number' ? Math.round(budget * 100) / 100 : null, alert,
    website: typeof input.website === 'string' ? input.website : '' };
}
