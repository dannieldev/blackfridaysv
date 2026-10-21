/**
 * Analytics & Traffic Instrumentation for BlackFridaySV
 * Integrates Google Analytics 4 (GA4) with Google Consent Mode v2,
 * Cloudflare Web Analytics, and structured e-commerce/civic audit events.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    GA_MEASUREMENT_ID?: string;
  }
}

export const DEFAULT_GA_ID = 'G-7L96W75SRE';

/**
 * Retorna el ID de medición activo (de window, meta tag, o default)
 */
export function getMeasurementId(): string {
  if (typeof window === 'undefined') return DEFAULT_GA_ID;
  if (window.GA_MEASUREMENT_ID) return window.GA_MEASUREMENT_ID;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="google-analytics"]');
  if (meta?.content && meta.content.startsWith('G-')) return meta.content;
  return DEFAULT_GA_ID;
}

/**
 * Inicializa Google Consent Mode v2 y carga gtag.js de forma asíncrona y no bloqueante.
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
  }

  // Comprobar consentimiento previo en localStorage
  let hasConsent = false;
  try {
    hasConsent = localStorage.getItem('blackfridaysv_cookie_consent') === 'accepted';
  } catch {
    hasConsent = false;
  }

  // Google Consent Mode v2 por defecto
  window.gtag('consent', 'default', {
    analytics_storage: hasConsent ? 'granted' : 'denied',
    ad_storage: hasConsent ? 'granted' : 'denied',
    ad_user_data: hasConsent ? 'granted' : 'denied',
    ad_personalization: hasConsent ? 'granted' : 'denied',
    wait_for_update: 500,
  });

  window.gtag('js', new Date());

  const gaId = getMeasurementId();
  window.gtag('config', gaId, {
    page_title: document.title,
    page_location: window.location.href,
    anonymize_ip: true,
    send_page_view: true,
  });

  // Inyectar el script oficial de Google si no está presente
  if (!document.getElementById('ga-gtag-script')) {
    const script = document.createElement('script');
    script.id = 'ga-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);
  }
}

/**
 * Actualiza el estado de consentimiento cuando el usuario interactúa con el banner de cookies.
 */
export function updateAnalyticsConsent(status: 'granted' | 'denied'): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('consent', 'update', {
    analytics_storage: status,
    ad_storage: status,
    ad_user_data: status,
    ad_personalization: status,
  });
}

/**
 * Registra un evento personalizado en Google Analytics
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  try {
    window.gtag('event', name, params);
  } catch {
    // Silencioso para evitar romper UX
  }
}

/**
 * Evento: Usuario se une a la Wishlist oficial
 */
export function trackWishlistJoin(categories: string[]): void {
  trackEvent('join_wishlist', {
    event_category: 'lead_generation',
    event_label: 'black_friday_wishlist',
    selected_categories_count: categories.length,
    selected_categories: categories.join(','),
  });
}

/**
 * Evento: Clic en producto hacia tienda de El Salvador
 */
export function trackDealClick(store: string, title: string, price: number, url: string): void {
  trackEvent('select_item', {
    item_list_name: 'black_friday_deals',
    items: [
      {
        item_name: title,
        item_brand: store,
        price: price,
        affiliation: store,
      },
    ],
    outbound_url: url,
  });
}

/**
 * Evento: Búsqueda de productos en el radar
 */
export function trackSearch(query: string, resultCount: number): void {
  if (!query.trim()) return;
  trackEvent('search', {
    search_term: query,
    results_found: resultCount,
  });
}

/**
 * Evento: Filtro por categoría
 */
export function trackCategoryFilter(categoryId: string): void {
  trackEvent('filter_category', {
    category_id: categoryId,
  });
}

/**
 * Evento: Configuración o actualización del Radar / Presupuesto Personal
 */
export function trackRadarPreference(enabled: boolean, budget: number | null, categories: string[]): void {
  trackEvent('radar_update', {
    radar_enabled: enabled,
    budget_limit: budget ?? 'none',
    categories_monitored: categories.length,
  });
}
