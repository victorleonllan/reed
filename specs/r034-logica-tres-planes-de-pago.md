# Spec R-034 — Tres planes de pago en dólares: Básico, Pro y Biblioteca

> Estado: aplicado (15-oct-2026). Verificado: `npx tsc --noEmit`, `npx tsc --noEmit -p frontend` y `npm run lint` verdes; `grep '"MXN"' src/config.ts` vacío; el webhook ya no escribe `plan: "pro"` fijo.
> Capa: LÓGICA. `src/config.ts` (solo `plans` y el comentario de límites), `src/lib/plan.ts`,
> `src/lib/stripe.ts`, `src/app/api/stripe/create-checkout/route.ts`,
> `src/app/api/webhooks/stripe/route.ts`, `.env.example` (bloque de Stripe).
> Depende de: R-033.
> Alimenta: R-035, R-036, R-039.

> **En una frase:** Reed deja de tener un plan gratis con IA y pasa a tres planes pagados en
> dólares (Básico USD 1, Pro USD 10, Biblioteca USD 25), con límites mensuales y un cupo de
> libros guardados.

## Motivo

Victor, 15-oct-2026: «el gratis debería valer 1 dólar, el pro debería valer 10 dólares», «el
pro debería ser con la Reed lector», y una versión más grande. El modelo de costos está en la
nota del vault «Reed — plan de orquestación del audio pregenerado» (sección «Siguiente diseño»):

- La voz de los libros pasa a generarse en la máquina local (R-036, R-037) y se guarda en R2. Su
  costo es espacio (~380 MB por libro, ~USD 0,006 al mes) y horas de GPU, no créditos.
- Explicar, resumir, test y la conversación siguen en el agente de ElevenLabs:
  **USD 0,003 por mensaje + el LLM** (`elevenlabs.io/pricing/agents`, revisado el 15-oct-2026).
- Con los topes de hoy (24 h móviles) un usuario gratis puede costar ~USD 9 al mes y un Pro
  ~USD 45, sin contar el LLM.
- Stripe México cobra 3,6 % + MXN 3 más IVA por cobro: ~USD 0,23 en USD 1 y ~USD 0,61 en USD 10.

## Decisión

### Planes (`config.plans`)

`PlanId` pasa a `"free" | "basico" | "pro" | "biblioteca"`. `free` ya no se vende: es el estado
de una cuenta **sin plan** (nunca pagó o canceló). Los límites son **por mes** (30 días
móviles, R-035).

| Clave | Nombre | USD/mes | USD/año | `books` | `audioBooks` | `upload` | `ai_request` | `agent_session` | `tts_chars` |
|---|---|---|---|---|---|---|---|---|---|
| `free` | Sin plan | 0 | 0 | 0 | no | 0 | 0 | 0 | 0 |
| `basico` | Reed Básico | 1 | 10 | 1 | no | 2 | 30 | 10 | 0 |
| `pro` | Reed Pro | 10 | 100 | 3 | **sí** | 6 | 300 | 60 | 20 000 |
| `biblioteca` | Reed Biblioteca | 25 | 250 | 20 | **sí** | 40 | 1000 | 200 | 50 000 |

- `books`: cuántos libros propios puede **tener guardados** a la vez. Para subir otro, borra uno
  (lo aplica R-035). No es un `UsageKind`: se cuenta en `documents`.
- `audioBooks`: si sus libros propios entran en la cola de la máquina de audio (R-036). Sin él,
  sus libros propios se escuchan con la voz del navegador.
- `upload` por mes acota las horas de GPU: un Pro puede reemplazar sus 3 libros una vez al mes.
- `tts_chars` solo cuenta si `TTS_FALLBACK=elevenlabs` (R-038): es la red de seguridad mientras
  la máquina no generó un libro. Sin esa variable, ElevenLabs no lee nada y el tope no se usa.
