---
name: BlackFridaySV — Catálogo con criterio
description: Sistema editorial de comparación de precios, con catálogo claro y cabecera grafito.
colors:
  accent: "#d4f578"
  accent-hover: "#e0ff91"
  graphite: "#1e261f"
  canvas: "#fafbf7"
  surface: "#f0f2ea"
  paper: "#ffffff"
  ink: "#242922"
  muted: "#61685c"
  line: "#dce0d4"
  on-dark: "#f5f6ed"
  on-dark-muted: "#b7c0b1"
  positive: "#3c5d22"
  positive-bg: "#e9f0dd"
  caution: "#725322"
  caution-bg: "#f5eddd"
  danger: "#a12a21"
  focus: "#56772d"
typography:
  display:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "clamp(3rem, 5.3vw, 4.75rem)"
    fontWeight: 550
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "32px"
    fontWeight: 550
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  guide-headline:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "42px"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  title:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "-0.015em"
  body:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.8
  hero-body:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "12px"
    fontWeight: 500
  price:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "25px"
    fontWeight: 650
    letterSpacing: "-0.035em"
    fontFeature: '"tnum"'
  detail-price:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "34px"
    fontWeight: 600
    letterSpacing: "-0.03em"
    fontFeature: '"tnum"'
rounded:
  badge: "4px"
  compact: "6px"
  control: "8px"
  input: "10px"
  product: "12px"
  panel: "16px"
  circle: "50%"
spacing:
  micro: "4px"
  tight: "8px"
  small: "12px"
  base: "16px"
  comfortable: "20px"
  group: "24px"
  content: "28px"
  section-small: "32px"
  section: "40px"
  section-large: "48px"
  breathing: "64px"
  closing: "72px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.surface}"
  icon-button:
    rounded: "{rounded.control}"
    padding: "10px"
    width: "44px"
  search:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "8px 8px 8px 20px"
  category:
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "14px 16px"
  category-selected:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.on-dark}"
  filter-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "5px"
    padding: "7px 10px"
  product-image:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.product}"
    padding: "28px"
  featured-panel:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  comparison-lowest:
    backgroundColor: "{colors.positive-bg}"
    textColor: "{colors.ink}"
    padding: "12px 16px"
  dialog:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  history-empty:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "20px"
  toast:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.input}"
    padding: "12px 16px"
---

# Design System: BlackFridaySV

## Overview

**Creative North Star: "Catálogo con criterio"**

**Design Read:** catálogo comparador para compradores de El Salvador, con lenguaje editorial, producto protagonista y precios fáciles de contrastar. Diales del sistema extraído: **ENERGY 2 / RHYTHM 2 / MOTION 2**. La energía se concentra en el titular y el lima; el ritmo cambia entre portada, listado y explicación; el movimiento responde a acciones mediante transiciones breves, sin coreografía de scroll.

BlackFridaySV presenta productos y precios con el cuidado de un catálogo editorial. La cabecera grafito concentra la identidad y la búsqueda; el catálogo claro facilita comparar imágenes, modelos e importes durante una sesión de compra. El contraste entre ambas superficies es intencional y no constituye un selector de temas.

La personalidad es cercana, precisa y contenida. El acento lima identifica acciones y selecciones; la comparación se explica con texto y datos. Los productos conservan protagonismo sin convertir cada ficha en un bloque decorativo ni cada precio en una promesa de ahorro.

**Estado de la dirección:** propuesta local implementada y revisable, documentada el 15 de octubre de 2026, hora de El Salvador. Se comunicó la suposición de una dirección editorial con catálogo claro; Danniel todavía no eligió explícitamente entre esa propuesta y la alternativa completamente oscura. La elección posterior de Antislop orienta la calidad de la ejecución y no equivale a aprobar el tema. Este documento actualiza la especificación anterior para describir el código actual, sin atribuir una aprobación inexistente.

**Key Characteristics:**

