import { VtexStoreAdapter } from './vtex-adapter.js';

export const prismamodaScraper = new VtexStoreAdapter({
  storeId: 'prismamoda', storeName: 'Prisma Moda', baseUrl: 'https://www.prismamoda.com',
  categoriesToSearch: [
    { category: 'moda_calzado', categoryPaths: ['7/327', '7/29', '7/11', '7/29/50', '7/11/28', '7/51', '7/62', '1/31', '1'] },
    { category: 'tv_audio', categoryPaths: ['9/124', '9/201'] },
    { category: 'smartphones', categoryPaths: ['9/119'] },
    { category: 'computacion', categoryPaths: ['9/121', '9/122'] },
    { category: 'linea_blanca', categoryPaths: ['258/267', '258/270', '258/261', '258/259'] },
    { category: 'gaming', categoryPaths: ['9/355'] },
  ],
});
