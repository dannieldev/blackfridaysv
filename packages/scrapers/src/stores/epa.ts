import { MagentoStoreAdapter } from './magento-adapter.js';

/**
 * Scraper para EPA El Salvador (sv.epaenlinea.com).
 * Corre sobre Magento 2 SSR (Luma) con categorías de electrodomésticos,
 * climatización, cocina y aspiradoras de alto ticket.
 */
export const epaScraper = new MagentoStoreAdapter({
  storeId: 'epa',
  storeName: 'EPA El Salvador',
  baseUrl: 'https://sv.epaenlinea.com',
  largeHeaders: true,
  categoriesToSearch: [
    { category: 'linea_blanca', path: '/electrodomesticos.html' },
    { category: 'linea_blanca', path: '/electrodomesticos/aires-acondicionados.html' },
    { category: 'linea_blanca', path: '/electrodomesticos/electrodomesticos-cocina.html' },
    { category: 'linea_blanca', path: '/aspiradoras.html' },
    { category: 'linea_blanca', path: '/electrodomesticos/dispensadores-agua.html' },
    { category: 'linea_blanca', path: '/electrodomesticos/ventiladores.html' },
  ],
});
