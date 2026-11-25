import { MagentoStoreAdapter } from './magento-adapter.js';

/**
 * La Curacao (Grupo Unicomer) — Adobe Commerce con Live Search (Catalog Service GraphQL).
 * Extrae productos en stock con MPN oficial ('mpn_iden_del_prod_t' / 'modelo_comercial_iden_del_prod_t').
 */
export const curacaoScraper = new MagentoStoreAdapter({
  storeId: 'curacao',
  storeName: 'La Curacao El Salvador',
  baseUrl: 'https://www.lacuracaonline.com/elsalvador',
  liveSearch: {
    environmentId: 'b0453fee-9cca-41d9-930c-0a94fd84b9bd',
    apiKey: '2999e5a23078490096b15ef87ccc499c',
    websiteCode: 'lco_el_salvador_w',
    storeCode: 'lco_el_salvador_s',
    storeViewCode: 'lco_el_salvador_sv',
  },
  categoriesToSearch: [
    { category: 'tv_audio', path: 'c/tecnologia/tv-y-video/televisores' },
    { category: 'tv_audio', path: 'c/tecnologia/audio' },
    { category: 'smartphones', path: 'c/telefonia/celulares-y-telefonos/celulares' },
    { category: 'computacion', path: 'c/tecnologia/computacion/laptops' },
    { category: 'computacion', path: 'c/tecnologia/computacion/tablets' },
    { category: 'computacion', path: 'c/tecnologia/computacion/impresoras' },
    { category: 'linea_blanca', path: 'c/linea-blanca/refrigeracion/refrigeradoras' },
    { category: 'linea_blanca', path: 'c/linea-blanca/lavadoras-y-secadoras/lavadoras' },
    { category: 'linea_blanca', path: 'c/linea-blanca/cocina/cocinas' },
    { category: 'linea_blanca', path: 'c/linea-blanca/climatizacion/aires-acondicionados' },
    { category: 'linea_blanca', path: 'c/electrodomesticos' },
    { category: 'gaming', path: 'c/tecnologia/gaming/consolas' },
    { category: 'gaming', path: 'c/tecnologia/gaming' },
  ],
});
