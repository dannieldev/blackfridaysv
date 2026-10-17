# 📋 Especificación de Nuevos Features — BlackFridaySV
*(Análisis, transcripción y especificación técnica de las 11 notas de voz de `/Users/ava/Music/AuiBack`)*

---

## 🎙️ 1. Transcripción y Análisis Fuente

A continuación se detalla la transcripción literal y el análisis funcional de cada nota de voz registrada el 16 de octubre de 2026:

### Audio 1: `6.15.04 PM` (Duración: 3m 00s)
* **Texto transcrito**:
  > *"Va, o sea, está bien... es un catálogo que te permite optimizar el tiempo para no andar buscando el artículo en diferentes páginas online de los almacenes. Pero el punto es que si yo quiero optimizar el tiempo y si yo escribo en una sección donde diga 'cuáles son tus preferencias' o lo que andas buscando (ej. 'quiero ropa, zapatos' —bueno, ese es otro feature que se tiene que ver, un apartado de ropa y accesorios porque hay tiendas de eso—, o 'quiero un nuevo teléfono, una nueva pantalla')... entonces que me diga 'ok', selecciono mis preferencias y me haga el filtro...*
  > *Obviamente se puede hacer manual, pero la idea es incorporar la IA, que se perciba que hay alguien que está buscando por ti. No quisiera incorporar de momento usuarios porque para que quede registrado tendríamos que usar cuentas; en todo caso tendría que ser local con `localStorage`... Aún así siento que es como muy lo mismo, pero poder consultar a la IA cómo se puede ver más 'WOW', no solo un simple filtro, sino como una lista de preferencias y que se esté monitoreando activamente... como el siguiente feature."*
* **Requerimientos derivados**:
  1. **Radar Personal / Asistente de Caza-Ofertas (Factor WOW)**: Un módulo interactivo que guíe al usuario a configurar sus intereses (categoría, presupuesto, marcas, tiendas y nivel de exigencia cívica).
  2. **Persistencia local sin fricción**: Todo en `localStorage`, sin registro de correo ni contraseñas.
  3. **Sensación de monitoreo activo**: Una vista dedicada *"🎯 Mi Radar Personal"* que filtra en tiempo real los 586 productos del catálogo y muestra un banner dinámico de resumen: *"Monitoreando 586 ofertas en 5 almacenes: encontramos X que coinciden con tus gustos"*.
  4. **Ampliación de taxonomía a Moda y Accesorios**: Soporte para ropa y calzado en el catálogo.

---

### Audio 2: `6.16.29 PM` (Duración: 1m 18s) & Audio 3: `6.17.21 PM` (Duración: 52s)
* **Texto transcrito**:
  > *"Y otro detalle... aparte de trackear el precio aquí a nivel de El Salvador, también es trackear si de verdad ese precio tiene un beneficio real histórico de los precios globales o regionales... porque hay artículos que solo están en una página y te dicen el descuento, pero no hay con qué comparar porque ningún otro almacén de El Salvador lo vende. Entonces tocaría buscar la región y ver la conversión de moneda para establecer la comparación... no solo quedarnos aquí en el país.*
  > *Porque si te fijas el código funciona para scraping de aquí del país, pero es completamente replicable si alguien de Colombia descarga el código del proyecto y configura sus propios almacenes... un framework replicable en otros países y nosotros comparar precios de la región."*
* **Requerimientos derivados**:
  1. **Benchmark de Precios Regional / Global**: Para productos que son exclusivos de un solo almacén salvadoreño, proporcionar una referencia de precio internacional estimado (USD MSRP / precio regional en tiendas de referencia).
  2. **Framework Abierto y Replicable**: Diseñar y documentar la arquitectura de scrapers y comparativa para que sea exportable a otros países (Colombia, Guatemala, Costa Rica, México).

---

### Audio 4: `6.24.38 PM` (Duración: 1m 39s)
* **Texto transcrito**:
  > *"Mira, te mando este audio para dejarlo aquí y que no se olvide la idea. Formas para monetizarlo: arriba colocar productos estrella (patrocinados) para el próximo año... Y el otro detalle que siempre me llamó la atención es el tema de redirección: cuando la persona le da clic para ir al producto, una redirección donde te tarda 1 o 2 segundos mientras ves el mensaje o publicidad antes de ir a la otra tienda. Solo lo dejo ahí para la fila de ideas."*
