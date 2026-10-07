# Spec R-002 — Partir `ReedModePanel` en un componente por modo

> Estado: aplicado (07-oct-2026) — `tsc --noEmit` raíz y `-p frontend` verdes, `npm run lint` verde; contenedor en 106 líneas.
> Capa: FRONTEND. `frontend/src/components/reed/ReedModePanel.tsx`,
> `frontend/src/components/reed/modes/SleepingMode.tsx` (nuevo),
> `frontend/src/components/reed/modes/CompanionMode.tsx` (nuevo),
> `frontend/src/components/reed/modes/TeacherMode.tsx` (nuevo),
> `frontend/src/components/reed/modes/LibrarianMode.tsx` (nuevo),
> `frontend/src/components/reed/modes/ReaderMode.tsx` (nuevo),
> `frontend/src/components/reed/modes/SessionTestFlow.tsx` (nuevo).
> Depende de: nada.

> **En una frase:** refactor sin cambio visible: el panel de 688 líneas se parte en un archivo
> por modo, para que la animación (R-008), el contenido real (R-009) y la voz (R-015) puedan
> trabajarse en paralelo sin pisarse.

## Motivo

`ReedModePanel.tsx` tiene hoy los cinco modos y el test de sesión en un solo archivo. Tres
specs de la v2 necesitan cambiarlo. Con un archivo por modo, cada spec toca solo el suyo.

## Decisión

- `ReedModePanel.tsx` queda como **contenedor**: recibe las mismas props que hoy, dibuja el
  marco (posición fija, encabezado con retrato y título, botón cerrar) y elige el componente
  del modo activo. Su API pública (props y export) **no cambia**: `ReaderView.tsx` no se toca.
- Cada modo es un componente en `reed/modes/` que recibe solo las props que usa, más las que
  le pase el contenedor. El estado interno de cada modo (pestañas, pasos socráticos, búsqueda)
  se muda con él.
- `SleepingMode` es el panel corto de «Reed está dormido». El contenedor lo devuelve tal cual
  (hoy tiene su propio marco más chico); mantener ese comportamiento.
- `SessionTestFlow` (el test de sesión del modo Profesor) sale a su propio archivo y
  `TeacherMode` lo importa.
- El texto, las clases de Tailwind y el comportamiento quedan **idénticos**. No se arregla
  nada de paso: el contenido inventado (Macondo, gitanos) se quita en R-009, los retratos en
  R-004.

## Criterios de aceptación

1. `ReedModePanel.tsx` queda por debajo de 150 líneas y no contiene JSX de ningún modo.
2. Los seis archivos nuevos existen en `reed/modes/` y cada uno exporta un componente con nombre.
3. `git diff --stat` no muestra cambios en `ReaderView.tsx` ni en ningún otro archivo fuera
   de la lista.
4. `npx tsc --noEmit -p frontend && npm run lint` verde.

## Fuera de alcance

Cualquier cambio visual o de texto.
