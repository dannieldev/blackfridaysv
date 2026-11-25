import { MagentoStoreAdapter } from './magento-adapter.js';

/**
 * Almacenes Tropigas El Salvador (Grupo Unicomer) — Adobe Commerce con Live Search GraphQL.
 * Competidor directo en línea blanca, pantallas Smart TV, telefonía celular, audio, cómputo y consolas.
 */
export const tropigasScraper = new MagentoStoreAdapter({
  storeId: 'tropigas',
  storeName: 'Almacenes Tropigas',
  baseUrl: 'https://www.almacenestropigas.com.sv',
  liveSearch: {
    environmentId: 'b0453fee-9cca-41d9-930c-0a94fd84b9bd',
    apiKey: '2999e5a23078490096b15ef87ccc499c',
    websiteCode: 'at_el_salvador_w',
    storeCode: 'at_el_salvador_s',
    storeViewCode: 'at_el_salvador_sv',
  },
  categoriesToSearch: [
    { category: 'tv_audio', path: 'c/tecnologia/tv-y-video/televisores' },
    { category: 'tv_audio', path: 'c/tecnologia/audio' },
    { category: 'smartphones', path: 'c/telefonia/celulares-y-telefonos/celulares' },
    { category: 'computacion', path: 'c/tecnologia/computacion' },
    { category: 'linea_blanca', path: 'c/linea-blanca' },
    { category: 'linea_blanca', path: 'c/electrodomesticos' },
    { category: 'gaming', path: 'c/tecnologia/gaming' },
  ],
});
