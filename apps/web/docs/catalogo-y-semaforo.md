# Ampliación del catálogo y semáforo

Implementación local del 20 de octubre de 2026. Conserva React, el monorepo, el catálogo cacheado, Supabase y el snapshot de respaldo. No se ha publicado desde este trabajo ni se han escrito datos remotos.

## Ajuste posterior solicitado por Danniel

Se retiraron **47 medicamentos** que la búsqueda genérica de «tablet» en Walmart había incorporado como computación. La copia local queda en **1,980 referencias**, incluidas las mismas 728 de moda y calzado. La tabla siguiente conserva los números de la captura inicial, antes de esta limpieza.

La exclusión utiliza categorías de farmacia y señales de presentación farmacéutica, y se aplica al adaptador VTEX, a la combinación con capturas anteriores y a la lectura de catálogos en la web. Las tablets electrónicas y sus accesorios siguen permitidos. Walmart ahora consulta términos específicos de tablets Samsung, Lenovo e iPad. No se borraron registros de la base de datos remota.

El semáforo se simplificó a cuatro botones con color, nombre y cantidad. Se quitaron el título, las descripciones y el bloque largo de explicación sobre los resultados. El motivo sigue disponible en la ficha y las reglas en «Cómo comparamos».

## Cobertura capturada

| Tienda | Productos en la copia local | Moda y calzado |
| --- | ---: | ---: |
| Siman | 755 | 249 |
| Walmart | 489 | 150 |
| La Curacao | 60 | 0 |
| Prado | 55 | 0 |
| Omnisport | 74 | 0 |
| Prisma Moda | 329 | 329 |
| RadioShack | 120 | 0 |
| RAF | 145 | 0 |
| **Total** | **2,027** | **728** |

Son referencias capturadas, no el inventario completo de cada tienda ni un conteo de descuentos comprobados. Las capturas anteriores de tiendas y productos no actualizados se conservan con su fecha. Todos los registros tienen un enlace de imagen; su disponibilidad futura depende de la tienda.

Fuentes oficiales consultadas: [Prisma Moda](https://www.prismamoda.com/), [RadioShack El Salvador](https://www.radioshackla.com/elsalvador/), [RAF](https://www.rafenlinea.com/), [Siman](https://sv.siman.com/) y [Walmart El Salvador](https://www.walmart.com.sv/).

- Prisma Moda usa categorías VTEX de damas, caballeros, niñas, niños, zapatos y accesorios. Siman amplía las consultas a esas familias; Walmart añade términos de ropa y calzado y exige una categoría de moda en la respuesta para excluir organizadores de zapatos.
- RadioShack aprovecha el adaptador Magento, con cinco secciones y la imagen real de carga diferida. Actualmente recorre la primera página de cada sección, hasta 24 resultados por página observada.
- RAF usa listados públicos de PrestaShop. Recupera los nombres completos del JSON-LD y sigue paginación dentro de la misma categoría, con límite por sección. La sección `/11-camaras` devolvió HTTP 403; el resto aportó 145 productos. Fotografía queda preparada y sólo aparece en la navegación del catálogo cuando existan registros.
- VTEX carga hasta 50 resultados por consulta configurada. No enumera todas las páginas ni todas las tallas.

## Tallas, vendedores e historial

En moda se selecciona una variante por producto, priorizando disponibilidad y después precio. El identificador contiene producto, SKU y vendedor; el título muestra las variantes que entrega la fuente y el enlace incluye el SKU. Si la variante más barata cambia, comienza una referencia distinta y la anterior queda pendiente de nueva captura. No se mezclan sus historiales ni se comparan prendas de tallas distintas entre tiendas. Los 10 registros antiguos de moda sin esta identidad se conservan como pendientes.

Los productos de las tres tiendas nuevas empiezan con una sola observación real. No se trasladan a ellos historiales de productos parecidos ni se inventan precios anteriores.

## Reglas del semáforo

| Señal | Criterio |
| --- | --- |
| **Vale la pena · verde** | Al menos 10% menos que el menor precio superior al actual repetido en dos días anteriores de los últimos 30; además, el actual es el mínimo del periodo observado, de hasta 90 días. |
| **Para comparar · amarillo** | Existe un precio repetido en dos días anteriores, pero no cumple los criterios verde o rojo. |
| **Mejor esperar · rojo** | Al menos 10% por encima de un precio registrado en dos días anteriores de los últimos 30; o una alternativa reciente, disponible y del mismo modelo en otra tienda cuesta al menos 10% menos. La comparación de tiendas no se aplica a moda. |
| **Por verificar · gris** | Faltan capturas o historial suficiente, el precio es inválido, la captura tiene más de 24 horas, está pendiente, el producto está agotado o es una demostración. |

Los días se calculan en El Salvador. Varias consultas en un mismo día no satisfacen la referencia de dos días anteriores. Los límites del 10% se comparan en centavos. El precio tachado y los veredictos antiguos del catálogo no intervienen en la clasificación. No son dictámenes legales ni una garantía sobre envío, garantía comercial o disponibilidad al comprar.

Los cuatro botones filtran y muestran recuentos dentro de la búsqueda y los filtros actuales. Pulsar la señal activa la quita. Cada ficha tiene una etiqueta y su detalle explica el motivo. La ordenación inicial prioriza oportunidades verificadas; los estados sin resultados permiten quitar el semáforo. En la verificación local se obtuvieron **13 verdes, 505 amarillos, 36 rojos y 1,473 grises**; estos números cambian con los precios y la antigüedad de las capturas.

## Operación y comprobaciones

`SCRAPER_STORE=prismamoda npm run scrape:snapshot` actualiza sólo el archivo local y conserva su historial. También admite `radioshack`, `raf`, `siman` y `walmart`; omitir la tienda consulta las ocho. Este modo no lee ni escribe Supabase ni despliega Cloudflare. `scrape:dry` sigue siendo una simulación que no escribe el snapshot.

En producción, el crawler ya registrado incorpora las ocho tiendas. El servidor inserta los metadatos que falten con `service_role`, sin sobrescribir tiendas existentes. Un fallo de registro impide las escrituras de productos y se informa como actualización parcial; el snapshot sigue disponible. Las políticas públicas de la base de datos no cambian.

Las pruebas cubren umbrales, frescura, historial insuficiente, variantes, vendedores, enlaces inválidos, parseo de las tiendas, paginación acotada, registro de tiendas y conservación del catálogo ante fallos. La revisión visual con navegador local permanece pendiente por el bloqueo de acceso de la herramienta; no se sustituye por una certificación basada en tests.

El estado de suscripciones y Resend se revisará por separado en [pendientes de coordinación](pendientes-coordinacion.md). Los contratos sólo se ampliaron para reconocer las nuevas tiendas y la categoría Fotografía.
