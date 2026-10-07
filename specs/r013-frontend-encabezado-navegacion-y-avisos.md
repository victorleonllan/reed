# Spec R-013 — Encabezado, navegación móvil y avisos

> Estado: aplicado (07-oct-2026) — `npx tsc --noEmit`, `npx tsc --noEmit -p frontend` y `npm run lint` en verde; criterios 1 y 2 (375 px, indicador que se desliza) pendientes de ver en navegador.
> Capa: FRONTEND. `frontend/src/components/ui/Header.tsx`, `frontend/src/components/ui/MobileNav.tsx`
> (nuevo), `frontend/src/App.tsx`, `frontend/src/context/AccountContext.tsx`.
> Depende de: R-001 (`react-hot-toast`, `motion`), R-003 (componentes base).

> **En una frase:** el encabezado se ordena (marca, navegación, tema, cuenta), en móvil la
> navegación baja a una barra inferior, el cambio entre vistas tiene una transición corta, y los
> avisos pasan a `react-hot-toast` con el estilo de Reed.

## Motivo

En móvil el encabezado de hoy aprieta cinco controles en 64 px. Los avisos son un botón fijo
hecho a mano en `App.tsx` que no se apila ni se anuncia a lectores de pantalla.
ShipeaRapido usa `react-hot-toast` (`~/projects/shipearapido/components/LayoutClient.js`,
**solo lectura**); se toma esa elección.

## Decisión

### `Header`

- Izquierda: `BrandLogo`; en el lector, la miga «/ Título · Capítulo» (ya existe).
- Derecha en escritorio: segmento Biblioteca · Almacén, Perfil, `ThemeToggle`, avatar.
- El ítem activo se marca con la línea del junco bajo el texto (2 px, color `reed`) que **se
  desliza** entre ítems con `motion` (`layoutId`), en vez del fondo arcilla actual.
- En móvil (< 640 px): solo logo, `ThemeToggle` y avatar arriba.
- En el lector, el encabezado se esconde al hacer scroll hacia abajo y vuelve al subir (lectura
  sin distracciones).

### `MobileNav` (nuevo)

Barra inferior fija en móvil con Biblioteca · Almacén · Perfil (ícono + etiqueta), con
`env(safe-area-inset-bottom)`. **Se oculta en el lector**, donde la parte inferior es de la barra
de escucha y del botón de Reed.

### Transición entre vistas (`App.tsx`)

`AnimatePresence mode="wait"` con `key={currentView}` sobre `<main>`: fundido + 6 px de
desplazamiento, 180 ms. Con movimiento reducido, solo fundido.

### Avisos

- `App.tsx` monta `<Toaster position="top-center" />` con estilo de Reed (fondo
  `paper-raised`, texto `ink`, borde `line`, radio `md`, Atkinson) y borra el botón de aviso
  hecho a mano.
- `AccountContext.tsx`: donde hoy hace `setToast(msg)`, llama a `toast(msg)` (o
  `toast.success`/`toast.error` según el caso). Se quitan `toast`/`dismissToast` del contexto
  **solo si** nadie más los usa (`grep -rn "dismissToast\|\.toast\b" frontend/src`); si alguien
  los usa, se dejan como no-op y se anota.
- Los avisos tienen `role="status"` (lo trae la librería) y duran 3.5 s.

## Criterios de aceptación

1. En 375 px de ancho, el encabezado no se desborda y la barra inferior aparece fuera del
   lector y no dentro.
2. El indicador del ítem activo se desliza al cambiar de vista.
3. No queda el aviso hecho a mano en `App.tsx`.
4. `npx tsc --noEmit -p frontend && npm run lint` verde.

## Fuera de alcance

Perfil y plan (R-019), bienvenida (R-020).
