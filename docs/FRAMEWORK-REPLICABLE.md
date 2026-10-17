# 🌐 Framework Replicable de Observatorio de Precios Black Friday
*(Guía de arquitectura abierta para desplegar en Colombia, Guatemala, Costa Rica, México u otros países)*

---

## 🏛️ Filosofía de Arquitectura

BlackFridaySV fue concebido como un **motor modular y cívico** contra la publicidad engañosa y los falsos descuentos. Su arquitectura está dividida en dos capas desacopladas dentro de un monorepo (`npm workspaces`):

```
blackfridaysv/
├── apps/
│   └── web/                   # Frontend React 19, Vite, Tailwind CSS v4
│       ├── public/data/       # Snapshot estático de alta resiliencia
│       └── src/               # UI del comparador, sparklines y normalizador
└── packages/
    └── scrapers/              # Motores de extracción por comercio
        └── src/
            ├── adapters/      # Adaptadores para plataformas (VTEX, Magento, Shopify)
            └── core/          # Normalizador MPN (regex internacional)
```

---

## 🚀 Cómo Replicar este Proyecto en Otro País

### 1. Clonar el repositorio
```bash
git clone https://github.com/dannieldev/blackfridaysv.git blackfriday-co # (ej. Colombia)
cd blackfriday-co
npm install
```

### 2. Configurar la moneda y región
En `apps/web/src/lib/deals.ts`:
```ts
// Ajustar a la moneda local (ej. COP para Colombia, GTQ para Guatemala, MXN para México)
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' });
```

### 3. Crear los adaptadores de almacenes locales
En `packages/scrapers/src/`:
1. Identificar la tecnología del almacén:
   - **VTEX**: (Éxito en Colombia, Elektra, etc.) ➔ usar `vtex-adapter.ts`.
   - **Magento 2**: (Alkosto, Ktronix, etc.) ➔ usar `magento-adapter.ts`.
   - **Shopify**: ➔ usar endpoints JSON nativos `/products.json`.
2. Registrar los adaptadores en `packages/scrapers/src/index.ts`.

### 4. Normalizador de Códigos de Modelo (MPN)
El archivo `packages/scrapers/src/core/normalizer.ts` contiene las expresiones regulares internacionales para:
- Samsung (TVs, Galaxy S/A/Z)
- LG (OLED, QNED, Nanocell)
- Sony (Bravia, PlayStation)
- Apple (iPhones, MacBooks, iPads)
- HP, Lenovo, ASUS, Dell
- Mabe, Whirlpool, LG Línea Blanca

Este algoritmo es universal y funciona de inmediato en cualquier país.

### 5. Despliegue Serverless Gratuito
- **Cloudflare Workers Static Assets**: Despliegue en el edge con coste $0 mediante `npm run deploy` en `apps/web`.
- **GitHub Actions**: Automatización de scraping diario en `.github/workflows/crawler.yml`.
