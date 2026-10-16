# Referentes y decisiones de UX para BlackFridaySV

Fecha de consulta: **15 de octubre de 2026**, hora de El Salvador.

Esta investigación acompaña el rediseño de BlackFridaySV como un catálogo independiente que ayuda a encontrar ofertas y comprender la evidencia detrás de un precio. Documenta referencias consultadas, lo que puede trasladarse al producto y los límites de la revisión. Las recomendaciones de diseño no constituyen resultados de pruebas con usuarios de BlackFridaySV.

## Dirección recomendada

**Compra con criterio.** La identidad debe comunicar claridad y cuidado mediante la presentación del producto, una jerarquía de precios consistente y evidencia comprensible. El catálogo permite explorar; el detalle explica por qué una oferta merece atención.

La arquitectura técnica existente es una restricción del proyecto: el rediseño no requiere cambiar los scrapers, la normalización de modelos, las reglas de lectura de Supabase ni la cadena de caché y contingencia. Las funciones y etiquetas de la interfaz deben depender de los datos disponibles, sin inventar historiales, popularidad, reseñas ni actualizaciones recientes.

La propuesta visual es una decisión para este proyecto: superficies claras y neutras, grafito para texto y controles, y verde profundo reservado al ahorro que puede sustentarse. El uso de color para comunicar un veredicto siempre debe acompañarse de texto. La expresión editorial se concentra en pocos títulos; controles, modelos y precios conservan un lenguaje sobrio y legible.

## Método y alcance

Se consultaron cuatro catálogos de referencia —Awwwards, Curated, Landbook y Godly—, comercios y comparadores directamente relacionados con el problema, y documentación de Baymard, Nielsen Norman Group y Apple. Se verificaron las páginas mediante navegación web. Apple Shop, Teenage Engineering Store, Curated y la ficha de SIHA en Landbook también se inspeccionaron visualmente en un navegador.

La lectura de una ficha de un catálogo confirma lo que esa ficha documenta; no equivale a probar todas las interacciones del sitio mostrado. Tampoco se midieron conversiones, rendimiento, tipografías exactas, duraciones de animación ni accesibilidad completa de los referentes.

## Doce referencias seleccionadas

