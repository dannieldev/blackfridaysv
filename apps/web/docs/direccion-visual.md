# Dirección visual implementada

Fecha: **15 de octubre de 2026**, hora de El Salvador.

## Estado de la propuesta

La implementación local adopta una dirección editorial de **cabecera grafito y catálogo claro**, con lima para acciones y selecciones. Se comunicó esta suposición para avanzar con una propuesta concreta y revisable. Danniel no ha elegido explícitamente entre esta dirección y la alternativa totalmente oscura; no debe registrarse como una aprobación de tema. Su elección posterior de Antislop orienta la ejecución y la revisión de calidad.

El sistema extraído del código queda documentado en [DESIGN.md](../DESIGN.md). Sus tokens son normativos para mantener coherencia con la implementación actual; pueden revisarse cuando el usuario elija otra dirección. El archivo [.impeccable/design.json](../.impeccable/design.json) complementa esos tokens con movimiento, responsive, accesibilidad, procedencia y vistas de componentes.

## Identidad: Catálogo con criterio

La marca ayuda a comparar precios de tiendas salvadoreñas con calma y contexto. El grafito concentra la presentación y el buscador; el lienzo claro sostiene sesiones de exploración con muchas fotografías e importes. Esta convivencia es intencional: el sitio no incluye un selector entre dos temas.

El acento lima guía acciones, favoritos y una comparación destacada. El verde profundo aporta contexto comparativo y el ocre señala atención. Ninguno de estos colores acredita por sí solo una oferta. Cada mensaje expresa su significado mediante texto y estado semántico.

DM Sans local es la única familia. El titular amplio, los nombres de producto y las cifras tabulares pertenecen al mismo lenguaje. No se conserva JetBrains Mono de la especificación anterior porque no forma parte del frontend actual.

La fotografía tiene un espacio constante y contenido completo. El texto vive sobre el lienzo del catálogo, sin convertir toda la ficha en una caja elevada. Los radios son contenidos y la sombra se reserva para diálogos y notificaciones.

## Recorrido aplicado

1. **Navegación y portada:** identidad, beneficio, buscador y guardados. La portada puede mostrar un modelo realmente comparable; la alternativa vacía no inventa una oferta.
2. **Catálogo:** seis categorías, sidebar de tiendas con selección múltiple, presupuesto excluyente y filtro de stock confirmado. El recuento, la ordenación y los filtros removibles acompañan los resultados.
3. **Ficha:** imagen, tienda, nombre, importe actual, referencia anunciada y contexto disponible. El descuento se etiqueta como anunciado; el favorito es una acción independiente.
4. **Detalle:** modelo identificable, filas de tiendas comparables, origen y fecha, estado de disponibilidad y acciones de guardar, copiar o compartir. El enlace final nombra la tienda.
5. **Historial:** sólo aparece una serie con dos observaciones válidas en fechas distintas. En caso contrario se explica la ausencia de historial. La serie real incluye tabla de registros accesible.
6. **Ayuda:** preguntas propias de la experiencia y metodología, términos y privacidad accesibles desde controles reconocibles.

La ordenación ofrece comparables primero, menor y mayor precio y mayor rebaja anunciada en porcentaje o importe. No se incorporan reseñas, superventas ni popularidad que el catálogo no contiene.

## Responsive, teclado y estados

El sidebar cede a un diálogo de filtros bajo 1024 px. Bajo 768 px, la portada pasa a una columna, el catálogo conserva dos columnas y las categorías se desplazan horizontalmente. Un enlace permite saltar directamente de la portada a las ofertas. El detalle ajusta anchura, márgenes y altura mediante el viewport dinámico.

Los controles principales mantienen 44 px de altura mínima. Los chips llegan a esa medida en móvil; algunos controles de escritorio son más compactos y están registrados en el sistema. Las acciones esenciales no dependen del hover. La selección usa `aria-pressed`; búsqueda, filtros, ordenación y cierre tienen nombres accesibles.

El diálogo nativo limita la interacción al contenido modal, se cierra con Escape y restaura el foco al disparador o a un destino útil del catálogo. El buscador acepta `/` y `Cmd/Ctrl+K` fuera de campos o diálogos. El foco visible y el enlace de salto se mantienen. Los resultados y las notificaciones usan anuncios corteses.

Carga, fotografía ausente, historial ausente, resultados vacíos, guardados vacíos, demostración y error de persistencia tienen una explicación propia. El texto distingue guardar en la sesión de conservar un favorito en el navegador.

El movimiento se limita a feedback de controles, entrada de paneles, apertura de preguntas, imagen bajo puntero preciso y esqueletos durante carga real. `prefers-reduced-motion` elimina animaciones y scroll suave. Las duraciones efectivas están registradas en el sidecar, no inferidas de un referente.

## Referentes y decisiones

La investigación completa, los enlaces consultados y las limitaciones de acceso están en [referentes-ux.md](referentes-ux.md). La aplicación toma patrones concretos:

- **Apple y Teenage Engineering:** imágenes cuidadas, jerarquía y alineación. Aquí el precio permanece visible desde la ficha porque comparar es la tarea principal.
- **Baymard y Nielsen Norman Group:** búsqueda, filtros y orden como herramientas diferenciadas; multiselección donde corresponde; selección visible y etiquetas comprensibles.
- **idealo y PriceSpy:** identificar la base de una comparación y el alcance de la historia de precios.
- **Awwwards, Curated, Landbook y Recent/Godly:** contraste tipográfico, composición y microinteracción como repertorio creativo, sin tratar una selección de galería como prueba de usabilidad.
- **Apple HIG Motion:** feedback breve y con propósito, reducción de movimiento y ausencia de esperas innecesarias.

La exploración previa también consideró paneles de horarios, documentos de viaje, mapas, interfaces de vídeo y Metro. Se conservó su disciplina de alineación y jerarquía; sus metáforas y controles literales no forman parte de la interfaz de compra.

No se adoptaron scroll intervenido, parallax en el catálogo, navegación mediante gestos obligatorios ni animaciones continuas sobre precios. Tampoco se copiaron fotografías, logotipos o fuentes propietarias de los referentes.

## Datos y afirmaciones

El snapshot no demuestra que una referencia anunciada se cobrara antes ni que una diferencia represente ahorro histórico. La línea base estimada no reemplaza observaciones fechadas. El frontend distingue esos conceptos y no presenta la contingencia como una oferta vigente.

Las comparaciones se limitan al conjunto de modelos identificables y tiendas disponibles. «Menor precio mostrado» describe ese conjunto; no significa mínimo nacional. Una captura conserva su fecha y origen; no se denomina precio en vivo.

La investigación y la documentación describen intención y código implementado. No certifican por sí solas contraste, ergonomía, rendimiento o ausencia de defectos: los resultados de las comprobaciones del proyecto deben registrarse por separado.
