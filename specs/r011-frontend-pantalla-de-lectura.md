# Spec R-011 — La pantalla de lectura: calma, «dónde quedaste» y el junco como progreso

> Estado: aplicado (07-oct-2026) — `npx tsc --noEmit`, `npx tsc --noEmit -p frontend` y `npm run lint` en verde; `ReaderView.tsx` en 449 líneas. Sin verificación en navegador (queda para la mañana).
> Capa: FRONTEND. `frontend/src/components/reader/ReaderView.tsx`,
> `frontend/src/components/reader/ReadingParagraph.tsx`,
> `frontend/src/components/reader/ListenBar.tsx`, `frontend/src/components/reader/AskBubble.tsx`,
> `frontend/src/components/reader/AskField.tsx`, `frontend/src/components/reader/SummaryModal.tsx`,
> `frontend/src/components/reader/QuizModal.tsx`,
> `frontend/src/components/reader/ReadingSettings.tsx` (nuevo),
> `frontend/src/components/reader/ReadingProgressRail.tsx` (nuevo),
> `frontend/src/components/reader/WhereYouLeftOff.tsx` (nuevo).
> Depende de: R-003 (tokens y componentes base), R-001 (`motion`).

> **En una frase:** la pantalla principal de Reed se vuelve una página limpia con alguien al
> lado: al abrir te recuerda dónde quedaste, el progreso es una línea de junco al margen, los
> ajustes de lectura caben en un popover y la barra de escucha se ve como una onda de voz.

## Motivo

El alma de marca define esta pantalla como la principal: «el texto del libro limpio, un botón
para escuchar y un espacio para preguntar. Al abrirla, un resumen corto de dónde quedaste.
Calma y compañía: página sin distracciones». Hoy funciona, pero se ve armada a mano y el
«dónde quedaste» no existe como tal.

## Decisión

### Estructura

- `ReaderView.tsx` (676 líneas) se ordena: la lógica (progreso, sesión, teclado, scroll
  infinito, escucha) se queda; el JSX se reparte en los componentes nuevos de la capa. **No
  cambia** la API de props que usa `App.tsx`.
- Columna de lectura de 60-70 caracteres de ancho, márgenes generosos, sin bordes alrededor del
  texto. Los temas de lectura (`light`, `sepia`, `dark` en `THEMES`) se mantienen.

### `WhereYouLeftOff` (nuevo)

Al abrir un libro con progreso > 0, una tarjeta discreta arriba de la columna: «Quedaste en
<capítulo>» + `chapter.whereYouLeftOffSummary` si existe (sin llamar a la IA) + «Seguir» (lleva
al párrafo guardado) y cerrar. Se cierra sola al empezar a hacer scroll. Libro nuevo: no
aparece.

### `ReadingProgressRail` (nuevo)

El progreso del libro como **línea vertical fina** (el junco) fija en el margen izquierdo en
escritorio (en móvil, horizontal de 2 px bajo el encabezado). Marcas pequeñas en el inicio de
cada capítulo; al pasar el cursor, el título del capítulo. Clic en una marca → ese capítulo.

### `ReadingSettings` (nuevo)

Popover desde un `IconButton` «Aa»: tamaño de letra (`fontScale`), fuente (`serif`/`sans`),
interlineado (`leading`) y tema (`light`/`sepia`/`dark`), con vista previa en vivo. Usa
`prefs`/`setPrefs` de `useAccount()` como hoy. Si ese control ya existe disperso en
`ReaderView`, se muda aquí.

### Párrafos, preguntar y escuchar

- `ReadingParagraph`: el párrafo activo (el que se está leyendo en voz alta o el seleccionado)
  se marca con la línea del junco a la izquierda y un fondo `highlight` muy suave, no con caja.
  Foco de teclado visible.
- `AskBubble` / `AskField`: el espacio para preguntar aparece pegado al párrafo tocado, con la
  pregunta sugerida «¿Qué significa esto?» y el campo libre. Estilo `Surface` de R-003.
- `ListenBar`: barra inferior fija con play/pausa grande, anterior/siguiente párrafo, velocidad
  (0.8× / 1× / 1.25× / 1.5× si el reproductor actual lo permite; si no, sin velocidad), y una
  **onda de voz** de 5 barras (las clases `animate-wave-*` existentes) que solo se mueve cuando
  suena. Mantiene su API.
- `SummaryModal` y `QuizModal`: mismo comportamiento, estilo `Surface` + `Button` de R-003,
  entrada con `motion` (escala 0.98 → 1, fundido), cierre con Escape y foco atrapado dentro del
  modal mientras está abierto.

### Panel de Reed

Envolver el montaje condicional de `<ReedModePanel …/>` en `AnimatePresence` (de `motion/react`)
para que corra su animación de salida (la define R-008 en el mismo paso). No tocar
`ReedModePanel.tsx` ni `ReedBubble.tsx`: son de R-008.

## Criterios de aceptación

1. Abrir un libro con progreso muestra «Quedaste en …»; uno sin progreso, no.
2. El riel de progreso refleja el porcentaje y permite saltar de capítulo.
3. Los ajustes de lectura cambian la columna en vivo y persisten (siguen usando `setPrefs`).
4. `SummaryModal` y `QuizModal` se cierran con Escape y no pierden el foco fuera del modal.
5. `ReaderView.tsx` queda por debajo de 450 líneas.
6. `npx tsc --noEmit -p frontend && npm run lint` verde.

## Fuera de alcance

- El contenido de los modos de Reed (R-009) y la conversación por voz (R-015).
- Encabezado global de la app (R-013).

## Bugs encontrados al aplicar (07-oct-2026)

- **«La lógica se queda» y «< 450 líneas» no caben juntos.** Solo la lógica de `ReaderView`
  (progreso, sesión, teclado, scroll infinito, escucha) ocupaba ~410 líneas antes de cualquier
  JSX. Para cumplir el criterio 5 sin crear archivos fuera de la capa se movieron dos piezas
  autocontenidas: el motor de voz por párrafo (ElevenLabs con precarga → voz del navegador) como
  `useParagraphVoice()` en `ListenBar.tsx`, y el auto-ocultado de los controles como
  `useIdleChrome()` en `ReadingSettings.tsx`. La orquestación de la escucha (qué párrafo, avance
  de página, play/pausa, velocidad) sigue en `ReaderView`. También se quitaron dos refs muertas
  (`skipSpeechReset`, nunca puesta en `true`, y `playingRef`, nunca leída).
- **«Progreso > 0» se interpretó como «abre más allá de la primera página».** Abrir un libro
  guarda la página 1 al instante (`onProgress` en el montaje), así que con `progress > 0` todo
  libro abierto una vez mostraría «Quedaste en Capítulo 1» encima del capítulo 1.
- **El índice del libro («Contenido») se mudó a `ReadingProgressRail.tsx` como `ChapterDrawer`**,
  junto al riel: ambos saltan de capítulo. Y la página del scroll infinito quedó como
  `ReadingPage` en `ReadingParagraph.tsx`.

