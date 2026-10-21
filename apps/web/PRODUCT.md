# BlackFridaySV

<!-- impeccable:product-schema 1 -->

## Platform

web

## Usuarios y propósito

Compradores en El Salvador que quieren encontrar un producto, comparar el precio publicado por distintos almacenes y guardar opciones antes de comprar. El objetivo confirmado en el encargo es una experiencia sencilla, cuidada y útil para aprovechar ofertas.

## Capacidades y restricciones

SPA existente con React 19, Vite y Tailwind CSS v4. Conservar monorepo, scrapers, normalización MPN, Supabase de lectura pública y despliegue Cloudflare. El flujo actual es catálogo estático cacheado, consulta Supabase si falla, y catálogo local de contingencia.

La web tiene búsqueda, categorías, almacenes, presupuesto, ordenación, paginación, vista de fichas/lista, guardados locales, compartir por WhatsApp, enlaces directos a fichas y contenido de metodología, uso y privacidad.

Se preparó una suscripción por correo con confirmación: alertas de productos por precio objetivo y resumen de bajadas por categorías y presupuesto. Las tablas privadas de interesados se crean con una migración independiente; los correos se envían mediante Resend desde servidor. El catálogo público y los guardados locales siguen separados de la lista de suscriptores. La entrega está desactivada hasta aplicar la migración remota, conectar Resend y publicar el Worker; ver `docs/suscripciones-resend.md`.

## Evidencia disponible

El archivo `public/data/deals-snapshot.json` contiene productos, precios de oferta y referencia anunciada, imágenes, enlaces, fechas de captura e historial real de hasta 90 días. El crawler incorpora observaciones de Supabase y conserva las capturas anteriores cuando una tienda falla. La presencia de un precio de referencia no prueba que se cobrara anteriormente. El generador ya no produce baselines estimados ni veredictos de inflación.

La gráfica necesita capturas de al menos dos días distintos en El Salvador. «Mínimo del periodo» significa el menor precio observado en esa tienda dentro de las fechas mostradas, con alguna observación anterior más alta. No equivale a mínimo anual ni permite inferir intención de fraude. El filtro de mínimos además requiere una captura de las últimas 24 horas. Cada ficha, comparación y resumen por tienda permite reconocer precios antiguos o pendientes de actualización.

La copia local se enriqueció el 19 de octubre de 2026 con 5.984 observaciones para 596 productos, sin modificar Supabase. La operación y sus límites están documentados en `docs/historial-y-actualizacion.md`.

El 20 de octubre se amplió a 2,027 referencias de ocho tiendas, incluyendo 728 de moda y calzado. Se incorporaron Prisma Moda, RadioShack y RAF. El semáforo visible separa oportunidades con evidencia, precios para comparar, precios para esperar y registros por verificar; cada ficha explica su motivo. Los productos nuevos empiezan con una captura, no con un historial inferido. Cobertura, reglas y límites: [catálogo y semáforo](docs/catalogo-y-semaforo.md).

Las comparaciones se limitan a coincidencias identificables de fabricante y modelo. No todo el catálogo tiene MPN. Las cifras visibles deben derivarse del catálogo cargado; la contingencia debe identificarse como demostración.

## Compromisos de marca

Nombre BlackFridaySV, idioma español y trato de tú. Iniciativa independiente para compradores salvadoreños. El encargo autoriza sustituir la identidad visual conservando arquitectura y utilidad.

## Principios

- Precio, producto y tienda visibles antes del detalle técnico.
- Distinguir descuento anunciado de ahorro histórico comprobado.
- Mostrar origen y fecha cuando existan, sin llamar «en vivo» a una captura.
- Ninguna cuenta necesaria para buscar ni guardar.
- Teclado, foco visible, movimiento reducido y controles táctiles de 44 px.