* **Requerimientos derivados**:
  1. **Pantalla de Redirección Verificada**: Modal de transición breve (1.2 segundos) que dice: *"Verificando oferta y redirigiendo a [Almacén]... Oferta auditada por BlackFridaySV"*. Brinda seguridad cívica al comprador y deja la infraestructura lista para patrocinios futuros.

---

### Audios 5, 6 y 7: `6.25.06 PM` - `6.25.27 PM`
* **Texto transcrito**:
  > *"No estoy hablando de traer las cosas de otro país, sino comparar precios, solo precios... scrapear precios de otros países y mostrarlos ahí... tiene que ser rápido."*
* **Requerimientos derivados**:
  - Comparativa meramente analítica e informativa de precios internacionales, sin logística de envíos ni casilleros.

---

### Audio 8: `6.30.11 PM` (Duración: 45s)
* **Texto transcrito**:
  > *"De eso me encargaría yo... lo voy a promocionar en mis cuentas personales. Y voy a hacer un bot a ver si funciona... Cuando los almacenes estén promocionando sus ofertas de Black Friday, ir a los comentarios y hacer que comenten 'compara los precios en esta página'."*
* **Requerimientos derivados**:
  - Enlaces cortos y limpios para compartir auditorías en redes sociales (TikTok, Instagram, Twitter/X).

---

### Audios 9, 10 y 11: `6.30.58 PM` - `6.31.22 PM`
* **Texto transcrito**:
  > *"En mi link está mi dominio, es un subdominio. No sé si comprar dominio tipo `blackfridaysv.com` o dejarlo así... vale como $10-12 al año... para que la página solo esté en Black Friday..."*
* **Requerimientos derivados**:
  - Evaluación estratégica de dominio propio (`blackfridaysv.com`) vs. subdominio (`blackfridaysv.dannieldev.com`).

---

## 🛠️ 2. Especificación Técnica de los 5 Módulos

### Módulo 1: "Radar Personal de Caza-Ofertas" (`PersonalRadar.tsx`)
* **Ubicación**: `apps/web/src/components/PersonalRadar.tsx`
* **Estado en `localStorage`**: Clave `bfsv_radar_preferences_v1`.
* **Estructura de Datos**:
  ```ts
  export interface RadarPreferences {
    enabled: boolean;
    categories: string[];
    maxBudget: number | null; // null = sin límite
    minDiscountScore: 'all' | 'verified_only' | 'historic_low_only';
    preferredStores: string[];
    searchTerms: string[];
  }
  ```
* **Comportamiento en UI**:
  - Botón destacado en el Hero: *"🎯 Configurar mi Radar Personal"*.
  - Al estar activo, agrega la pestaña de filtro: *"🎯 Mi Radar (X encontrados)"*.
  - Banner en la parte superior del grid de ofertas con métricas de monitoreo en vivo.

---

### Módulo 2: Benchmark Regional Estimado (`regionalBenchmark.ts`)
* **Ubicación**: `apps/web/src/lib/regionalBenchmark.ts`
* **Lógica**:
  - Aplica únicamente cuando `comparableOffers(deal).length < 2`.
  - Evalúa categoría y marca para calcular el rango de referencia internacional de mercado en USD.
  - Provee etiqueta de contexto para evitar que el usuario compre a ciegas.

---

### Módulo 3: Pantalla de Redirección Auditada (`RedirectTransitionModal.tsx`)
* **Ubicación**: `apps/web/src/components/RedirectTransitionModal.tsx`
* **Lógica**:
  - Al presionar *"Ir a la tienda"* o *"Ver en [Tienda]"*, abre un diálogo modal con:
    - Logotipo del comercio.
    - Sello de auditoría de BlackFridaySV.
    - Cuenta regresiva de 1.2 segundos con barra de progreso.
    - Botón de escape inmediato (*"Continuar ahora"*) y casilla *"No volver a mostrar en esta sesión"*.

---

### Módulo 4: Taxonomía de Moda y Calzado
* **Ubicación**: `apps/web/src/lib/deals.ts`
* **Lógica**:
  - Agregar categoría `moda_calzado` ("Moda, Calzado y Accesorios") al selector de categorías y filtros.

---

### Módulo 5: Framework Replicable y Guía de Despliegue
* **Ubicación**: `docs/FRAMEWORK-REPLICABLE.md`
* **Lógica**:
  - Guía completa de arquitectura de scrapers en monorepo npm workspaces para exportar a cualquier país de América Latina.
