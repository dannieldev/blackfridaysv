import { VtexStoreAdapter } from './vtex-adapter.js';

export const simanScraper = new VtexStoreAdapter({
  storeId: 'siman',
  storeName: 'Almacenes Siman El Salvador',
  baseUrl: 'https://sv.siman.com',
  categoriesToSearch: [
    {
      category: 'tv_audio',
      terms: ['smart tv', 'pantalla lg', 'pantalla samsung', 'soundbar'],
    },
    {
      category: 'smartphones',
      terms: ['galaxy s24', 'iphone', 'xiaomi redmi', 'motorola'],
    },
    {
      category: 'computacion',
      terms: ['laptop', 'macbook', 'monitor gamer', 'ipad'],
    },
    {
      category: 'linea_blanca',
      terms: ['refrigeradora mabe', 'lavadora', 'aire acondicionado', 'microondas'],
    },
    {
      category: 'gaming',
      terms: ['playstation 5', 'nintendo switch', 'xbox series'],
    },
  ],
});