| Referencia y acceso | Observación verificable | Traducción recomendada a BlackFridaySV | Qué se descarta o limita |
| --- | --- | --- | --- |
| [Apple — Shop iPhone](https://www.apple.com/shop/buy-iphone). Página leída e inspeccionada visualmente. | Título con gran jerarquía, navegación por secciones, productos protagonistas y contenido de ayuda separado del catálogo. | Una cabecera breve con personalidad; áreas de imagen consistentes; separación clara entre explorar productos y consultar explicaciones. | No reproducir el gran espacio vertical inicial ni los carruseles extensos: un comparador debe dar acceso rápido a muchas ofertas. |
| [Teenage Engineering — Store](https://teenage.engineering/store). Página leída e inspeccionada visualmente. | Fotografías aisladas sobre superficies neutras, márgenes regulares, categorías compactas y recuento de productos. | Tratar las imágenes como material principal del catálogo, con un área estable, proporción contenida y aire alrededor. Mostrar el recuento junto a las herramientas de exploración. | Su catálogo no presenta inicialmente todos los precios. En BlackFridaySV el precio debe estar visible desde la tarjeta. Su navegación ilustrada tampoco es necesaria para este producto. |
| [idealo — FAQ](https://www.idealo.co.uk/magazine/faqs). Contenido leído; portada no confirmada visualmente. | Explica comparación entre comercios, historia del precio, alertas y salida a la tienda para completar la compra. Vincula la historia con la decisión de comprar ahora o esperar. | El detalle debe conectar precio, referencia histórica y tienda. Usar una acción explícita como «Ver en Siman» y explicar el alcance de la comparación. | Las alertas requieren un servicio real; no presentar una función futura como disponible. No atribuir a idealo una estética que no se inspeccionó. |
| [PriceSpy — Price history](https://pricespy.co.uk/information/price-history). Contenido leído; actualizado el 12 de junio de 2026 según la página. | Explica qué representa su historial y cómo ayuda a reconocer variaciones previas a campañas. Indica que la serie tiene un alcance definido y ciertas exclusiones. | Mostrar rango temporal, mínimo observado y fecha. Separar el precio anterior declarado por la tienda de una referencia calculada con observaciones propias. | No trasladar sus conclusiones a nuestro dataset sin revisar cobertura, variantes y cantidad de observaciones. No llamar «mínimo histórico» a un mínimo de pocos días sin aclararlo. |
| [Back Market](https://www.backmarket.com/en-us). Contenido leído; inspección visual bloqueada. | El contenido vincula los productos a una promesa de calidad y distingue el precio reacondicionado de una referencia identificada como producto nuevo. | Nombrar la base de comparación junto al importe. Explicar qué significa la verificación de BlackFridaySV y qué parte depende de información del comercio. | No copiar promesas, garantías ni políticas de Back Market. La comprobación de seguridad impidió revisar su diseño visual actual en el navegador. |
| [Vaara en Awwwards](https://www.awwwards.com/sites/vaara). Ficha leída. | La ficha incluye ejemplos de listado y filtros, cambio de color del producto y feedback al añadir a la bolsa. Documenta una paleta marrón y blanco cálido. | Usar consistencia cromática y feedback discreto al cambiar una selección o guardar un producto. La animación acompaña una acción reconocible. | No se midieron sus animaciones. La presencia en Awwwards no demuestra mejor conversión o usabilidad. No trasladar el flujo de compra de una marca de moda a un comparador. |
| [Curated](https://curated.design/). Página leída e inspeccionada visualmente. | Su interfaz actual combina una búsqueda protagonista, categorías, refinamiento adicional y un contraste entre titular serif y controles sans. | Separar la voz de marca de la operación del catálogo: un titular expresivo y filtros previsibles, con búsqueda siempre fácil de encontrar. | No copiar su paleta oscura ni introducir una búsqueda conversacional sin un motor que la soporte. La estética observada no obliga a usar la misma combinación tipográfica. |
| [Heist en Landbook](https://land-book.com/websites/101139-specialty-decaf-and-1-4-caf-coffee-without-a-curfew-heist). Ficha leída. | La ficha clasifica la propuesta con tipografía grande, serif, presentación de producto y parallax. Landbook permite explorar por industria, estilo y tipografía. | Referencia para contraste tipográfico y una identidad reconocible en pocos momentos del recorrido. | El parallax y las composiciones de campaña no aportan una ventaja demostrada para comparar precios. No introducirlos en el listado. La ficha no fue una prueba de su tienda completa. |
| [Recent — destino actual de Godly](https://recent.design/?ref=godly). Página leída; redirección verificada desde godly.website. | Agrupa referencias de interfaces, marca, movimiento e ilustración. | Usarlo como contraste creativo para detalles y personalidad, subordinado a las necesidades de compra. | No presentar las piezas del catálogo como patrones de UX validados. No se auditó cada ejemplo ni se copiaron recursos. |
| [Baymard — Ecommerce Filter UI](https://baymard.com/blog/ecommerce-filter-ui). Artículo leído; publicado el 17 de abril de 2026. | Describe búsqueda, filtros y orden como funciones distintas; recomienda multiselección, recuentos, filtros activos visibles y soluciones adaptadas a móvil. | Tienda, categoría, presupuesto y tipo de oferta con nombres claros. En escritorio, filtros fáciles de consultar; en móvil, panel utilizable y selección visible junto a resultados. | No añadir filtros que los datos no puedan cumplir. Los resultados de investigación externos no son una medición de BlackFridaySV. |
| [Nielsen Norman Group — Helpful Filter Categories and Values](https://www.nngroup.com/articles/filter-categories-values/). Artículo leído; publicado el 15 de julio de 2018. | Recomienda criterios apropiados, previsibles, sin jerga y ordenados por relevancia para el usuario. | Priorizar términos como «Precio», «Tienda» y «Categoría». Explicar los veredictos y adaptar filtros específicos sólo donde exista información fiable. | Evitar que términos del sistema interno, modelos de datos o clasificaciones sin explicación se conviertan en navegación. No imponer todos los filtros posibles desde el inicio. |
| [Apple — Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion). Documentación leída. | Recomienda movimiento con propósito, feedback breve, posibilidad de reducirlo y ausencia de esperas innecesarias en acciones frecuentes. | Transiciones discretas de paneles y feedback de acciones; contenido utilizable sin esperar a una animación; respetar la preferencia de movimiento reducido. | No añadir movimiento continuo a precios, gráficos o distintivos. Los efectos de materiales de plataformas nativas no son un requisito para una web premium. |

## Fuentes adicionales y límites de acceso

- [Baymard — Product List UX Best Practices](https://baymard.com/research-articles/current-state-product-list-and-filtering), actualizado el 9 de septiembre de 2025: complementa las decisiones de selección múltiple, filtros aplicados y ordenación. Las recomendaciones generales deben adaptarse a la información de este catálogo.
- [Baymard — Displaying Price Discounts](https://baymard.com/research-articles/product-page-price-discounts): referencia sobre claridad al presentar importes y descuentos. Se consultó el resultado y su descripción pública; no se accedió a contenido restringido.
- [WebKit — Responsive Design for Motion](https://webkit.org/blog/7551/responsive-design-for-motion/): documentación técnica sobre `prefers-reduced-motion` y alternativas para efectos que pueden provocar incomodidad.
- [SIHA en Landbook](https://land-book.com/websites/101142-siha): ficha inspeccionada visualmente. Permitió contrastar una dirección fotográfica cuidada y presentaciones de escritorio y móvil. Su hero de marca no se recomienda como estructura para encontrar ofertas rápidamente.
- [Keepa](https://keepa.com/): el contenido accesible confirma historia de precios y alertas como funciones principales. No se verificó visualmente su aplicación ni su detalle de producto, por lo que no se usa como referencia de estilo.
- [PriceRunner](https://www.pricerunner.com/): el acceso devolvió una comprobación que requiere JavaScript. No se investigó más allá del bloqueo ni se atribuyen características visuales a su versión actual.
- La inspección de [Back Market](https://www.backmarket.com/en-us) en el navegador se detuvo ante su página de comprobación de seguridad. El contenido mencionado arriba provino de la página accesible con la herramienta web.
- La portada de idealo no produjo una vista visual verificable durante la inspección. Las conclusiones sobre sus funciones se apoyan en su documentación pública, no en esa captura.
- Algunas aperturas adicionales de Awwwards finalizaron por tiempo de espera. La ficha de Vaara y los elementos citados sí se pudieron recuperar mediante navegación y búsqueda.

## Convergencias observadas

Esta selección no es una muestra estadística del mercado. En ella se repiten algunas decisiones útiles: la fotografía soporta la jerarquía, los fondos dejan respirar al producto, la tipografía expresiva aparece en zonas limitadas y las herramientas de exploración se mantienen reconocibles. En los comparadores, el valor está en vincular los importes con referencias comprensibles y acciones concretas.

La conclusión para BlackFridaySV es específica: invertir en legibilidad, continuidad entre tarjeta y detalle, consistencia de imágenes y calidad de respuesta. Ningún referente justifica añadir efectos por sí solos, ni permite prometer que una estética aumentará las conversiones sin medirla.

## Aplicación al sistema de diseño propuesto

### Jerarquía y contenido

El primer pantallazo debe explicar la utilidad y ofrecer búsqueda o acceso al catálogo. La descripción de metodología completa puede abrirse desde una ayuda visible, sin anteponerse a todas las ofertas.

Cada tarjeta necesita un orden estable: imagen, tienda y modelo, precio actual, señal principal sobre la oferta, referencia identificada y acción. Los nombres largos deben conservar información suficiente para distinguir modelos. El precio y el veredicto no deben desaparecer por una imagen o título de altura variable.

El detalle amplía la evidencia: serie observada, fechas, mínimo en el periodo, precio anterior declarado por el comercio, comparación del mismo modelo y última observación. Si falta historial, la interfaz debe decirlo. Una línea dibujada con datos de ejemplo no puede representar evidencia real.

### Exploración del catálogo

La búsqueda debe localizar productos por las palabras y modelos disponibles. Los filtros modifican el conjunto; el orden cambia la prioridad dentro de ese conjunto. Esas acciones deben conservar una relación clara en la interfaz.

Las selecciones activas han de ser reconocibles y removibles sin abrir de nuevo todo el panel. Los recuentos deben corresponder al estado del conjunto mostrado. Un estado vacío necesita una salida útil, como limpiar el filtro que restringe demasiado la búsqueda.

En móvil, la adaptación prioriza objetivos táctiles de al menos 44 px, controles con etiquetas y una forma clara de volver a los resultados. La evidencia extensa pertenece al detalle; la tarjeta conserva lo necesario para decidir qué producto explorar.

### Precios y confianza

El importe actual lleva la mayor jerarquía. Los importes de referencia se nombran según su origen. «Precio anterior de la tienda» y «Mínimo observado» describen cosas diferentes y no deben mezclarse bajo un único «antes».

El ahorro sólo se presenta cuando puede calcularse con una base válida. No añadir reseñas, existencias, popularidad, urgencia, disponibilidad de alertas ni etiquetas de actualización que no estén respaldadas por el sistema. Una señal de precaución necesita texto, no sólo color.

### Movimiento

El movimiento recomendado responde a una acción: abrir un detalle, cambiar el estado de un favorito o desplegar filtros. Como punto de partida de diseño —no como valores prescritos por una fuente— pueden usarse 140–180 ms para feedback sencillo y 200–240 ms para transiciones de paneles.

Las acciones frecuentes deben responder inmediatamente. El movimiento reducido conserva cambios de estado comprensibles, elimina desplazamientos innecesarios y no oculta contenido. No se propone una dependencia adicional de animación para resolver transiciones sencillas.

## Validación pendiente del rediseño

La investigación de referencias no sustituye la verificación del producto implementado. Hay que comprobar al menos que una persona pueda buscar un modelo, limitar su presupuesto, entender el veredicto, consultar el periodo del historial y salir a la tienda correcta.

También deben revisarse teclado y foco, contraste, zoom, nombres largos, ausencia de imágenes, resultados vacíos, pantallas pequeñas y la honestidad de cada etiqueta cuando los datos estén incompletos. Estas son tareas de validación del rediseño; este documento no afirma que ya se hayan superado.
