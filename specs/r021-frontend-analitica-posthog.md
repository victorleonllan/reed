# Spec R-021 — Analítica con PostHog en la landing y en la app

> Estado: aplicado (07-oct-2026). Verificado: `npx tsc --noEmit`, `npx tsc --noEmit -p frontend` y `npm run lint` en verde; sin build ni servidor (reglas de la tanda). `identify` con el id de Clerk desde `ReedContext` vía `useAccount()`, sin tocar otros archivos.
> Capa: FRONTEND. `src/components/marketing/Analytics.tsx` (nuevo),
> `src/app/(marketing)/layout.tsx`, `frontend/src/lib/analytics.ts` (nuevo),
> `frontend/src/main.tsx`, `frontend/src/context/ReedContext.tsx`,
> `frontend/src/services/billing.ts`.
> Depende de: R-001 (`posthog-js` en los dos proyectos), R-012 (layout de marketing),
> R-019 (`services/billing.ts`).

> **En una frase:** se mide el embudo del producto (visita → cuenta → libro abierto → modo usado
> → checkout) con PostHog, sin mandar nada si no hay clave, y sin datos personales en los eventos.

## Motivo

Con cobro, hay que saber dónde se cae la gente. ShipeaRapido trae PostHog
(`~/projects/shipearapido/libs/analytics.js` y `components/Analytics.js`, **solo lectura**); se
toma ese patrón.

## Decisión

### Landing (Next)

`Analytics.tsx` (`"use client"`): inicializa `posthog-js` con `NEXT_PUBLIC_POSTHOG_KEY`/`HOST`
si existen, `capture_pageview: true`, `persistence: "localStorage+cookie"`. Sin clave, no hace
nada. Se monta en `(marketing)/layout.tsx`. Evento extra: `cta_clicked` con `{ location:
"hero" | "pricing" | "cta" | "header", plan? }` — **solo** si se puede agregar sin editar los
componentes de R-012 (por ejemplo, con un listener delegado sobre `a[href^="/app"]` en
`Analytics.tsx` que lea `data-cta` si existe o la sección más cercana); si no, solo pageviews.

### App (Vite)

- `lib/analytics.ts`: `initAnalytics()`, `identify(userId)`, `track(event, props?)`, `reset()`.
  No-ops sin `VITE_POSTHOG_KEY`. Nunca manda email, nombre ni texto del libro.
- `main.tsx`: `initAnalytics()` antes de montar.
- `ReedContext.tsx`: `track("mode_changed", { from, to })` en `setMode`.
- `services/billing.ts`: `track("checkout_started", { interval })` y `track("portal_opened")`.
- Identificación: `identify(userId)` donde el id de Clerk ya está disponible sin tocar archivos
  de otros specs; si eso exige editar un archivo fuera de la capa, se omite y se anota (los
  eventos anónimos ya sirven para el embudo).

## Criterios de aceptación

1. Sin claves de PostHog, la landing y la app no hacen ninguna petición a PostHog (verificable
   en el código: el `init` está detrás del chequeo de la clave).
2. Ningún evento lleva email, nombre ni contenido de libros.
3. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.

## Fuera de alcance

Paneles de PostHog, grabación de sesiones, experimentos A/B.
