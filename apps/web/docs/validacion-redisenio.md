# Validación del rediseño

Fecha: 15 de octubre de 2026, El Salvador. Entorno local: React 19, Vite, navegador integrado de Codex. La propuesta editorial es revisable; no se ha desplegado.

## Resultado

Compilación TypeScript/Vite correcta, diez pruebas de datos superadas y recorridos principales verificados en navegador. La revisión visual independiente concluyó **SHIP para los defectos revisados**, tras corregir un problema de feedback dentro del diálogo. Esto no equivale a una certificación universal de accesibilidad ni a pruebas con usuarios.

## Recorridos ejecutados

| Recorrido | Evidencia observada |
| --- | --- |
| Carga del catálogo | 586 productos reales de cinco tiendas; captura mostrada en hora de El Salvador. Pestaña nueva sin errores ni advertencias de consola. |
| Búsqueda escrita y rápida | «Samsung» devuelve 85 resultados y un filtro removible. Una búsqueda inexistente muestra vacío con recuperación. `/` enfoca el buscador. |
| Categorías | TV/audio 103, celulares 140, computación 101, electrodomésticos 173 y videojuegos 69; volver a todo restaura 586. |
| Filtros combinados | Samsung + Siman/Walmart + $100–300 devuelve 14 resultados. Selecciones visibles y removibles; panel móvil muestra su recuento y regresa al catálogo. |
| Disponibilidad | «Solo con stock confirmado» muestra cero resultados con el snapshot actual; no convierte disponibilidad desconocida en existencias. Al quitarlo se recupera el conjunto. |
| Tipos de resultados | Rebaja anunciada devuelve 402; «Para comparar» devuelve 10. Guardados vacíos ofrece una salida útil. |
| Orden | Precio ascendente y descendente, porcentaje e importe anunciado, y comparables primero cambian el primer resultado. Precio descendente mostró $3,299.00. |
| Vista y páginas | Tarjetas/lista cambian la presentación; 24 por página produce 24 fichas; avanzar muestra página 2/25. Los cambios de filtro regresan a primera página. |
| Guardados | Guardar una ficha, recargar y consultar guardados conserva el producto. Retirarlo desde el detalle actualiza la lista. Los favoritos de prueba fueron retirados. |
| Detalle y enlaces | Apertura desde ficha y portada; enlace directo válido abre el producto. Copiar produce un enlace con el ID. Compra y WhatsApp apuntan al producto y contenido correspondientes; se inspeccionaron sus destinos sin comprar ni enviar mensajes. |
| Feedback en diálogo | Copiar muestra «Enlace copiado» dentro del diálogo. Guardar y retirar anuncian el resultado en esa misma zona. Capturas desktop y móvil verificadas. |
| Teclado y foco | Escape cierra; retorno de foco al disparador. Si se elimina el producto que abrió el detalle, el foco vuelve al título del catálogo. El teclado no abandona el diálogo nativo. |
| Ayuda y legal | Metodología abre; flechas y Home/End recorren las pestañas. Escape restaura el foco a Metodología y desbloquea el scroll. |
| Enlaces inválidos | ID inexistente muestra recuperación. Pasar a metodología deja un único diálogo. Ruta inexistente muestra 404 y permite volver. |

## Responsive y revisión visual

Se inspeccionaron portada, catálogo, filtros y detalle. A 1440, 744, 390 y 320 px no hay desbordamiento horizontal del documento. En el navegador con barra vertical de 15 px, los anchos útiles de 1425, 729, 375 y 305 px coinciden con `scrollWidth`. Las categorías y los tipos de resultado tienen su propio desplazamiento horizontal.

La comprobación de 320 px detectó un ancho mínimo del cuerpo y un margen lateral de categorías que competían con la barra del navegador. Se eliminaron esos desbordamientos y se volvió a medir. La versión móvil mantiene dos columnas, filtros en diálogo, controles principales de 44 px y una salida directa desde la portada al catálogo.

Evidencias locales, excluidas de Git mediante `.impeccable/review/`:

- [Portada de escritorio](../.impeccable/review/desktop-preview.jpg)
- [Página completa de escritorio](../.impeccable/review/desktop.jpg)
- [Página móvil](../.impeccable/review/mobile.jpg)
- [Catálogo móvil](../.impeccable/review/mobile-catalog.jpg)
- [Pantalla de 320 px](../.impeccable/review/mobile-320.jpg)
- [Filtros a 744 px](../.impeccable/review/tablet-filters.jpg)
- [Feedback del detalle](../.impeccable/review/detail-feedback.jpg)
- [Detalle móvil](../.impeccable/review/mobile-detail.jpg)
- [Revisión independiente](../.impeccable/review/independent-review.md)

## Contraste, movimiento y semántica

Los pares de texto del sistema se calcularon con la fórmula WCAG: tinta/lienzo 14.28:1, secundario/lienzo 5.55:1, secundario/superficie 5.10:1, auxiliar/grafito 8.27:1, acción lima/grafito 12.67:1, positivo/fondo 7.27:1 y atención/fondo 6.79:1. El texto secundario del pie medido conserva 5.04:1. Superan el mínimo de 4.5:1 para texto normal.

El foco usa contorno visible; campos, iconos de acción y diálogos tienen nombres accesibles. La reducción de movimiento está implementada en CSS. No se realizó una sesión con lector de pantalla, dispositivo físico, teclado virtual o modo de alto contraste; tampoco se afirma una certificación WCAG completa.

## Datos, arquitectura y rendimiento

Las diez pruebas de `tests/deals.test.ts` cubren validación del snapshot, texto codificado, fecha conservadora, coincidencias de modelo, deduplicación de comercios, disponibilidad, descuentos anunciados, IDs estables, historial explícito, fallback y timeout. Incluyen el snapshot real.

El snapshot conserva prioridad; Supabase y los ejemplos identificados quedan como contingencia. No se alteraron scrapers, infraestructura de Cloudflare, base de datos ni credenciales. El SDK de Supabase pasa a un chunk que sólo se solicita cuando hace falta la contingencia. En la compilación medida el JavaScript inicial bajó de aproximadamente 512 KB a 286 KB (88 KB gzip); no es una medición de LCP o conversión.

No hay datos suficientes para afirmar mínimos históricos: el historial usa observaciones fechadas reales y, si faltan, explica su ausencia. El precio tachado es una referencia anunciada por el comercio. La comparación cubre las coincidencias disponibles, no todo el mercado salvadoreño. El fallback de base de datos conserva el límite existente de 100 registros; no se comprobó un fallo real de Supabase contra producción.

## Comprobaciones técnicas

- `npm run build`: correcto, sin advertencia de tamaño del chunk inicial.
- `node --test apps/web/tests/deals.test.ts`: 10/10.
- `git diff --check`: sin errores.
- Detector mecánico Impeccable: una ejecución, resultado vacío (`[]`).
- Revisión independiente de código y capturas: un P2 corregido y revalidado; sin pendientes observados.

Los valores de recuento y precio documentan esta captura concreta; cambiarán cuando se actualice el catálogo.
