# Spec R-042 — La barra de progreso sigue al encabezado y el menú «Aa» toma el tema de lectura

> Estado: aplicado (16-oct-2026). Verificado: `npx tsc --noEmit`, `npx tsc --noEmit -p frontend`, `npm run lint` y el build del frontend en verde; el menú ya no usa `Surface` ni tokens de la app. En el celular queda para V19.
> Capa: FRONTEND. `frontend/src/components/ui/Header.tsx`,
> `frontend/src/components/reader/ReadingProgressRail.tsx`,
> `frontend/src/components/reader/ReadingSettings.tsx`.
> Depende de: R-011, R-013.

> **En una frase:** en el celular, la línea de progreso sube con el encabezado cuando este se
> esconde, y el menú de ajustes de lectura se pinta con los colores del tema elegido (claro,
> sepia u oscuro).

## Motivo

Victor, 16-oct-2026, probando la PWA (R-041) en el iPhone:

- «bajo el navbar deja una línea. Constante por más que escrolle, sigue ahí.»
- «al cambiar de sepia a claro y oscuro […] las letras en ese mismo menú cambian de color según
  el modo que ponga, pero el menú en sí no cambia de color […] las letras […] no se vean.»

Causas:

1. **La línea.** En el lector, `Header` se esconde al bajar (`-translate-y-full`, R-013), pero la
   barra de progreso móvil de `ReadingProgressRail` está fija en `top-16` (64 px, la altura del
   encabezado) y no se mueve. Cuando el encabezado se va, la barra queda flotando a 64 px del
   borde, sobre el texto.
2. **El menú.** El panel usa `Surface`, que se pinta con los tokens de la app (`bg-paper-raised`,
   `text-ink`, que cambian con el modo claro/oscuro de la app), mientras partes del contenido usan
   los colores del tema de lectura. Los dos temas son independientes, así que cualquier
   combinación cruzada (app oscura con lectura clara, o al revés) deja texto sin contraste.

## Decisión

### `Header.tsx`

Exporta `useHideOnScroll` sin cambiar su lógica.

### `ReadingProgressRail.tsx`

La barra móvil usa `useHideOnScroll(true)`: con el encabezado escondido se traslada 64 px hacia
arriba (`-translate-y-16`, queda en `top: 0`); con el encabezado visible vuelve a `top-16`. Misma
transición que el encabezado (`transition-transform duration-states ease-out`,
`motion-reduce:transition-none`).

### `ReadingSettings.tsx`

Todo el panel toma los colores de `READING_THEMES[prefs.theme]` y deja de usar los tokens de la
app para fondo, texto y bordes:

- Panel: fondo `page`, texto `fg`, borde `muted` con transparencia, `rounded-lg`, `shadow-3`.
- Etiquetas de fila: color `muted`.
- Botones − / +: texto `fg`, borde `muted`, fondo transparente.
- Opciones (`Choice`): activa con texto `fg`, fondo `fg` al 8 % y borde `reed`; inactiva con
  texto `muted` y borde `muted`.
- Botones de tema: siguen mostrando su propio color; el borde del inactivo pasa a `muted`.
- Vista previa «Así se verá la página»: fondo `bg` (el fondo real del lector) y borde `muted`.

## Criterios de aceptación

1. En el lector, en móvil, al bajar con el encabezado escondido no queda ninguna línea a 64 px
   del borde; la barra de progreso queda pegada arriba.
2. Con la app en claro u oscuro, y el tema de lectura en claro, sepia u oscuro (las 6
   combinaciones), todo el texto del menú «Aa» se lee.
3. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
