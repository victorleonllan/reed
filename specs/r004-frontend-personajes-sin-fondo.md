# Spec R-004 — Los personajes de Reed sin fondo ni marco

> Estado: aplicado (07-oct-2026). Verificado: `tsc --noEmit` raíz y `-p frontend`, `npm run lint` verdes; criterios 1 y 4 por grep (sin `rounded-[4px] overflow-hidden`, sin imports .png/.jpg de personajes); WebP 44,9–56,2 KB en `assets/reed/` y `public/reed/`. Pendiente la revisión visual (V6).
> Capa: FRONTEND. `frontend/src/assets/reed/` (webp nuevos, se borran los `.jpg` y `.png` de
> los personajes), `public/reed/` (nuevo, copias para la landing),
> `frontend/src/components/reed/portraits.ts` (nuevo),
> `frontend/src/components/reed/ReedCharacter.tsx` (nuevo),
> `frontend/src/components/reed/ReedBubble.tsx`, `frontend/src/components/reed/ReedModePanel.tsx`,
> `frontend/src/components/reed/modes/SleepingMode.tsx`.
> Depende de: R-002 (`reed/modes/`).

> **En una frase:** los cinco personajes (dormido, compañero, profesor, bibliotecario, lector)
> se ven recortados, flotando sobre la página, sin la caja con fondo y borde que hoy los
> encierra, y pesan una fracción de lo que pesan.

## Motivo

Pedido de Victor (07-oct-2026): «que el uso de los personajes se vea sin fondo en el front».

Los PNG **ya son transparentes** (≈ 60 % de píxeles con alfa 0, medido el 07-oct). El fondo que
se ve viene del **marco**: cada retrato va dentro de un `<span>` con `bg-paper-raised border
border-line-strong rounded-[4px] overflow-hidden` (en `ReedBubble`, en el encabezado del panel
y en el modo dormido), y el botón flotante es un círculo con `bg-paper-raised`. Además cada PNG
pesa ~900 KB y hay copias `.jpg` sin uso.

## Decisión

### Assets

- Convertir los cinco personajes a **WebP con alfa** (`cwebp -q 85 -alpha_q 100`, está en
  `/opt/homebrew/bin/cwebp`), recortando el margen transparente sobrante (trim) y escalando a
  640 px de alto. Objetivo: < 120 KB cada uno.
- Borrar `companion|librarian|reader|sleeping|teacher` en `.png` y `.jpg` de
  `frontend/src/assets/reed/` (antes, `grep -rn` para confirmar que nada más los importa).
  `logo.png` se queda.
- Copiar los mismos WebP a `public/reed/<modo>.webp`: la landing de Next (R-012) los sirve
  desde ahí, porque no puede importar archivos del proyecto Vite.

### `portraits.ts` y `ReedCharacter`

- `portraits.ts` exporta `modePortraits: Record<ReedMode, string>` y `modeLabels` (nombre del
  modo y frase: «Déjame solo», «Acompáñame», «Enséñame», «Ayúdame con mis libros», «Léemelo»,
  hoy repetidos en `ReedBubble`). Fuente única: `ReedBubble` y el panel dejan de declarar los
  suyos.
- `ReedCharacter` dibuja al personaje **sin contenedor visible**:
  `<ReedCharacter mode="teacher" size="sm|md|lg|xl" className="" />`.
  - `<img>` con `object-contain`, `alt` descriptivo («Reed en modo Profesor»), `draggable={false}`,
    `decoding="async"`.
  - Sin fondo, sin borde, sin `overflow-hidden` que corte al personaje.
  - Una **sombra de contacto**: elipse difusa bajo los pies (pseudo-elemento o `<span>`
    absoluto con `radial-gradient`), para que flote sobre la página sin verse pegado. En
    oscuro, la sombra se aclara un poco para que no desaparezca.
  - `drop-shadow` suave (`filter: drop-shadow(...)`) en vez de caja.
  - Tamaños con alto fijo y ancho automático.

### Dónde se usa

- `ReedBubble`: el botón flotante deja de ser círculo con fondo. Es el personaje `size="md"`
  parado en la esquina, con un halo sutil en hover/focus (no un fondo sólido) y el `aria-label`
  de hoy. En el menú de modos, cada opción muestra `ReedCharacter size="sm"` sin la caja.
- `ReedModePanel` (encabezado) y `SleepingMode`: `ReedCharacter size="sm"`, sin caja.

## Criterios de aceptación

1. `grep -rn "rounded-\[4px\] overflow-hidden" frontend/src/components/reed` no devuelve nada.
2. Ningún personaje se ve dentro de una caja con fondo: verificado en el código (sin
   `bg-*`, `border` ni `overflow-hidden` en el contenedor directo de la imagen).
3. Los cinco `.webp` pesan < 120 KB cada uno (anotar los pesos en el reporte) y existen en
   `frontend/src/assets/reed/` y `public/reed/`.
4. No queda ningún import a `.png` o `.jpg` de personajes.
5. `npx tsc --noEmit -p frontend && npm run lint` verde.

## Fuera de alcance

Animar al personaje o el cambio de modo: es R-008, que construye sobre `ReedCharacter`.
