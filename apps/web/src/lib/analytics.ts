/**
 * Analytics & Traffic Instrumentation for BlackFridaySV
 * Integrates:
 *  - Google Analytics 4 (GA4) with Google Consent Mode v2
 *  - Google Tag Manager (GTM)
 *  - Microsoft Clarity (Mapas de calor / Heatmaps / Grabaciones de sesión)
 *  - Meta / Facebook Pixel (Campañas de tráfico y retargeting)
 *  - Google Ads / Google Tag Pixel (Conversiones y remarketing)
 *  - Custom Civic & E-commerce Tracking Events
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    GA_MEASUREMENT_ID?: string;
    GTM_ID?: string;
    CLARITY_ID?: string;
    FB_PIXEL_ID?: string;
    GOOGLE_ADS_ID?: string;
    // Microsoft Clarity global
    clarity?: (...args: unknown[]) => void;
    // Meta / Facebook Pixel global
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export const DEFAULT_GA_ID = 'G-XX21E9DWXN';

/**
 * Obtiene el valor de una etiqueta meta o fallback a undefined
 */
function getMetaContent(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  return meta?.content && meta.content.trim().length > 0 ? meta.content.trim() : undefined;
}

/**
 * Retorna el ID de medición activo de GA4
 */
export function getMeasurementId(): string {
  if (typeof window === 'undefined') return DEFAULT_GA_ID;
  if (window.GA_MEASUREMENT_ID) return window.GA_MEASUREMENT_ID;
  if (import.meta.env?.VITE_GA_MEASUREMENT_ID) return import.meta.env.VITE_GA_MEASUREMENT_ID;
  const meta = getMetaContent('google-analytics');
  if (meta && meta.startsWith('G-')) return meta;
  return DEFAULT_GA_ID;
}

/**
 * Retorna el ID de Google Tag Manager (GTM-XXXXXXX) si está configurado
 */
export function getGTMId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  if (window.GTM_ID) return window.GTM_ID;
  if (import.meta.env?.VITE_GTM_ID) return import.meta.env.VITE_GTM_ID;
  return getMetaContent('google-tag-manager');
}

/**
 * Retorna el ID de Microsoft Clarity (Heatmaps & Session Recordings)
 */
export function getClarityId(): string | undefined {
  if (typeof window === 'undefined') return 'z97nys8fg7';
  if (window.CLARITY_ID) return window.CLARITY_ID;
  if (import.meta.env?.VITE_CLARITY_ID) return import.meta.env.VITE_CLARITY_ID;
  return getMetaContent('clarity-id') || 'z97nys8fg7';
}

/**
 * Retorna el ID de Facebook / Meta Pixel
 */
export function getFacebookPixelId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  if (window.FB_PIXEL_ID) return window.FB_PIXEL_ID;
  if (import.meta.env?.VITE_FB_PIXEL_ID) return import.meta.env.VITE_FB_PIXEL_ID;
  return getMetaContent('facebook-pixel-id');
}

/**
 * Retorna el ID de Google Ads / Conversion Tag (AW-XXXXXXXXX)
 */
export function getGoogleAdsId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  if (window.GOOGLE_ADS_ID) return window.GOOGLE_ADS_ID;
  if (import.meta.env?.VITE_GOOGLE_ADS_ID) return import.meta.env.VITE_GOOGLE_ADS_ID;
  return getMetaContent('google-ads-id');
}

/**
 * Comprueba si el usuario ya otorgó consentimiento en localStorage
 */
export function hasUserConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('blackfridaysv_cookie_consent') === 'accepted';
  } catch {
    return false;
  }
}

/**
 * Inicializa Microsoft Clarity (Mapas de calor y grabaciones de sesión)
 */
export function initClarity(): void {
  if (typeof window === 'undefined') return;
  const clarityId = getClarityId();
  if (!clarityId || document.getElementById('clarity-script')) return;

  // Snippet oficial de Microsoft Clarity
  (function (c: Window, l: Document, a: string, r: string, i: string) {
    // @ts-expect-error clarity internal function
    c[a] = c[a] || function () { ((c[a].q = c[a].q || []).push(arguments)); };
    const t = l.createElement(r) as HTMLScriptElement;
    t.id = 'clarity-script';
    t.async = true;
    t.src = 'https://www.clarity.ms/tag/' + i;
    const y = l.getElementsByTagName(r)[0];
    y?.parentNode?.insertBefore(t, y);
  })(window, document, 'clarity', 'script', clarityId);
}

