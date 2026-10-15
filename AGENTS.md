# AGENTS.md — Reglas y Estándar de Desarrollo con IA

> **Estándar Universal para Agentes de IA** (Claude Code, Cursor, Codex, Gemini, Copilot, Antigravity) que colaboran en el repositorio **`dannieldev/blackfridaysv`**.

---

## 🎯 Misión del Proyecto e Identidad

* **Nombre**: Radar Black Friday SV 2026 (`blackfridaysv`).
* **Propósito**: Plataforma cívica e independiente para auditar, comparar y transparentar precios en los principales almacenes de El Salvador (**Siman, La Curacao, Prado, Omnisport y Walmart**), detectando si una rebaja de Black Friday es real o si inflaron el precio previamente.
* **Fecha Límite de Lanzamiento**: Última semana de octubre de 2026.
* **Filosofía**: Rigor matemático pericial, datos objetivos, cero sobre-ingeniería, 100% serverless sin costos de infraestructura.

---

## 🏛️ Estructura del Monorepo

```text
blackfridaysv/
├── apps/
│   └── web/            # Frontend Web (React 19, Vite, Tailwind CSS v4, Cloudflare)
├── packages/
│   └── scrapers/       # Ingesta de datos (Node.js 22, TypeScript, VTEX & REST APIs)
├── supabase/
│   └── migrations/     # Esquemas PostgreSQL, vistas de inteligencia y RLS
└── .github/
    └── workflows/      # GitHub Actions CI/CD y Cron desatendido
```

---

## 🚨 Reglas de Oro Obligatorias para Cualquier Agente de IA

### 1. Seguridad Absoluta y Cero Credenciales en Git (PRIORIDAD MÁXIMA)
* **PROHIBIDO** commitear o hardcodear claves (`sb_secret_...`, `sb_publishable_...`, `CLOUDFLARE_API_TOKEN`, etc.) o URLs de bases de datos en archivos fuente.
* Las credenciales se leen **únicamente** desde variables de entorno:
  * Frontend: `import.meta.env.VITE_SUPABASE_URL`, `import.meta.env.VITE_SUPABASE_ANON_KEY`.
  * Scrapers: `process.env.SUPABASE_URL`, `process.env.SUPABASE_SERVICE_ROLE_KEY`.
* Todos los archivos `.env`, `.env.local` y `*.local` deben permanecer estrictamente ignorados en `.gitignore`.

### 2. Preservar la Arquitectura Anti-Colapso Viral (Triple Capa)
El usuario **NUNCA debe saturar Supabase directamente**. Cualquier agente que modifique el flujo de datos debe respetar este orden:
1. **Plan A (Edge Cache)**: En peticiones web, usar encabezados de caché de Cloudflare (`Cache-Control: max-age=300`) para que la CDN absorba el 99.9% de visitas.
2. **Plan B (Snapshot Estático de Respaldo)**: Cada ejecución del crawler debe regenerar `apps/web/public/data/deals-snapshot.json`. Si Supabase se satura, arroja 429/504 o está offline, el cliente web debe conmutar automáticamente al snapshot estático sin fallar.
3. **Plan C (Fallback Local)**: Si ambos fallan, mostrar el dataset de contingencia integrado.

### 3. APIs Ligeras antes que Scraping de DOM
* **NO usar navegadores pesados** (Puppeteer, Playwright o Selenium) a menos que sea estrictamente imposible obtener los datos de otra forma.
* Priorizar siempre los endpoints JSON internos no documentados:
  * **Siman y Walmart**: Corren sobre **VTEX** (`/api/catalog_system/pub/products/search`). Usar `vtex-adapter.ts`.
  * **Prado / Curacao**: Magento 2 REST / Catálogos JSON.
* Es 50x más rápido, consume 99% menos RAM y no se rompe con cambios visuales de CSS.

