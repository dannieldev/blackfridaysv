# DESIGN.md — Sistema de Diseño y Tokens: Radar Black Friday SV

> **Directriz**: Basado en el *Manual de Creación Web Anti-Genérica con IA* y la *Guía de Valor Web Profesional* (`prompts.dannieldev.com/manual` y `/valor`).

---

## 1. Dirección Visual y Propuesta Estética

* **Arquetipo**: *Financial Intelligence & Consumer Civic Audit* (Auditoría Financiera y Transparencia Ciudadana).
* **Propósito**: Empoderar al comprador en El Salvador para detectar rebajas legítimas frente a precios inflados previamente por los comercios.
* **Cero Slop**:
  - Sin gradientes violetas/púrpura genéricos de IA.
  - Sin emojis decorativos en títulos (`R-04`).
  - Sin sombras difusas desmedidas.
  - Tipografía intencional con números tabulares monoespaciados para precios.

---

## 2. Tokens de Color y Contraste (WCAG AA 4.5:1)

```css
:root {
  /* Fondo y Superficies */
  --bg-canvas: #020617;        /* slate-950: Fondo principal */
  --bg-surface: #0f172a;       /* slate-900: Tarjetas y contenedores */
  --bg-surface-elevated: #1e293b; /* slate-800: Modales y toolbars */
  --border-subtle: #1e293b;    /* slate-800: Bordes discretos */
  --border-hover: #334155;     /* slate-700: Bordes interactivos */

  /* Tipografía */
  --text-primary: #ffffff;     /* Blanco: Títulos principales (21:1) */
  --text-secondary: #cbd5e1;   /* slate-300: Cuerpo de texto (11.5:1) */
  --text-muted: #94a3b8;       /* slate-400: Metadatos y etiquetas (7.1:1) */
  --text-dim: #64748b;         /* slate-500: Elementos secundarios (>4.5:1) */

  /* Semáforo de Veracidad (Precios y Ofertas) */
  --deal-ganga: #10b981;       /* emerald-500: Ganga histórica / Rebaja real */
  --deal-ganga-bg: rgba(6, 78, 59, 0.3);
  --deal-inflada: #f43f5e;     /* rose-500: Oferta inflada previa */
  --deal-inflada-bg: rgba(136, 19, 55, 0.3);
  --deal-cosmetico: #f59e0b;   /* amber-500: Mismo precio de siempre */
  --deal-cosmetico-bg: rgba(120, 53, 15, 0.3);
  --deal-podio: #6366f1;       /* indigo-500: Comparativa entre tiendas */

  /* Marca y Acciones */
  --accent-primary: #2563eb;   /* blue-600: Botones principales */
  --accent-hover: #3b82f6;     /* blue-500: Hover interactivo */
}
```

---

## 3. Tipografía y Escala Modular

* **Familia Principal**: `DM Sans`, sans-serif (legibilidad óptima y neutralidad pericial).
* **Familia Numérica / Código**: `JetBrains Mono`, monospace (`font-mono`, números tabulares alineados en precios y códigos MPN).
* **Escala**:
  - `Hero Display`: 32px móvil / 48px desktop (Bold 800, tracking -0.02em).
  - `Card Title`: 16px móvil / 18px desktop (Bold 700, leading 1.3).
  - `Price Hero`: 24px - 30px (Mono Bold 700).
  - `Body`: 13px - 14px (Regular 400 / Medium 500, leading 1.5).
  - `Badges & Micro`: 11px - 12px (Semibold 600, tracking 0.04em).

---

## 4. Ergonomía y Apple HIG (Áreas Táctiles)

* **Área Táctil Mínima**: `44px x 44px` en todos los botones, filtros y chips en pantallas móviles (`min-h-[44px]`).
* **Espaciado**: Rejilla de 8 puntos (`p-2`, `p-4`, `p-6`, `p-8`).
* **Navegación por Teclado**: Anillo de foco visible de 2px (`focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none`).

---

## 5. Animación y Movimiento (Escuela Emil Kowalski)

* **Duración**: 180ms – 220ms.
* **Curva**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out natural).
* **Escala de Modales**: Entrada desde `scale(0.97)` a `scale(1)`. Prohibido escalar desde 0.
* **Accesibilidad**: `@media (prefers-reduced-motion: reduce)` desactiva animaciones y transiciones para usuarios sensibles.

---

## 6. Copywriting Salvadoreño y Rigor Legal

* **Términos Transparentes**: "Almacén", "Rebaja real", "Línea base de octubre", "Precio regular".
* **Sustento Legal**: Artículos 31 y 32 de la Ley de Protección al Consumidor de El Salvador.
* **Tono**: Objetivo, verídico, educativo y cercano.
