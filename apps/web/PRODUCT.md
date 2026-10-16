# BlackFridaySV

<!-- impeccable:product-schema 1 -->

## Platform

web

## Usuarios y propósito

Compradores en El Salvador que quieren encontrar un producto, comparar el precio publicado por distintos almacenes y guardar opciones antes de comprar. El objetivo confirmado en el encargo es una experiencia sencilla, cuidada y útil para aprovechar ofertas.

## Capacidades y restricciones

SPA existente con React 19, Vite y Tailwind CSS v4. Conservar monorepo, scrapers, normalización MPN, Supabase de lectura pública y despliegue Cloudflare. El flujo actual es catálogo estático cacheado, consulta Supabase si falla, y catálogo local de contingencia.

La web tiene búsqueda, categorías, almacenes, presupuesto, ordenación, paginación, vista de fichas/lista, guardados locales, compartir por WhatsApp, enlaces directos a fichas y contenido de metodología, uso y privacidad.

## Evidencia disponible

El archivo `public/data/deals-snapshot.json` contiene productos, precios de oferta y referencia anunciada, imágenes, enlaces y fechas de captura. La presencia de un precio de referencia no prueba que se cobrara anteriormente. `baselinePrice30d` del generador actual es una estimación; no equivale a una serie histórica. No hay observaciones fechadas suficientes en este snapshot para dibujar historia o afirmar inflación.

Las comparaciones se limitan a coincidencias identificables de fabricante y modelo. No todo el catálogo tiene MPN. Las cifras visibles deben derivarse del catálogo cargado; la contingencia debe identificarse como demostración.

## Compromisos de marca

Nombre BlackFridaySV, idioma español y trato de tú. Iniciativa independiente para compradores salvadoreños. El encargo autoriza sustituir la identidad visual conservando arquitectura y utilidad.

## Principios

- Precio, producto y tienda visibles antes del detalle técnico.
- Distinguir descuento anunciado de ahorro histórico comprobado.
- Mostrar origen y fecha cuando existan, sin llamar «en vivo» a una captura.
- Ninguna cuenta necesaria para buscar ni guardar.
- Teclado, foco visible, movimiento reducido y controles táctiles de 44 px.
