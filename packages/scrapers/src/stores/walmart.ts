import { VtexStoreAdapter } from './vtex-adapter.js';

export const walmartScraper = new VtexStoreAdapter({
  storeId: 'walmart',
  storeName: 'Walmart El Salvador',
  baseUrl: 'https://www.walmart.com.sv',
  categoriesToSearch: [
    { category: 'moda_calzado', terms: ['camiseta hombre', 'blusa mujer', 'pantalon', 'zapatos', 'tenis'] },
    {
      category: 'tv_audio',
      terms: ['pantalla', 'smart tv', 'soundbar'],
    },
    {
      category: 'smartphones',
      terms: ['samsung galaxy', 'iphone', 'xiaomi', 'celular'],
    },
    {
      category: 'computacion',
      terms: ['laptop', 'impresora', 'tablet samsung', 'tablet lenovo', 'ipad'],
    },
    {
      category: 'linea_blanca',
      terms: ['refrigeradora', 'lavadora', 'microondas', 'estufa'],
    },
    {
      category: 'gaming',
      terms: ['consola', 'playstation', 'nintendo'],
    },
  ],
});
