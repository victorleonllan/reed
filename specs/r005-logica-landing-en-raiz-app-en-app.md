# Spec R-005 — La landing vive en `/` y la app en `/app`

> Estado: diseño (07-oct-2026).
> Capa: LOGICA. `next.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`,
> `src/app/(marketing)/page.tsx` (nuevo, provisional),
> `frontend/src/components/auth/ClerkAuthProvider.tsx`.
> Depende de: R-001 (`src/config.ts`).

> **En una frase:** Next deja de reescribir `/` a la app de Vite y la sirve en `/app`; `/` pasa
> a ser una página de Next, renderizada en el servidor, donde va la landing de R-012.

## Motivo

Un producto con cobro necesita una portada que se pueda indexar (SEO) y que explique qué es
Reed antes de pedir una cuenta. La app de Vite es una SPA (una sola página que se dibuja en el
navegador): no sirve para SEO. ShipeaRapido resuelve la portada con páginas de Next en
`app/(marketing)/`; Reed hace lo mismo, sin mover la app de Vite.

## Decisión

### Rutas

- `next.config.ts`: el rewrite `beforeFiles` pasa de `"/" → "/app/index.html"` a
  `"/app" → "/app/index.html"`. La app ya se compila con `base: '/app/'`
  (`frontend/vite.config.ts`), así que sus assets (`/app/assets/*`) no cambian. Actualizar el
  comentario que explica el rewrite.
- `/` queda libre para `src/app/(marketing)/page.tsx`. Este spec deja una **portada
  provisional** mínima: nombre, tagline y un botón «Abrir Reed» a `/app`. R-012 la reemplaza.
- El grupo `(marketing)` no agrega segmento a la URL (convención de App Router). **Antes de
  escribir**, leer la guía de rutas en `node_modules/next/dist/docs/` (Next 16: ver
  `AGENTS.md`).

### Layout raíz

- `src/app/layout.tsx`: `lang="es"`, fuentes **Literata** y **Atkinson Hyperlegible** con
  `next/font/google` (variables CSS `--font-serif` y `--font-sans`), `metadata` con
  `config.appName`, `config.appDescription` y `metadataBase: new URL(config.siteUrl)`. Se
  quitan Geist y el texto en inglés. `ClerkProvider` se queda.
- `src/app/globals.css` (Tailwind 4): los **mismos tokens de color** que
  `frontend/src/index.css` (`--color-paper`, `--color-ink`, `--color-reed`, …) declarados en
  `@theme`, con su variante oscura por `prefers-color-scheme: dark`. Así la landing y la app se
  ven como un solo producto. Si R-003 ajusta valores después, R-012 los sincroniza.

### App de Vite

- `ClerkAuthProvider.tsx`: `ClerkProvider` recibe `afterSignOutUrl="/"` (al salir, vuelve a la
  portada). Nada más cambia en el modo demo.

## Criterios de aceptación

1. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
2. El rewrite de `next.config.ts` apunta `/app` a `/app/index.html` y ya no menciona `/`.
3. **Verificación en ejecución (V1, la hace Victor o la sesión de la mañana, no el agente):**
   tras `npm run build && npm run start`, `/` muestra la portada de Next, `/app` carga la app y
   `/app/assets/*` responde 200. Ya está anotada como V1 en `specs/R-PENDIENTES.md`.

## Fuera de alcance

El contenido de la landing (R-012), páginas legales y SEO (R-017).
