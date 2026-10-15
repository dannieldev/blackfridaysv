import { MagentoStoreAdapter } from './magento-adapter.js';

/**
 * La Curacao (Grupo Unicomer) — Magento 2 Luma con tema "Lco/default".
 *
 * Notas técnicas (verificadas):
 * - El CDN (Varnish/Fastly) bloquea rutas de búsqueda: /rest/V1/* (401),
 *   /graphql (406), /catalogsearch/* (404/406). No intentarlo.
 * - Las páginas de categoría SÍ son server-rendered y requieren slash final
 *   ("/c/tv-y-video/" responde 200; sin slash el CDN devuelve 406).
 * - El CDN alterna bloqueos 406 por ruta (tv-y-video suele bloquearse desde
 *   ciertas IPs); el adapter reintenta y falla gracefully por categoría.
 * - Cada tarjeta trae data-product-sku (código de barras real del producto).
 */
export const curacaoScraper = new MagentoStoreAdapter({
  storeId: 'curacao',
  storeName: 'La Curacao El Salvador',
  baseUrl: 'https://www.lacuracaonline.com/elsalvador',
  categoriesToSearch: [
    {
      category: 'tv_audio',
      path: '/c/tv-y-video/',
    },
    {
      category: 'smartphones',
      path: '/c/telefonia/celulares-y-telefonos/celulares/',
    },
    {
      category: 'linea_blanca',
      path: '/c/linea-blanca/',
    },
    {
      category: 'linea_blanca',
      path: '/c/electrodomesticos/',
    },
  ],
});
