# Spec R-024 — El hero de la landing con Reed de cuerpo completo y sin la línea del junco

> Estado: diseño (07-oct-2026).
> Capa: FRONTEND. `src/components/marketing/Hero.tsx`, `public/reed/full-body/companion.webp`
> (nuevo).
> Modifica: R-012 (punto 2, el hero). Sigue la línea de R-023.

> **En una frase:** el personaje grande de la portada pasa a ser Reed compañero de cuerpo
> completo, y desaparece el tallo verde dibujado detrás de él.

## Motivo

Victor, 07-oct-2026, mirando la landing en local: «este reed debería ser uno de los que son
cuerpo completo, y ves que también está la línea, ¿puedes sacarla?».

- El hero usa el retrato de busto (`/reed/companion.webp`, cabeza y cuello), el mismo de los
  íconos del menú. Existe un set de cuerpo completo hecho para la marca el 26-sep-2026
  (`~/Documents/Codex/2026-09-26/da/outputs/reed-brand/full-body/`, fuera del repo), con fondo
  transparente: en el lugar más grande de la página tiene sentido el personaje entero.
- R-012 pidió «la línea del junco detrás» del personaje: un `<svg>` con un trazo vertical
  verde. Igual que la línea de la transición (R-023), se lee como un error de dibujo y no como
  la metáfora.

## Decisión

- Asset nuevo `public/reed/full-body/companion.webp`, desde
  `reed-school-companion-master.png`: trim del margen transparente, 880 px de alto (≈ 2× del
  alto máximo del hero, 26 rem), `cwebp -q 85 -alpha_q 100`. Pesa 82,8 KB. Carpeta propia para
  no confundirlo con los bustos de `public/reed/`, que siguen usando la app, la sección de
  modos, el blog y las páginas de error.
- `Hero.tsx`: la `<Image>` apunta al asset nuevo, con su ancho y alto reales y un `alt` que
  describe a Reed de cuerpo completo saludando. Se mantienen la sombra de contacto, el
  `drop-shadow`, `preload` y el contenedor.
- Se borra el `<svg>` del tallo y su comentario.
- Solo el hero. La sección de modos, la app y la bienvenida siguen con los bustos: cambiarlos
  sería otro spec (otras proporciones, otros tamaños de contenedor).

## Criterios de aceptación

1. La portada muestra a Reed compañero de cuerpo completo, entero (sin cortar pies ni hojas), en
   móvil (375 px) y escritorio.
2. No queda ninguna línea vertical detrás del personaje (`grep -n "<svg" Hero.tsx` vacío).
3. `npx tsc --noEmit && npm run lint` verde.