- Todas las cuentas, incluida `free`, leen y escuchan el catálogo: su audio está en R2 y no
  cuesta por lectura.
- `currency: "USD"` en los cuatro. Cada plan pagado tiene `stripePriceMonthly` y
  `stripePriceYearly` desde `STRIPE_PRICE_<PLAN>_MONTHLY` / `_YEARLY` (`BASICO`, `PRO`,
  `BIBLIOTECA`).
- `features` (español neutro, de tú, tono de Reed, sin «por voz» y sin «al día»):
  - basico: «Lee y escucha los libros de Reed», «Guarda 1 libro tuyo», «30 preguntas o
    resúmenes al mes», «10 conversaciones conmigo al mes».
  - pro: «Te leo tus propios libros con mi voz», «Guarda 3 libros tuyos», «300 preguntas o
    resúmenes al mes», «60 conversaciones conmigo al mes», «Sin apuro: cancelas cuando quieras».
  - biblioteca: «Te leo tus propios libros con mi voz», «Guarda 20 libros tuyos», «1000 preguntas
    o resúmenes al mes», «200 conversaciones conmigo al mes», «Sin apuro: cancelas cuando quieras».
- El comentario de la línea 3 pasa a «per user over a rolling 30-day window».

Costo máximo por usuario al mes, sin el LLM (ElevenLabs USD 0,003 por mensaje, ~10 mensajes por
conversación): Básico ~USD 0,39, Pro ~USD 2,70, Biblioteca ~USD 9. Todos por debajo de lo que
recibe Victor después de Stripe.

### `src/lib/plan.ts`

- `parse` acepta las cuatro claves; cualquier otro valor es `free`.
- Nueva `activePlan(info): PlanId`: el plan si `status` es `active` o `past_due`; si no, `free`.
- `isPro(info)` se mantiene por compatibilidad y pasa a significar «tiene un plan pagado
  activo» (`activePlan(info) !== "free"`). Comentario que lo diga.

### `src/lib/stripe.ts`

- `createCheckout({ userId, email, plan, interval, customerId })`: `plan` es `basico`, `pro` o
  `biblioteca`; toma el precio de `config.plans[plan]`. Sin precio →
  `PaymentsNotConfiguredError` con el nombre del plan. `subscription_data.metadata` lleva
  `{ userId, plan }`.
- Nueva `planForPrice(priceId): PlanId | null`: compara con los seis precios de `config.plans`.

### `create-checkout`

Body `{ plan, interval }`. `plan` inválido → 400. Si el usuario ya tiene **cualquier** plan
pagado activo → 409 con «Ya tienes un plan. Cámbialo desde "Gestionar suscripción".» (el portal
de Stripe hace los cambios de plan).

### Webhook de Stripe

Donde hoy escribe `plan: "pro"`, el plan sale de `planForPrice(subscription.items.data[0].price.id)`;
si no coincide, de `subscription.metadata.plan`; si tampoco, `"pro"` (suscripciones viejas).
`checkout.session.completed` usa la suscripción ya recuperada. Cancelada → `"free"`, como hoy.
`onProActivated` se sigue llamando con cualquier plan pagado.

### `.env.example`

El bloque de Stripe lista las seis variables `STRIPE_PRICE_*` y dice que los precios se crean en
dólares en el panel de Stripe, y que el portal debe permitir cambiar de plan entre los tres
productos.

## Fuera de este spec

Uso y cupo de libros (R-035), cola de audio (R-036), pantallas de precios (R-039). Las
pantallas actuales siguen compilando: `config.plans.free` y `config.plans.pro` existen.

## Criterios de aceptación

1. `config.plans` tiene `free`, `basico`, `pro` y `biblioteca` con los valores de la tabla.
2. `grep -rn '"MXN"' src/config.ts` vacío.
3. El webhook no escribe `plan: "pro"` fijo en `checkout.session.completed` ni en
   `customer.subscription.updated`.
4. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
