# Spec R-001 — Base de la v2: dependencias, variables de entorno y config central

> Estado: diseño (07-oct-2026).
> Capa: LOGICA. `package.json`, `package-lock.json`, `frontend/package.json`,
> `frontend/package-lock.json`, `.env.example`, `src/config.ts` (nuevo).
> Depende de: nada. Todos los demás specs de la v2 parten de este.

> **En una frase:** se instalan de una vez todas las dependencias que usará la v2 y se crea
> `src/config.ts` con nombre, dominio, planes y correos, para que ningún spec posterior
> tenga que tocar `package.json` ni inventar sus propios valores.

## Motivo

La v2 se ejecuta con varios agentes en paralelo sobre el mismo worktree. Si dos de ellos
corren `npm install` a la vez, se pisan `package-lock.json` y `node_modules`. Por eso **todas**
las dependencias entran aquí, en un solo spec, y los demás specs tienen prohibido instalar.

`src/config.ts` copia la idea de `config.js` de ShipeaRapido (`~/projects/shipearapido/config.js`,
**solo lectura**): un único lugar con los datos del producto que leen la landing, los precios,
el cobro y los correos.

## Decisión

### Dependencias

| Dónde | Paquete | Para qué (spec) |
|---|---|---|
| raíz | `stripe` | cobro (R-010) |
| raíz | `resend` | correos (R-016) |
| raíz | `posthog-js` | analítica en la landing (R-021) |
| raíz | `motion` | animaciones de la landing (R-012) |
| `frontend/` | `motion` | transición entre modos (R-008) y animaciones de la app |
| `frontend/` | `react-hot-toast` | avisos (R-013) |
| `frontend/` | `posthog-js` | analítica en la app (R-021) |
| `frontend/` | `@elevenlabs/react` | conversación por voz (R-015) |

Instalar con `npm install <pkgs>` en la raíz y `npm --prefix frontend install <pkgs>`. Se
commitean los dos `package.json` y los dos `package-lock.json`. Se aceptan las versiones
actuales (`motion` 14 y `@elevenlabs/react` 1.x soportan React 18, que es el del frontend).

### `.env.example`

Se agregan, con comentario de una línea que diga de dónde sale cada valor (mismo estilo que
las variables existentes):

```
# Sitio público (sin barra final). Lo usan SEO, Stripe (URLs de vuelta) y correos.
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Stripe → Developers → API keys / Webhooks. Productos: Reed Pro mensual y anual.
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=

# Clerk → Webhooks → endpoint <sitio>/api/webhooks/clerk, evento user.created.
CLERK_WEBHOOK_SIGNING_SECRET=

# Resend → API Keys. Sin clave, los correos se omiten sin error.
RESEND_API_KEY=

# PostHog → Project settings. Sin clave, no se manda analítica.
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

### `src/config.ts`

```ts
export const config = {
  appName: "Reed",
  tagline: "El amigo curioso que ya leyó el libro",
  appDescription:
    "Reed te lee en voz alta, te resume y responde tus preguntas mientras lees, para que cualquier libro quepa en tu día.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000",
  appPath: "/app",
  supportEmail: "hola@reed.app",          // placeholder: Victor lo cambia (R-PENDIENTES)
  resend: { fromNoReply: "Reed <noreply@reed.app>", fromAdmin: "Reed <hola@reed.app>" },
  plans: { free: {...}, pro: {...} },
} as const;
```

Planes (los **límites** son por usuario, en una ventana móvil de 24 h, igual que
`src/lib/usage.ts`):

| Plan | Precio | Lectura en voz alta | Subidas | Sesiones de voz | Respuestas de Reed |
|---|---|---|---|---|---|
| `free` | 0 | 5 000 caracteres | 10 | 30 | 100 |
| `pro` | MXN 99/mes · MXN 990/año | 20 000 caracteres | 30 | 60 | 500 |

`plans.free.limits` repite los valores por defecto de hoy, para que el plan gratis no cambie.
`plans.pro` lleva además `name: "Reed Pro"`, `priceMonthly: 99`, `priceYearly: 990`,
`currency: "MXN"`, `stripePriceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? ""`,
`stripePriceYearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? ""` y una lista `features` de 4-5
frases cortas en español, con la voz de Reed (ver `specs/R-README.md` → «Tono»). Los límites
como objeto con las mismas claves de `UsageKind` (`tts_chars`, `upload`, `agent_session`,
`ai_request`), para que R-006 los use sin traducir.

Precio y límites de Pro son un **default razonable**: quedan anotados en `R-PENDIENTES.md`
para que Victor los ajuste con el costo real de ElevenLabs. El config los deja en un solo lugar
justamente para eso.

## Criterios de aceptación

1. `npm ls stripe resend posthog-js motion` en la raíz y `npm --prefix frontend ls motion
   react-hot-toast posthog-js @elevenlabs/react` listan los ocho paquetes sin error.
2. `src/config.ts` exporta `config` tipado (`as const`) y nadie lo importa todavía.
3. `.env.example` tiene las variables nuevas con su comentario; no se tocó ninguna existente.
4. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.

## Fuera de alcance

- Usar las dependencias: cada spec posterior las usa en su capa.
- Crear productos en Stripe, claves de Resend o PostHog: lo hace Victor (R-022 lo documenta).