- Cabecera grafito y catálogo claro, con funciones visuales diferentes.
- Una familia local, DM Sans, y cifras tabulares para comparar precios.
- Imágenes de producto contenidas y superficies planas de tono neutro.
- Navegación, filtros y estados reconocibles, con movimiento breve.
- Contexto de datos visible y referencias anunciadas identificadas como tales.

**The Evidencia antes de énfasis Rule.** La intensidad visual de una oferta no puede sugerir una certeza que los datos no ofrecen.

La fuente de los valores implementados es `src/index.css`; la composición y los estados se verifican en `src/App.tsx` y sus componentes. El frontmatter registra los tokens reutilizables extraídos. `.impeccable/design.json` amplía esta especificación con comportamiento, vistas de componentes y metadatos. El propósito y los límites del dato pertenecen a [PRODUCT.md](PRODUCT.md); la investigación se conserva en [referentes-ux.md](docs/referentes-ux.md).

## Colors

La paleta comparte una ligera temperatura vegetal para unir superficies, texto y controles. Los valores canónicos están en el frontmatter; los nombres siguientes describen sus funciones.

### Primary

- **Lima de acción — `accent`:** botón principal, envío de búsqueda, guardado activo, fragmento del titular y fila destacada de la comparación inicial. Su uso representa acción o prioridad visual; no certifica una rebaja histórica.
- **Lima de respuesta — `accent-hover`:** cambio del botón principal bajo puntero preciso.
- **Grafito vegetal — `graphite`:** cabecera, categoría seleccionada y notificaciones. Da presencia a la marca y mantiene una relación clara entre selección y superficie.

### Secondary

- **Verde de comparación — `positive` / `positive-bg`:** información favorable sustentada por la comparación disponible, enlaces explicativos y fondo de la fila con menor precio mostrado.
- **Ocre de atención — `caution` / `caution-bg`:** aviso de catálogo de demostración o problema de carga e indicación de un precio menor en otra tienda. El estado siempre tiene texto.
- **Verde de foco — `focus`:** contorno de teclado sobre superficies claras. Dentro de la cabecera, el foco usa el acento para distinguirse del fondo oscuro.

### Neutral

- **Lienzo — `canvas`:** fondo de lectura del catálogo, buscador y diálogos.
- **Superficie — `surface`:** zona de imagen, filtro aplicado y mensajes sin historial. Separa áreas sin levantar cada elemento mediante sombras.
- **Papel — `paper`:** botón secundario y franja de acción del detalle.
- **Tinta — `ink`:** títulos, precios y contenido principal; **texto secundario — `muted`** para origen, fechas y explicaciones.
- **División — `line`:** límites entre herramientas, datos y secciones; no es el único indicador del estado activo.
- **Texto sobre grafito — `on-dark` / `on-dark-muted`:** contenido principal y auxiliar de la cabecera.

**The Color con significado Rule.** Una selección o advertencia se reconoce por su etiqueta y estado semántico, además del color.

## Typography

**Display Font:** DM Sans, con fallback sans-serif.

**Body Font:** DM Sans, con fallback sans-serif.

**Label/Mono Font:** DM Sans con números tabulares; no se carga una familia monoespaciada adicional.

**Character:** la misma familia construye la voz editorial y la operación. El peso variable permite un titular amplio de trazo moderado y precios con mayor firmeza sin cambiar de lenguaje. El archivo local `/fonts/dm-sans.ttf` declara pesos de 100 a 1000 y usa `font-display: swap`.

### Hierarchy

