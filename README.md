# 🛒 Radar de Ofertas Reales Black Friday El Salvador 2026

Plataforma colaborativa e independiente para auditar, transparentar y rastrear precios históricos en los principales almacenes de El Salvador (**Siman, La Curacao, Prado, Omnisport y Walmart**), detectando si una rebaja de Black Friday es genuina o si inflaron el precio previamente para simular un descuento.

---

## 🏛️ Arquitectura del Sistema

```text
blackfridaysv/
├── .github/
│   └── workflows/
│       └── crawler.yml          # Cron desatendido en GitHub Actions (2x/día en Octubre, 3h en Black Week)
├── apps/
│   └── web/                     # Frontend Mobile-first (Vite + React 19 + Tailwind CSS v4)
│       ├── src/                 # Buscador Omnibox, Semáforos de Veracidad y Comparador
│       ├── wrangler.jsonc       # Despliegue en Cloudflare Workers / Static Assets
│       └── package.json
├── packages/
│   └── scrapers/                # Motores de extracción e inteligencia (TypeScript / Node.js)
│       ├── src/
│       │   ├── stores/          # Conectores por tienda (Siman, Walmart, Curacao, Prado)
│       │   ├── core/            # Normalizador de Modelos (MPN) y Semáforo de Ofertas
│       │   ├── db/              # Cliente Supabase (service_role y dry-run)
│       │   └── index.ts         # Runner CLI con reporte de métricas
│       └── package.json
└── supabase/
    └── migrations/              # Script SQL inicial con esquema, vistas y políticas RLS
```

---

## 🚦 Algoritmo del Semáforo de Veracidad (Deal Score)

Cada producto auditado recibe un veredicto matemático automático:

| Semáforo | Calificación | Condición Matemática | Mensaje al Consumidor |
| :--- | :--- | :--- | :--- |
| 🟢 **Verde Intenso** | **Ganga Histórica** | `Precio Actual <= Mínimo Histórico` (≥15% abajo del promedio 30d) | *"¡Mínimo histórico verificado! Precio más bajo registrado en los últimos 60 días."* |
| 🟢 **Verde Claro** | **Buena Oferta** | `Precio Actual < Promedio 30d` (entre 7% y 14% de ahorro real) | *"Descuento real comprobado sobre su precio habitual de mercado."* |
| 🔴 **Rojo Alerta** | **Falso Descuento** | `Precio Base anunciado subió >15% en los últimos 20 días` | *"¡Cuidado! Inflaron el precio de lista recientemente para simular una rebaja."* |
| 🟡 **Amarillo** | **Descuento Cosmético** | `Variación < 3% respecto al precio promedio anual` | *"Oferta cosmética. Es prácticamente el mismo precio de todo el año."* |
| 🟣 **Púrpura** | **Más Barato en Competencia** | Otra tienda local vende el mismo modelo a menor precio | *"Atención: En [Tienda X] este mismo modelo está $Y más barato hoy."* |

---

## 🚀 Inicio Rápido para el Equipo

### 1. Clonar e Instalar Dependencias
```bash
git clone https://github.com/dannieldev/blackfridaysv.git
cd blackfridaysv
npm install
```

### 2. Configurar Variables de Entorno
Copia el archivo de ejemplo:
```bash
cp .env.example .env
```
Edita `.env` con las claves de tu proyecto de Supabase.

### 3. Levantar la Aplicación Web en Local
```bash
npm run dev
```
La aplicación abrirá en `http://localhost:3030`.

### 4. Probar los Scrapers en Local
Para extraer productos en vivo sin escribir en la base de datos (modo simulación):
```bash
npm run scrape:dry
```

Para extraer una tienda específica:
```bash
npm run scrape:siman
npm run scrape:walmart
```

---

## 🗄️ Base de Datos (Supabase)

1. Abre tu proyecto en [Supabase](https://supabase.com).
2. Ve al **SQL Editor**.
3. Copia y ejecuta el archivo:
   `supabase/migrations/20261015000000_init_blackfriday.sql`
4. ¡Listo! Creará las tablas `stores`, `canonical_products`, `store_products`, `price_history` y la vista inteligente `view_deal_radar`.

---

## 👥 Reparto de Tareas para el Equipo

* **Frontend Lead (Danniel)**:
  * Desarrollo de la interfaz web en `apps/web/`.
  * Buscador predictivo, fichas de producto y comparador entre tiendas.
  * Despliegue en Cloudflare con `npm run deploy`.

* **Data Engineer / Scrapers Lead**:
  * Mantenimiento y nuevos conectores en `packages/scrapers/src/stores/`.
  * Optimización de selectores y endpoints JSON.

* **Backend & Intelligence Lead**:
  * Migraciones en `supabase/migrations/`.
  * Afinado de expresiones regulares en `packages/scrapers/src/core/normalizer.ts` para capturar más modelos de hardware.

---

## ⚖️ Marco Legal y Transparencia Cívica
Esta herramienta procesa exclusivamente información de precios de oferta pública en sitios de comercio electrónico de El Salvador. Su metodología se alinea con los **Artículos 31 y 32 de la Ley de Protección al Consumidor de El Salvador**, que exigen que todo precio promocional o de oferta anterior corresponda a un precio real comprobable en los 30 días previos.
