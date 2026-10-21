import { VtexStoreAdapter } from './vtex-adapter.js';

export const prismamodaScraper = new VtexStoreAdapter({
  storeId: 'prismamoda', storeName: 'Prisma Moda', baseUrl: 'https://www.prismamoda.com',
  categoriesToSearch: [
    { category: 'moda_calzado', categoryPaths: ['7/29', '7/11', '7/29/50', '7/11/28', '7/51', '7/62', '1'] },
  ],
});
