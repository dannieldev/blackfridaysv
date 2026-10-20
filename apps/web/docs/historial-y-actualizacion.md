# Historial y actualización del catálogo

Implementación local: 19 de octubre de 2026, El Salvador. No se desplegó ni se ejecutaron escrituras remotas durante esta entrega.

## Datos y presentación

El navegador sigue cargando el snapshot cacheable antes de recurrir a Supabase y, por último, a ejemplos rotulados. El historial se exporta desde `price_history` por lotes y páginas de 1.000 registros, relacionado por tienda y SKU. No se hacen consultas de historial por cada visitante.

Las series contienen observaciones de los últimos 90 días. Las fechas repetidas se deduplican; se excluyen precios inválidos, fechas futuras y observaciones posteriores a la captura del precio mostrado. La gráfica requiere al menos dos días distintos en la zona horaria de El Salvador. Sus extremos, mínimo y tabla de capturas describen sólo el periodo observado; la línea no acredita precios entre capturas.

«Rebajas anunciadas» compara precio actual con referencia publicada. «Mínimos del periodo observado» exige una captura reciente, historial suficiente, un mínimo coincidente con el precio actual y alguna captura anterior más alta. No se usan los antiguos scores ni baselines como prueba. Se retiraron las estimaciones de mercado USA/Centroamérica porque no tenían fuente.

El fallback de la vista Supabase no incluye una serie histórica y algunas versiones de esa vista tampoco exponen `latest_captured_at`. En ese caso se informa historial o fecha no disponible; `last_scraped_at` no se usa como fecha del precio porque puede cambiar aunque falle su inserción.

## Protección y diagnóstico

- Una tienda vacía o con menos del 50% de su catálogo previo (cuando había al menos 10 productos) conserva todos sus precios y fechas anteriores. Los productos ausentes tampoco se eliminan en una extracción aceptada.
- Una extracción de una sola tienda conserva las otras tiendas. Una extracción parcial con cobertura suficiente incorpora sus filas válidas y conserva las demás.
- Los productos retenidos se marcan `refreshStatus: retained` y guardan `lastAttemptAt` sin reemplazar `updatedAt`.
- Una captura de más de 24 horas se señala como antigua. Una fecha desconocida o futura nunca aparece como reciente. La interfaz reevalúa el estado cada minuto.
- El snapshot se escribe mediante archivo temporal y renombrado. Los catálogos vacíos o corruptos no reemplazan el anterior.
- Los timeouts HTTP son de 20 segundos por intento. Los fallos de categorías se comunican al runner. Los resultados guardan conteos por tienda, motivo, estado del historial y fallos de persistencia en `.reports/crawler.json`.
- `dry-run` sólo genera el informe y estadísticas simuladas: no escribe Supabase ni el snapshot público. Una ejecución de producción sin credenciales falla explícitamente.
- Código de salida 0: ejecución completa; 2: parcial o sin productos aceptados; 1: error de configuración o fatal. Los reportes de conteos permiten distinguir productos retenidos por límites del catálogo de errores de extracción.

No hay borrado automático por antigüedad: una retirada de productos debe ser deliberada. Si el catálogo crece mucho o cambian los límites de extracción, revisar el umbral del 50% en el informe antes de modificarlo.

## Ejecución

Desde la raíz del monorepo:

```bash
npm test
npm run build --workspace=packages/scrapers
npm run build
npm run history:export --workspace=packages/scrapers
```

El último comando sólo lee Supabase y actualiza el snapshot local de los SKU que ya existen. Conserva la fecha original del último precio y deja stock desconocido cuando la observación no lo acredita. Requiere `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el entorno privado de los scrapers.

El workflow existente conserva sus dos ejecuciones diarias, a las 09:00 y 21:00 de El Salvador (GitHub puede demorar el inicio). Ahora ejecuta pruebas y compilación, serializa ejecuciones, publica el catálogo protegido cuando cambia y adjunta un informe. Si hubo un fallo parcial, termina con error después de preservar el catálogo. No se añadieron envíos de correo, WhatsApp ni alertas de usuario. La disponibilidad de secretos y el despliegue de este workflow en producción aún deben verificarse al publicarlo.

El service worker intenta primero el snapshot de red con límite de 2,5 segundos. Ante un error usa la última copia local manteniendo sus fechas; los fallos de caché no descartan una respuesta válida. Los encabezados de caché de Cloudflare se conservan.

## Validación local

Se leyeron 10.703 observaciones de Supabase para 1.248 SKU. Se incorporaron 5.984 observaciones a los 596 productos existentes, con 584 precios actualizados desde la base. 584 productos tienen capturas de días distintos para dibujar su gráfica; 12 no reúnen todavía esa condición. Los números describen esta importación, no se usan como constantes de interfaz.

Pruebas de datos, renderizado HTML de componentes, caché y fallos del pipeline; compilación de web y scrapers. La revisión visual y los recorridos en navegador quedaron sin verificar: la herramienta de navegador rechazó el acceso al sitio local por su política de URL. No se usó otra vía para eludir ese bloqueo.