/**
 * Inicializa Meta (Facebook) Pixel
 */
export function initFacebookPixel(): void {
  if (typeof window === 'undefined') return;
  const pixelId = getFacebookPixelId();
  if (!pixelId || document.getElementById('facebook-pixel-script')) return;

  // Snippet oficial de Meta Pixel
  (function (f: Window, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n = function (...args: unknown[]) {
      // @ts-expect-error facebook pixel internal callMethod
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions, prefer-spread
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    };
    n.queue = [] as unknown[];
    n.loaded = true;
    n.version = '2.0';
    f.fbq = n as unknown as (...args: unknown[]) => void;
    if (!f._fbq) f._fbq = n;
    const t = b.createElement(e) as HTMLScriptElement;
    t.id = 'facebook-pixel-script';
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s?.parentNode?.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  if (window.fbq) {
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }
}

/**
 * Inicializa Google Tag Manager (GTM)
 */
export function initGTM(): void {
  if (typeof window === 'undefined') return;
  const gtmId = getGTMId();
  if (!gtmId || document.getElementById('gtm-script')) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
}

/**
 * Inicializa Google Consent Mode v2, GA4, GTM, Clarity y Meta Pixel
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

  const hasConsent = hasUserConsent();

  // Google Consent Mode v2 por defecto (garantiza cumplimiento y modelado de conversiones)
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

  // Configurar Google Ads si hay un ID específico disponible
  const adsId = getGoogleAdsId();
  if (adsId && adsId !== gaId) {
    window.gtag('config', adsId);
  }

  // Cargar gtag.js si no está presente
  if (!document.getElementById('ga-gtag-script')) {
    const script = document.createElement('script');
    script.id = 'ga-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);
  }

  // Inicializar contenedores y herramientas adicionales si están configurados
  initGTM();
  initClarity();
  initFacebookPixel();
  captureCampaignAttribution();
}

/**
 * Captura parámetros de campañas publicitarias (UTM, Google Ads gclid, Meta Ads fbclid)
 * y etiqueta la sesión en GA4, GTM dataLayer y Microsoft Clarity.
 */
export function captureCampaignAttribution(): Record<string, string> {
  if (typeof window === 'undefined' || !window.location?.search) return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
    const captured: Record<string, string> = {};
    for (const key of keys) {
      const val = params.get(key)?.trim();
      if (val) captured[key] = val;
    }
    if (Object.keys(captured).length > 0) {
      try {
        sessionStorage.setItem('bfsv_campaign_attribution', JSON.stringify(captured));
      } catch {
        // Ignorar si sessionStorage está restringido
      }
      trackEvent('campaign_visit', captured);
      if (window.clarity) {
        for (const [k, v] of Object.entries(captured)) {
          try {
            window.clarity('set', k, v);
          } catch {
            // Ignorar
          }
        }
      }
    }
    return captured;
  } catch {
    return {};
  }
}

/**
 * Actualiza el estado de consentimiento cuando el usuario interactúa con el banner de cookies.
 */
export function updateAnalyticsConsent(status: 'granted' | 'denied'): void {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: status,
      ad_storage: status,
      ad_user_data: status,
      ad_personalization: status,
    });
  }

  // Si se otorga consentimiento, inicializar píxeles publicitarios si antes estaban en espera
  if (status === 'granted') {
    initClarity();
    initFacebookPixel();
  }

  // Enviar evento de consentimiento a dataLayer para GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'cookie_consent_update',
      consent_status: status,
    });
  }
}

/**
 * Registra un evento universal en Google Analytics, GTM, Meta Pixel y Clarity
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;

  // 1. Google Analytics (gtag)
  if (window.gtag) {
    try {
      window.gtag('event', name, params);
    } catch {
      // Ignorar para proteger UX
    }
  }

  // 2. Google Tag Manager dataLayer push
  if (window.dataLayer) {
    try {
      window.dataLayer.push({
        event: name,
        ...params,
      });
    } catch {
      // Ignorar
    }
  }

  // 3. Microsoft Clarity custom event
  if (window.clarity) {
    try {
      window.clarity('event', name);
    } catch {
      // Ignorar
    }
  }
}

/**
 * Evento: Lead generado (Usuario se suscribe a avisos o Wishlist)
 * Dispara el evento Lead en Google Analytics y en Facebook Pixel
 */
