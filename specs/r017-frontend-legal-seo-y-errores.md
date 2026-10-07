# Spec R-017 — Términos, privacidad, SEO y páginas de error

> Estado: diseño (07-oct-2026).
> Capa: FRONTEND. `src/app/(marketing)/tos/page.tsx`, `src/app/(marketing)/privacy-policy/page.tsx`,
> `src/lib/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/opengraph-image.tsx`,
> `src/app/not-found.tsx`, `src/app/error.tsx` (todos nuevos).
> Depende de: R-012 (`(marketing)/layout.tsx` con encabezado y pie), R-001 (`config`).

> **En una frase:** las páginas que Stripe y Google piden (términos y privacidad), el sitemap,
> robots, la imagen para compartir en redes y páginas de error con la voz de Reed.

## Motivo

Stripe exige términos y política de privacidad públicos para activar pagos. Sin sitemap ni
imagen Open Graph, la landing no se indexa bien ni se ve bien al compartirla. ShipeaRapido trae
`app/(marketing)/tos`, `privacy-policy`, `libs/seo.js` y `app/not-found.js`/`error.js`
(**solo lectura**); se portan con la API nativa de Next 16 (`sitemap.ts`, `robots.ts`,
`opengraph-image.tsx`, `generateMetadata`), en vez de `next-sitemap`. Leer
`node_modules/next/dist/docs/` sobre metadata antes de escribir.

## Decisión

- **`seo.ts`**: `getSEOTags({ title?, description?, path?, … })` que arma `Metadata` con
  `config`, `canonical` desde `config.siteUrl` y Open Graph/Twitter.
- **Términos y privacidad**: texto en español, claro y corto, con encabezado «Borrador — revisar
  con un abogado antes de lanzar» **visible** en la página (no es asesoría legal; queda en
  `R-PENDIENTES.md`). Contenido mínimo:
  - Privacidad: qué datos guarda Reed (cuenta de Clerk, libros subidos, progreso, notas,
    conversaciones con el agente y sus transcripciones), quién los procesa (Clerk, Neon, Vercel,
    ElevenLabs, Stripe, Resend, PostHog), para qué, cuánto tiempo, y cómo pedir borrarlos
    (`config.supportEmail`).
  - Términos: qué es el servicio, plan gratis y Pro, cobro recurrente y cancelación desde el
    perfil, límites de uso, que el usuario es responsable de tener derecho a subir sus libros,
    que las respuestas de la IA pueden equivocarse.
  - Fecha de última actualización.
- **`sitemap.ts`**: `/`, `/tos`, `/privacy-policy`, `/blog` (R-018 lo crea; incluirlo ya).
- **`robots.ts`**: permite todo menos `/app` y `/api`; apunta al sitemap.
- **`opengraph-image.tsx`**: 1200×630 con `ImageResponse`: fondo papel, «Reed» grande, la
  tagline y el personaje compañero (`/reed/companion.webp` leído del sistema de archivos o por URL
  absoluta, lo que permita la versión instalada).
- **`not-found.tsx`**: Reed bibliotecario (`/reed/librarian.webp`) y «Esta página no está en
  ninguna de mis estanterías.» + botón al inicio.
- **`error.tsx`** (`"use client"`): Reed dormido y «Algo se me cayó del estante. Prueba de
  nuevo.» + botón «Reintentar» (`reset()`).

## Criterios de aceptación

1. `/tos` y `/privacy-policy` existen, con el aviso de borrador visible.
2. `robots.txt` bloquea `/app` y `/api`; `sitemap.xml` lista las 4 rutas.
3. `npx tsc --noEmit && npm run lint` verde.
4. **V4 (en ejecución, la mañana):** `/opengraph-image` responde una imagen y una URL
   inexistente muestra la página de Reed.

## Fuera de alcance

Revisión legal real. El blog (R-018).
