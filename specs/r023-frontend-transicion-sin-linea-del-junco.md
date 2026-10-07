# Spec R-023 — La transición entre modos sin la línea del junco

> Estado: diseño (07-oct-2026).
> Capa: FRONTEND. `frontend/src/components/reed/ReedCharacter.tsx`,
> `src/components/marketing/ModesShowcase.tsx`.
> Modifica: R-008 (paso 2 de la transición) y su réplica en R-012. R-008 sigue vigente en todo lo
> demás.

> **En una frase:** al cambiar de modo, el personaje sale inclinándose y el nuevo entra
> enderezándose, pero ya no aparece la línea vertical de color entre los dos.

## Motivo

R-008 puso, entre la salida y la entrada, una línea vertical fina del color del modo nuevo (el
«junco») que crece desde la sombra durante ~160 ms. En pantalla aparece sola, justo cuando el
personaje anterior ya salió y el nuevo aún no entra, así que se lee como un error de dibujo y no
como la metáfora. Victor, 07-oct-2026, al probar la landing con las flechas: «en la transición
de los modos se ve una línea […] no se entiende el diseño».

## Decisión

- Se quita la línea del junco en los dos lugares que la dibujan: `ReedCharacter` animado (panel,
  botón flotante, bienvenida R-020) y el escenario de `ModesShowcase` en la landing.
- Se quita también el contador de cambios que solo servía para dispararla (`bendCount` /
  `changes`) y las constantes de su tiempo.
- Se queda todo lo demás de R-008: el doblez de salida y entrada (`bendVariants`), la
  respiración, la «z» del modo dormido, la inclinación hacia el cursor, el acento de color por
  modo (`modeAccent`, que sigue usando el halo y el subrayado) y el fundido con
  `prefers-reduced-motion`.
- La barra de progreso segmentada de la bienvenida (R-020) no es esta línea y no se toca.

## Criterios de aceptación

1. `grep -rn "w-\[2px\]" frontend/src/components/reed src/components/marketing` no devuelve la
   línea del junco.
2. Cambiar de modo con las flechas en la landing y desde el menú de la app no muestra ninguna
   línea; el doblez sigue igual.
3. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