export function trackLeadSubmission(type: 'product_alert' | 'wishlist' | 'newsletter', metadata: Record<string, unknown> = {}): void {
  trackEvent('generate_lead', {
    event_category: 'lead_generation',
    lead_type: type,
    ...metadata,
  });

  if (typeof window === 'undefined') return;

  // Meta Pixel Standard Event: Lead
  if (window.fbq) {
    try {
      window.fbq('track', 'Lead', {
        content_name: type,
        ...metadata,
      });
    } catch {
      // Ignorar
    }
  }

  // Google Ads conversion event si está configurado
  const adsId = getGoogleAdsId();
  if (window.gtag && adsId) {
    try {
      window.gtag('event', 'conversion', {
        send_to: adsId,
        ...metadata,
      });
    } catch {
      // Ignorar
    }
  }
}

/**
 * Evento: Usuario se une a la Wishlist oficial
 */
export function trackWishlistJoin(categories: string[]): void {
  trackLeadSubmission('wishlist', {
    event_label: 'black_friday_wishlist',
    selected_categories_count: categories.length,
    selected_categories: categories.join(','),
  });
}

/**
 * Evento: Alerta de bajada de precio creada para un producto específico
 */
export function trackPriceAlertCreated(productId: string, productTitle: string, targetPrice: number, store: string): void {
  trackLeadSubmission('product_alert', {
    product_id: productId,
    product_title: productTitle,
    target_price: targetPrice,
    store,
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

  if (typeof window === 'undefined') return;

  // Facebook Pixel Standard Event: ViewContent / Outbound Click
  if (window.fbq) {
    try {
      window.fbq('track', 'ViewContent', {
        content_name: title,
        content_category: store,
        value: price,
        currency: 'USD',
      });
    } catch {
      // Ignorar
    }
  }
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

  if (typeof window === 'undefined') return;

  // Facebook Pixel Search event
  if (window.fbq) {
    try {
      window.fbq('track', 'Search', {
        search_string: query,
      });
    } catch {
      // Ignorar
    }
  }
}

/**
 * Evento: Filtro por categoría (para medir qué categorías son las más visitadas)
 */
export function trackCategoryFilter(categoryId: string, label?: string): void {
  trackEvent('filter_category', {
    category_id: categoryId,
    category_label: label || categoryId,
  });

  if (typeof window === 'undefined') return;

  // Identificar en Microsoft Clarity qué categoría está explorando
  if (window.clarity) {
    try {
      window.clarity('set', 'active_category', categoryId);
    } catch {
      // Ignorar
    }
  }
}

/**
 * Evento: Guardar / Quitar producto en favoritos
 */
export function trackSaveDeal(dealId: string, title: string, action: 'save' | 'unsave'): void {
  trackEvent(action === 'save' ? 'add_to_wishlist' : 'remove_from_wishlist', {
    product_id: dealId,
    product_title: title,
  });

  if (typeof window === 'undefined') return;

  if (action === 'save' && window.fbq) {
    try {
      window.fbq('track', 'AddToWishlist', {
        content_name: title,
      });
    } catch {
      // Ignorar
    }
  }
}

/**
 * Evento: Configuración o actualización del Radar / Presupuesto Personal
 */
export function trackRadarPreference(enabled: boolean, budget: number | null, categories: string[]): void {
  trackEvent('radar_update', {
    radar_enabled: enabled,
    budget_limit: budget ?? 'none',
    categories_monitored: categories.length,
    categories: categories.join(','),
  });

  if (typeof window === 'undefined') return;

  if (window.clarity && enabled) {
    try {
      window.clarity('set', 'radar_user', 'true');
    } catch {
      // Ignorar
    }
  }
}

/**
 * Evento: Compartir oferta verificada (WhatsApp o enlace copiado)
 */
export function trackShareDeal(dealId: string, title: string, channel: 'whatsapp' | 'copy'): void {
  trackEvent('share', {
    method: channel,
    content_type: 'deal',
    item_id: dealId,
    product_title: title,
  });
}