### 4. Contrato de Normalización de Modelos (MPN Regex)
* Todo scraper debe pasar los productos por `packages/scrapers/src/core/normalizer.ts`.
* Es obligatorio extraer el código de modelo internacional de fabricante (MPN, ej: `55UR7800PSB`, `SM-S928B`, `CFI-2015`).
* Sin código de modelo, el producto no podrá agruparse bajo un `canonical_id` ni compararse contra tiendas competidoras.

### 5. Seguridad en Base de Datos (Row Level Security - RLS)
* Las tablas de Supabase tienen RLS activado.
* Los usuarios anónimos (`anon` / `publishable`) tienen **únicamente permiso de `SELECT` (Lectura)**.
* **NUNCA** crear políticas que permitan `INSERT`, `UPDATE` o `DELETE` a usuarios públicos o anónimos. Las escrituras son exclusivas de los scrapers vía `service_role`.

### 6. Diseño Web Anti-Genérico (Zero AI Slop)
* La interfaz no debe lucir como una plantilla genérica con gradientes morados cliché o confeti de marketing.
* **Estética**: Herramienta pericial de auditoría y finanzas del consumidor. Fondo neutro sobrio (`slate-950`), tipografía clara (DM Sans) y cifras en tipografía monoespaciada (`font-mono` / JetBrains Mono).
* **Mobile-First**: Tap targets de al menos 44px para botones, veredicto visible en 1 tarjeta sin scroll innecesario y contraste accesible (WCAG AA).

---

## 🛠️ Comandos de Desarrollo del Proyecto

```bash
# Instalar dependencias en todos los workspaces
npm install

# Iniciar servidor web local (puerto 3030)
npm run dev

# Probar scrapers en modo simulación (sin escribir en DB)
npm run scrape:dry

# Ejecutar scrapers en producción (sincronizar con Supabase)
npm run scrape

# Ejecutar scraper de tienda específica
npm run scrape:siman
npm run scrape:walmart

# Compilar proyecto para producción (validación de TypeScript)
npm run build

# Desplegar web a Cloudflare Workers / Static Assets
npm run deploy
```

---

## 🧰 Skills Recomendadas para los Agentes del Equipo

Si los miembros de tu equipo utilizan asistentes como **Claude Code**, **Cursor**, **Codex** o **Antigravity**, se recomienda activar o instalar las siguientes skills especializadas:

| Skill | Propósito | Cómo invocarla / instalarla |
| :--- | :--- | :--- |
| **`anti-slop`** | 38 reglas deterministas contra el diseño genérico de IA, tap targets de 44px y verificación de contraste WCAG AA. | `skills add -g miqdadbadjuber/anti-slop` |
| **`ponytail`** | "The Lazy Senior Dev": Enforza código conciso, APIs nativas del navegador y cero sobre-ingeniería innecesaria. | `skills add -g DietrichGebert/ponytail` |
| **`taste-skill`** | Inferencia de estilos limpios, paletas sobrias y diseño visual de alto nivel antes de generar frontend. | `skills add -g taste-skill` |
| **`emil-design-eng`** | Microinteracciones táctiles suaves, física de resortes y transiciones de 200-300ms accesibles. | `skills add -g emilkowalski/skills` |
| **`security-and-hardening`** | Auditoría estricta de variables de entorno, inyecciones SQL, RLS y sanitización de inputs. | Built-in / Agent Skills |

---

## ✅ Checklist de Validación ("Definition of Done" para Agentes)

Antes de que un agente proponga un cambio o haga commit, debe verificar:
- [ ] `npm run build` compila con éxito en menos de 2 segundos y con 0 errores de TypeScript.
- [ ] `git status` y `git diff` no contienen tokens, URLs privadas de Supabase ni claves de API.
- [ ] Los nuevos campos o endpoints mantienen la contingencia offline/snapshot.
- [ ] Los selectores y APIs de scraping tienen manejo de errores con fallback graceful (nunca tirar el proceso entero por un 503 transitorio).
- [ ] Todo mensaje de commit sigue el estándar de Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`).
