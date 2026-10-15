import { MagentoStoreAdapter } from './magento-adapter.js';

/**
 * Almacenes Prado (Grupo Monge) — Magento 2 con tema "Omnipro/monge_base_child".
 *
 * Notas técnicas (verificadas):
 * - El listing de categorías profundas se renderiza CLIENTE-SIDE (vacío en HTML).
 *   La "apiKey" de Algolia del HTML apunta a un dominio inexistente (NXDOMAIN):
 *   no es un endpoint utilizable.
 * - Las páginas raíz/carruseles SÍ traen productos server-rendered con la
 *   estructura estándar de Magento (data-product-sku, finalPrice/oldPrice).
 * - El servidor responde con headers HTTP gigantes que desbordan el parser de
 *   Node por defecto => largeHeaders: true (fallback con undici).
 */
export const pradoScraper = new MagentoStoreAdapter({
  storeId: 'prado',
  storeName: 'Almacenes Prado El Salvador',
  baseUrl: 'https://www.prado.com.sv',
  largeHeaders: true,
  categoriesToSearch: [
    {
      category: 'tv_audio',
      path: '/tv-y-entretenimiento',
    },
    {
      category: 'tv_audio',
      path: '/productos/audio',
    },
    {
      category: 'smartphones',
      path: '/celulares-y-tablets',
    },
    {
      category: 'linea_blanca',
      path: '/hogar-y-linea-blanca',
    },
    {
      category: 'linea_blanca',
      path: '/productos/electrodomesticos',
    },
    {
      category: 'computacion',
      path: '/computadoras',
    },
    {
      category: 'gaming',
      path: '/gamer-lab',
    },
  ],
});
