# Spec R-028 — Sesión de escucha planificada: «¿cuánto tiempo tienes hoy?»

> Estado: diseñado (10-oct-2026).
> Capa: FRONTEND. `frontend/src/components/reader/SessionPlanner.tsx` (nuevo),
> `frontend/src/components/reader/ReaderView.tsx`, `frontend/src/components/reader/ListenBar.tsx`
> (solo la barra, no `useParagraphVoice`), `frontend/src/components/reed/modes/ReaderMode.tsx`.
> Depende de: R-025 (dos voces), R-027 (motor con voz y caché).

> **En una frase:** antes de que suene nada, el lector elige entre tres duraciones (5, 15 o
> 30 minutos) y una de las dos voces; Reed le muestra hasta dónde llegará y genera audio solo
> dentro de ese tramo, párrafo a párrafo.

## Motivo

Victor, 10-oct-2026: «que el modo lector sea con planificación, por ejemplo propuestas de cuánto
tiempo tienes para escuchar el libro, 3 opciones, y cuando la marques que genere el audio».
Eligió que las opciones planifiquen **la sesión de hoy**, no el libro completo.

Dos razones:

- **Gasto con permiso.** Hoy Play arranca a leer y sigue hasta el final del libro, adelantando
  siempre un párrafo. Con la sesión, el lector decide cuánto audio se genera antes de generarlo.
- **Encaja con la marca.** Reed no apura ni culpa: «tengo 15 minutos» es una meta pequeña y
  alcanzable, y al terminar Reed lo celebra en vez de seguir solo.

**Por qué no se genera todo el tramo al elegir la opción:** si el lector elige 30 minutos y para
en el minuto 3, ya se habrían pagado los 30 (~11 700 créditos, casi el 9 % del mes). Por eso la
opción fija hasta dónde llega la sesión, y el audio se genera párrafo a párrafo dentro de ese
tramo.

## Decisión

### Cuándo aparece el planificador

Abre `SessionPlanner` (y **no** suena nada) cuando no hay sesión activa y el lector:
- aprieta Play en la barra de escucha,
- elige «Escuchar desde aquí» en un párrafo,
- abre un libro con «Escuchar» (`autoListen`).

Con una sesión activa, Play/Pausa solo pausa y reanuda, sin volver a preguntar.

### `SessionPlanner`

Hoja inferior en móvil y diálogo centrado en escritorio, con el estilo de los diálogos existentes.

- Título «¿Cuánto tiempo tienes hoy?»; subtítulo «Te leo desde «<capítulo>», párrafo N».
- **Tres opciones: 5, 15 y 30 minutos.** Cada una dice hasta dónde llega: «Llegas a «<capítulo>»,
  párrafo N», o «Terminas el capítulo» / «Terminas el libro» si cae justo ahí.
- Si lo que queda del libro dura menos que una opción, esa y las mayores se juntan en una sola:
  «Hasta el final (~N min)».
- **Voz:** dos opciones, «Antonio · suave y pausado» y «Mauricio · más estándar»
  (`READER_VOICES`, R-027). Recuerda la última elegida. Sin muestra de audio, porque cada
  muestra cuesta créditos. Se oculta sin sesión iniciada, cuando suena la voz del navegador.
- Botón «Empezar». Cerrar o Escape cancela sin generar nada.
- **Cupo del día:** si `getUsage()` (`services/billing.ts`) informa lo que queda de
  `tts_chars`, las opciones que no caben se muestran deshabilitadas con «Hoy te quedan ~N min de
  voz». Si la consulta falla, no se deshabilita nada.

### Cálculo del tramo

- `CHARS_PER_MINUTE = 890` a velocidad 1×. Se midió el 10-oct-2026 con Antonio: 1 108
  caracteres = 1,24 min.
- Duración de un párrafo = `caracteres / (890 × velocidad)` minutos.
- Tramo = párrafos consecutivos desde el inicio, mientras la suma no pase la duración elegida.
  Siempre al menos 1 párrafo. Cruza capítulos y páginas.
- Cambiar la velocidad durante la sesión no cambia el tramo (son los mismos párrafos); solo
  cambia el tiempo que falta.

### Reproducción dentro de la sesión

- `voice.speak(..., { voice, following })`: pasa `following` **solo si el párrafo siguiente
  está dentro del tramo**. Al último párrafo no se le adelanta nada.
- Anterior/siguiente párrafo se mueven dentro del tramo, sin salirse.
- Al terminar el tramo, la lectura para (no sigue sola) y la barra muestra «Sesión lista:
  escuchaste N min» con «Otra sesión», que abre el planificador desde el párrafo siguiente.
- Cerrar la barra, salir del libro o cambiar de libro termina la sesión.

### Barra de escucha y modo Lector

- `ListenBar` muestra el tiempo como `mm:ss / mm:ss` (llevado / total de la sesión) y el nombre
  de la voz.
- `ReaderMode`: con sesión, «Sesión de hoy: 15 min con Antonio · hasta «<capítulo>», párrafo
  N». Sin sesión: «Elige cuánto tiempo tienes y te leo ese tramo, a tu ritmo.» Se quita el texto
  de «He sincronizado el texto con la voz…».

## Criterios de aceptación

1. Apretar Play sin sesión abre el planificador, y en la pestaña Red no hay ningún
   `POST /api/tts` hasta apretar «Empezar».
2. Con 5 minutos elegidos, la lectura para sola al final del tramo y no queda generado ningún
   párrafo de después.
3. Pausar a mitad del tramo deja generado como máximo el párrafo siguiente.
4. Un libro con 3 minutos restantes muestra una sola opción, «Hasta el final (~3 min)».
5. La voz elegida se recuerda al abrir otra sesión.
6. `npx tsc --noEmit -p frontend && npm run lint` verde.
