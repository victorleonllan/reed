# Spec R-041 — Reed se instala en el celular como app (PWA)

> Estado: aplicado (15-oct-2026). Verificado: `npx tsc --noEmit`, `npx tsc --noEmit -p frontend`, `npm run lint` y el build del frontend en verde; el HTML de `/app` enlaza el manifiesto y el `apple-touch-icon`. La instalación en el celular queda para V18.
> Capa: FRONTEND. `frontend/index.html`, `frontend/src/main.tsx`, `public/manifest.webmanifest`
> (nuevo), `public/sw.js` (nuevo), `public/pwa/` (íconos nuevos).
> Depende de: R-005 (la app vive en `/app`).

> **En una frase:** abrir `/app` en el celular permite «Instalar app» (Android) o «Agregar a
> pantalla de inicio» (iPhone), y Reed abre a pantalla completa con su ícono.

## Motivo

Victor, 15-oct-2026: «Necesito una PWA de reed para instalarla en mi celular y poder testear
reed». Una PWA (*progressive web app*: una web que el sistema instala como app, con ícono y sin
barra del navegador) evita publicar en tiendas para probar.

Decisiones de diseño:

- **Archivos en `public/` de Next, no en `frontend/`.** Vite construye en `public/app/` (base
  `/app/`), y un service worker en `/app/sw.js` solo puede controlar `/app/…`, no `/app`. En la
  raíz (`/sw.js`) controla todo el sitio.
- **El service worker no guarda nada en caché.** Solo responde a las navegaciones: red primero y,
  sin conexión, una página corta que lo dice. Guardar la app o `/api` en caché daría versiones
  viejas después de cada deploy; el audio ya tiene su caché en el navegador (R-027).
- **Ícono: Reed lector (`public/reed/reader.webp`) sobre el color papel `#f3ecdf`**, con margen
  para la zona segura de los íconos *maskable* (los que Android recorta en círculo o gota).
- `scope` `/` y `start_url` `/app`: la app abre en el lector y la landing no saca al usuario de
  la ventana instalada.

## Decisión

### `public/manifest.webmanifest`

`id` y `start_url` `/app`, `scope` `/`, `name` «Reed», `short_name` «Reed», `lang` `es`,
`display` `standalone`, `background_color` y `theme_color` `#f3ecdf`, la descripción del
`index.html`, e íconos PNG 192 y 512 (`purpose: any`) y 512 maskable.

### `public/pwa/`

`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180), generados
desde `public/reed/reader.webp`.

### `public/sw.js`

`install` → `skipWaiting`; `activate` → `clients.claim`; `fetch` solo para
`request.mode === "navigate"`: `fetch` a la red y, si falla, una respuesta HTML en español
«Reed necesita conexión para abrir. Vuelve a intentarlo cuando tengas internet.»

### `frontend/index.html`

`<link rel="manifest" href="/manifest.webmanifest">`, `apple-touch-icon`,
`apple-mobile-web-app-capable` y `mobile-web-app-capable` `yes`,
`apple-mobile-web-app-title` «Reed», `apple-mobile-web-app-status-bar-style` `default`.

### `frontend/src/main.tsx`

Solo con `import.meta.env.PROD` y si existe `navigator.serviceWorker`: registra `/sw.js` con
`scope: "/"` después del evento `load`. Un error de registro no rompe la app.

## Criterios de aceptación

1. En producción, `/manifest.webmanifest`, `/sw.js` y los cuatro íconos responden 200.
2. El HTML de `/app` enlaza el manifiesto y el `apple-touch-icon`.
3. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde y `npm run build:web`
   termina.
4. En el celular, `/app` se instala y abre sin barra del navegador (V18).
