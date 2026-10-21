import { MagentoStoreAdapter } from './magento-adapter.js';

export const radioshackScraper = new MagentoStoreAdapter({
  storeId: 'radioshack', storeName: 'RadioShack El Salvador', baseUrl: 'https://www.radioshackla.com/elsalvador',
  categoriesToSearch: [
    { category: 'tv_audio', path: '/c/audio/' },
    { category: 'tv_audio', path: '/c/video/' },
    { category: 'computacion', path: '/c/computacion/' },
    { category: 'smartphones', path: '/c/telefonia/celulares/' },
    { category: 'gaming', path: '/c/mundo-gamer/' },
  ],
});
