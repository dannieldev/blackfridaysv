import { MagentoStoreAdapter } from './magento-adapter.js';

export const radioshackScraper = new MagentoStoreAdapter({
  storeId: 'radioshack',
  storeName: 'RadioShack El Salvador',
  baseUrl: 'https://www.radioshackla.com/elsalvador',
  liveSearch: {
    environmentId: 'b0453fee-9cca-41d9-930c-0a94fd84b9bd',
    apiKey: '2999e5a23078490096b15ef87ccc499c',
    websiteCode: 'rso_el_salvador_w',
    storeCode: 'rso_el_salvador_s',
    storeViewCode: 'rso_el_salvador_sv',
  },
  categoriesToSearch: [
    { category: 'tv_audio', path: 'c/video/televisores' },
    { category: 'tv_audio', path: 'c/audio' },
    { category: 'computacion', path: 'c/computacion/computadoras/laptops' },
    { category: 'computacion', path: 'c/computacion' },
    { category: 'smartphones', path: 'c/telefonia/celulares' },
    { category: 'gaming', path: 'c/mundo-gamer' },
  ],
});