- **Display:** titular de portada, peso medio y espaciado estrecho; usa la escala fluida del frontmatter en la composición amplia y ajustes observados por breakpoint.
- **Headline:** título del catálogo. **Guide headline:** explicación editorial inferior, con mayor tamaño y una anchura controlada por su columna.
- **Title:** nombre del producto. Mantiene dos líneas en escritorio y tres en móvil; el nombre completo aparece en el detalle.
- **Body:** texto explicativo de metodología y contenido legal. La portada usa el rol `hero-body`; no todos los párrafos heredan un único tamaño.
- **Label:** controles y acciones compactas. Los metadatos secundarios observados oscilan entre 10 y 13 px; no deben absorber información principal.
- **Price:** importe de la tarjeta, con cifras tabulares. **Detail price:** importe del detalle. La referencia anunciada tiene menor jerarquía y no compite con el importe actual.

**The Cifras comparables Rule.** Todos los precios, recuentos y filas de comparación mantienen cifras tabulares; el símbolo de moneda y el formato provienen del dato formateado, no de imágenes.

## Layout

El ancho general llega a 1320 px y conserva 56 px por lado en escritorio antes de alcanzar ese máximo. La portada usa dos columnas de proporción 1.1:1 y una separación de 80 px; el catálogo reserva 202 px para filtros, una separación de 38 px y el espacio restante para tres columnas de productos. Las tarjetas no llevan caja completa: la imagen está contenida y el texto comparte el lienzo del catálogo.

El ritmo utiliza agrupaciones pequeñas de 8–16 px, separaciones de contenido de 20–32 px y respiración entre secciones de 40–72 px. Se conservan ajustes ópticos observados, como la separación de 22 px entre productos; no se fuerza todo el diseño a múltiplos de ocho cuando eso perjudica la composición.

| Anchura | Comportamiento implementado |
| --- | --- |
| Desde 1600 px | La portada amplía su separación a 100 px y su relleno vertical a 64 px. El contenido mantiene el máximo general. |
| Hasta 1199 px | Márgenes laterales de 32 px, filtros de 180 px, separación del catálogo de 24 px y tarjetas con intervalos de 28 × 16 px. |
| Hasta 1023 px | La navegación de enlaces y el sidebar desaparecen; aparece el botón de filtros con diálogo. La portada aún conserva dos columnas. |
| Hasta 767 px | Márgenes laterales de 20 px, portada en una columna, acceso directo al catálogo y dos columnas de productos. Categorías horizontales desplazables; se oculta el selector de vista. |
| Hasta 379 px | Márgenes laterales de 16 px, separación horizontal de 10 px entre tarjetas y ordenación en una fila completa. |

La imagen de tarjeta tiene proporción 1.2 en escritorio y cuadrada en móvil. `object-fit: contain` conserva el producto completo; el área estable evita saltos cuando llegan las imágenes. El título y la posición del precio mantienen la alineación entre productos con nombres de diferente longitud.

Los controles principales tienen una altura mínima de 44 px. En móvil los filtros aplicados también llegan a esa altura; en escritorio conservan 36 px. El selector de vista de escritorio mide 36 px de ancho y 44 px de alto y se oculta en móvil. Estos son valores observados, no una certificación de cumplimiento universal.

En pantallas inferiores a 380 px, la tira de categorías ajusta sus márgenes y su relleno a 16 px. El cuerpo no impone un ancho mínimo que compita con la barra de desplazamiento del navegador.

**The Catálogo continuo Rule.** Al reducir la pantalla se reorganizan controles y columnas; el precio, la tienda y la apertura del detalle siguen accesibles sin depender del hover.

## Elevation & Depth

Las superficies de contenido son planas. La profundidad viene de cambios de tono, espacios y divisores finos. Sólo los elementos que se superponen a la página usan sombra: el diálogo y la notificación. La imagen puede crecer ligeramente con un puntero preciso, pero la tarjeta no levita.

### Shadow Vocabulary

- **Diálogo:** `0 24px 72px #00000030`; separa el panel modal del fondo atenuado. Su backdrop es `#111a15b3`.
- **Notificación:** `0 8px 24px #1e261f22`; hace reconocible un mensaje transitorio sobre el catálogo.

**The Superficies planas Rule.** Las sombras identifican superposición, no sirven para añadir peso a todas las fichas.

