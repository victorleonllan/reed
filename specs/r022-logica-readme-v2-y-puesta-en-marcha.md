# Spec R-022 — README de la v2 y guía para poner en marcha el fork

> Estado: diseño (07-oct-2026).
> Capa: LOGICA. `README.md`, `backend/README.md`, `frontend/README.md`.
> Depende de: R-001 … R-021 (documenta lo que quedó).

> **En una frase:** el README cuenta qué es Reed v2, cómo correrlo y, paso a paso, qué tiene que
> configurar Victor (Vercel, Neon, Clerk, ElevenLabs, Stripe, Resend, PostHog) para que el fork
> funcione en vivo.

## Motivo

El fork `victorleonllan/reed` no tiene todavía Vercel, base ni claves propias: el original vive
en el Vercel y las cuentas de Angel. Al terminar la corrida de noche, lo primero que necesita
Victor es una lista ordenada de qué crear y dónde pegar cada valor.

## Decisión

### `README.md` (raíz)

- Encabezado: qué es Reed (una línea del alma de marca), estado (v2, fork de
  `Afaguayo/hackathon`, 2.º lugar en Innovathon 2.0), y la estructura: landing y API en Next
  (`/`, `/blog`, `/api/*`), app de Vite en `/app`.
- Actualizar la tabla de tecnologías (Stripe, Resend, PostHog, motion, react-hot-toast) y la de
  la API (rutas nuevas de Stripe, webhooks de Stripe y Clerk; `GET /api/usage` con plan).
- **«Poner en marcha el fork»**, en orden, con dónde se obtiene cada valor y qué variable de
  `.env.example` llena:
  1. Vercel: importar `victorleonllan/reed`; framework Next.js.
  2. Neon desde Vercel Storage → `DATABASE_URL`; `npm run db:migrate` y
     `npm run db:seed-catalog` una vez.
  3. Clerk: app nueva → claves; URLs permitidas; webhook `user.created` →
     `/api/webhooks/clerk` → `CLERK_WEBHOOK_SIGNING_SECRET`.
  4. ElevenLabs: los tres `ELEVENLABS_*` (agentes según `ai-agents/README.md`).
  5. Stripe (modo prueba primero): producto «Reed Pro», precios MXN 99/mes y 990/año →
     `STRIPE_PRICE_PRO_MONTHLY|YEARLY`; webhook a `/api/webhooks/stripe` con los eventos
     `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.payment_failed`; portal de clientes activado.
  6. Resend: dominio verificado y `RESEND_API_KEY`; cambiar remitentes en `src/config.ts`.
  7. PostHog: proyecto → `NEXT_PUBLIC_POSTHOG_KEY` y `VITE_POSTHOG_KEY`.
  8. `NEXT_PUBLIC_SITE_URL` con el dominio final.
- «Cómo trabajamos»: specs en `specs/` (`R-README.md` es el índice), un spec = un commit con
  `feat(spec-R0NN): …`, y que el remoto `upstream` (Angel) está bloqueado para push.
- Quitar del README lo que ya no es cierto (por ejemplo «Live voice conversation isn't in the
  frontend yet», la tabla de dueños del hackathon puede quedar como historia en una sección
  «Origen»).

### `backend/README.md` y `frontend/README.md`

Actualizar solo lo que cambió: rutas nuevas y plan en Clerk (backend); estructura de
componentes nueva, `motion`, `react-hot-toast`, personajes en WebP y `ReedCharacter` (frontend).

## Criterios de aceptación

1. Cada variable de `.env.example` aparece en la guía con dónde se obtiene.
2. No quedan en el README afirmaciones contradichas por el código de la v2.
3. `npm run lint` verde (los README no lo afectan, pero la cadena lo corre igual).

## Fuera de alcance

Configurar las cuentas: lo hace Victor siguiendo la guía.