## Shapes

Los radios crecen con el tamaño y la función del objeto: insignias pequeñas, controles de ocho píxeles, campos y categorías de diez, imágenes de doce y paneles amplios de dieciséis. El favorito es circular por ser una acción superpuesta compacta. No hay una silueta de cápsula aplicada a todos los controles.

Los divisores son de un píxel. La categoría seleccionada cambia también de fondo y texto, mientras el filtro aplicado conserva una superficie suave y un cierre reconocible. En móvil, imágenes y diálogos reducen sus radios para mantener proporción con el espacio disponible.

## Components

### Buttons

Acciones compactas, firmes y reconocibles. El primario combina lima y grafito; el secundario utiliza papel, tinta y borde de división. Comparten relleno del frontmatter, peso 600 y altura mínima de 44 px. El botón textual mantiene subrayado para indicar una acción auxiliar.

El hover de color dura 160 ms y sólo se aplica con `hover: hover` y `pointer: fine`. La presión reduce primarios e iconos a escala 0.97. El foco visible tiene contorno de 2 px y separación de 4 px; los estados deshabilitados reducen opacidad a 0.4 y conservan el atributo nativo.

### Inputs / Fields

El buscador claro contrasta con la portada oscura y reúne icono, texto y envío. Su contenedor muestra el foco mediante `focus-within`; el campo tiene nombre accesible. En móvil el texto del input llega a 16 px. Las teclas `/` y `Cmd/Ctrl+K` enfocan la búsqueda cuando no hay un diálogo abierto ni otro campo en edición.

Tiendas usa checkboxes con selección múltiple; presupuesto usa radios, porque las franjas son excluyentes. Ordenación y tamaño de página utilizan `select` nativo. La búsqueda tiene estado vacío y los filtros permiten limpiar selecciones.

### Navigation

El wordmark combina el nombre BlackFridaySV y un radar lineal. La navegación principal presenta catálogo, explicación y guardados; el contador es tabular. Bajo 1024 px se retiran los enlaces de navegación, mientras guardados conserva un nombre accesible aunque en móvil se oculte su texto visual.

Las seis categorías tienen icono y texto. La selección se comunica con `aria-pressed` y fondo grafito. En móvil forman una tira desplazable con ajuste de scroll próximo. Las opciones del conjunto de resultados también son botones de selección; no se les atribuye un comportamiento de tabs de teclado que el código no implementa.

### Chips

Los filtros aplicados muestran búsqueda, categoría, tienda, presupuesto o disponibilidad y ofrecen eliminación individual. Pueden envolver a varias filas. La selección se modifica directamente; no requiere volver a abrir el panel. El botón de limpiar tiene una jerarquía menor y texto subrayado.

### Cards / Containers

La ficha separa fotografía y datos sin envolver ambos en un panel con sombra. La imagen abre el detalle; el favorito es una acción independiente con `aria-pressed`. El nombre también permite abrir el producto y la acción inferior repite el destino de forma explícita.

La tarjeta presenta tienda, nombre, precio actual, referencia anunciada cuando existe y contexto de comparación. El distintivo de descuento dice «anunciado». La foto se carga de forma diferida y, si falla, se reemplaza por «Imagen no disponible» dentro de la misma zona. La vista de lista cambia a imagen lateral de 150 px en escritorio y 110 px en móvil si ese estado ya estaba seleccionado.

### Comparación destacada y detalle

La portada puede mostrar un modelo con ofertas comparables existentes. El fondo lima destaca la primera fila de esa comparación; el detalle usa verde suave para su menor precio. Son prioridades relativas al conjunto disponible, no afirmaciones de mínimo nacional o histórico.

El detalle identifica la referencia como anunciada por la tienda, ofrece filas por comercio y conserva el precio y el enlace de salida en una franja inferior separada. Guardar, copiar enlace y compartir son acciones secundarias. Los datos de demostración y los productos agotados no reciben una salida de compra presentada como oferta vigente.

El historial necesita al menos dos observaciones válidas con fechas distintas. Si faltan, se muestra «Historial aún no disponible». Cuando hay serie, la línea está acompañada de fechas y una tabla accesible desplegable de registros; no hay una gráfica ficticia para decorar.

### Dialogs

La suscripción reutiliza el diálogo nativo con un máximo de 580 px y un formulario en columna. Campos de 16 px y altura mínima de 48 px; etiquetas de selección con área mínima de 44 px. Categorías en dos columnas, una bajo 600 px. El consentimiento comienza desmarcado. Carga, servicio no disponible, error y solicitud pendiente de confirmación tienen mensajes propios. Los errores usan `danger`, siempre acompañados de texto; la ausencia de configuración usa `caution`. La opción de resumen general se mantiene separada del seguimiento de un producto.

Los detalles, filtros y contenido legal se abren sobre un `dialog` nativo con `showModal()`. El panel tiene anchura máxima de 780 px; el panel de filtros limita a 440 px. La altura útil es el viewport dinámico menos 48 px en escritorio y 24 px en móvil; el cuerpo hace scroll y las franjas de acción permanecen fuera de él.

Escape, el botón de cierre y una pulsación iniciada y terminada en el fondo cierran el diálogo. Se bloquea el scroll del documento y al cerrar se restaura el foco previo o un destino útil del catálogo. El panel entra durante 200 ms con 8 px de desplazamiento y escala 0.98; la curva común es `cubic-bezier(0.16, 1, 0.3, 1)`.

### Estados y feedback

La carga usa esqueletos con proporción de imagen estable y pulso de opacidad de 1.5 s. No hay un contador o una barra de progreso inventados. Sin resultados, el contenido explica cómo recuperar productos; sin guardados, invita a guardar. La contingencia se identifica como demostración y los errores ofrecen una nueva carga.

Los recuentos se anuncian con `aria-live="polite"`. Las notificaciones también usan un estado anunciado y duran 3200 ms. Sobre el catálogo pueden cerrarse. Dentro del detalle se muestran en una franja del propio diálogo, sobre la acción de compra, para que el fondo modal no las oculte ni las excluya del árbol accesible activo. Si el navegador impide persistir favoritos, el mensaje distingue guardado en la sesión de persistencia local.

Las transiciones ordinarias duran 160 ms; el indicador de preguntas usa 180 ms; imágenes, 220 ms; diálogos y desplazamiento de notificación, 200 ms. Con movimiento reducido se elimina la animación, las transiciones pasan a 0.01 ms y el scroll deja de ser suave. El enlace inicial «Saltar al contenido principal» aparece al recibir foco.

## Do's and Don'ts

### Do:

- **Do** conservar el precio actual como dato principal y nombrar la referencia anunciada.
- **Do** usar DM Sans local y cifras tabulares para precios y recuentos.
- **Do** mantener imágenes contenidas, títulos legibles y estados de error dentro de la misma estructura.
- **Do** expresar selección y avisos con texto, semántica y color.
- **Do** conservar teclado, foco, Escape, retorno al disparador y movimiento reducido al ampliar componentes.
- **Do** documentar como propuesta revisable cualquier decisión visual pendiente de elección explícita.

### Don't:

- **Don't** convertir el acento lima o un precio tachado en una certificación de ahorro histórico.
- **Don't** dibujar historia sin observaciones fechadas ni presentar una captura como precio en vivo.
- **Don't** añadir sombras, gradientes, animación continua o insignias sin función a cada ficha.
- **Don't** ocultar una acción esencial detrás del hover, un gesto obligatorio o un icono sin nombre accesible.
- **Don't** sustituir datos ausentes por reseñas, disponibilidad, rankings o cifras de ahorro inventadas.
- **Don't** describir el tema editorial claro como aprobado por el usuario mientras esa elección siga pendiente.
