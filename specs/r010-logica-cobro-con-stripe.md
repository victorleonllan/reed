# Spec R-010 — Cobro de Reed Pro con Stripe (checkout, portal y webhook)

> Estado: aplicado (07-oct-2026). Verificado: `tsc --noEmit` (raíz) y `npm run lint` verdes; sin clave, checkout y portal → 503 en español; eventos firmados con `generateTestHeaderString` (script temporal, no commiteado) → `setPlan` correcto en los 4 eventos, reproceso idéntico, firma inválida → 400.
> Capa: LOGICA. `src/lib/stripe.ts` (nuevo),
> `src/app/api/stripe/create-checkout/route.ts` (nuevo),
> `src/app/api/stripe/create-portal/route.ts` (nuevo),
> `src/app/api/webhooks/stripe/route.ts` (nuevo).
> Depende de: R-001 (`stripe`, `config.plans.pro`), R-006 (`getPlan`, `setPlan`).

> **En una frase:** un usuario con sesión paga Reed Pro (mensual o anual) en el checkout de
> Stripe; el webhook de Stripe marca su cuenta de Clerk como Pro y la vuelve a gratis cuando la
> suscripción se cancela; el portal de Stripe le deja cambiar tarjeta o cancelar.

## Motivo

Victor eligió «producto con cobro» (07-oct-2026). Se toma el patrón de ShipeaRapido
(`~/projects/shipearapido/libs/stripe.js` y `app/api/webhook/stripe/route.js`, **solo
lectura**: leerlos antes de escribir), adaptado a dos diferencias:

1. El plan no se guarda en una base: va en Clerk (R-006), porque esta corrida no toca la base.
2. Es TypeScript y Next 16 (leer `node_modules/next/dist/docs/` sobre route handlers).

## Decisión

### `src/lib/stripe.ts`

- `getStripe()`: cliente perezoso con `STRIPE_SECRET_KEY`; si falta, lanza
  `PaymentsNotConfiguredError` (clase nueva exportada desde aquí).
- `createCheckout({ userId, email, interval: "month" | "year", customerId? })`: sesión
  `mode: "subscription"` con el precio de `config.plans.pro.stripePriceMonthly|Yearly`,
  `client_reference_id: userId`, `subscription_data.metadata.userId = userId` (así cada evento
  de la suscripción trae el usuario), `customer` si ya tiene uno o `customer_email` si no,
  `allow_promotion_codes: true`, `success_url: ${config.siteUrl}/app?checkout=ok`,
  `cancel_url: ${config.siteUrl}/app?checkout=cancelado`. Devuelve la URL.
- `createPortal({ customerId })`: sesión del portal con `return_url: ${config.siteUrl}/app`.

### Rutas (todas `export const runtime = "nodejs"`)

- `POST /api/stripe/create-checkout` body `{ interval: "month" | "year" }` → requiere sesión
  (`getUserId()`), toma el email de Clerk, reutiliza `stripeCustomerId` si `getPlan` lo tiene,
  y responde `{ url }`. Si ya es Pro activo: 409 «Ya tienes Reed Pro.»
- `POST /api/stripe/create-portal` → requiere sesión y `stripeCustomerId`; si no hay: 404
  «Todavía no tienes una suscripción.» Responde `{ url }`.
- Sin Stripe configurado, las dos responden **503** `{ error: "Los pagos todavía no están
  activos." }` (agregar el caso a `handleRouteError` **no**: `src/lib/http.ts` no es de este
  spec; capturar `PaymentsNotConfiguredError` en cada ruta).

### Webhook `POST /api/webhooks/stripe`

- Verifica la firma con `STRIPE_WEBHOOK_SECRET` sobre el cuerpo crudo (`await req.text()`);
  firma inválida → 400. No usa Clerk para autenticarse (como el webhook de ElevenLabs).
- Eventos:
  | Evento | Acción |
  |---|---|
  | `checkout.session.completed` | `setPlan(client_reference_id, { plan: "pro", status: "active", stripeCustomerId, stripeSubscriptionId, renewsAt })` |
  | `customer.subscription.updated` | userId de `subscription.metadata.userId`; `status` de Stripe → `active`/`past_due`/`canceled`; `renewsAt = current_period_end`; si `cancel_at_period_end`, sigue Pro hasta esa fecha |
  | `customer.subscription.deleted` | `setPlan(userId, { plan: "free", status: "canceled", stripeSubscriptionId: null, renewsAt: null })` (se conserva `stripeCustomerId` para el portal) |
  | `invoice.payment_failed` | `status: "past_due"` |
  | otro | 200 sin acción |
- **Idempotente**: reprocesar el mismo evento deja el mismo estado (solo escribe valores
  absolutos, nunca incrementa).
- Responde 200 rápido; errores internos → 500 con `console.error` (Stripe reintenta).
- Tras `checkout.session.completed`, llamar a `onProActivated(userId)`, una función exportada
  desde `src/lib/stripe.ts` que por ahora no hace nada. R-016 (en un paso posterior) le pone el
  correo de bienvenida a Pro; así el webhook queda listo y R-016 cambia lo mínimo.

### Seguridad

- El navegador nunca recibe ids de precio ni claves: la ruta elige el precio por `interval`.
- `src/proxy.ts` ya deja pasar todo `/api/*` a los handlers (Clerk no bloquea); verificar que el
  webhook responde sin sesión y **no** cambiar el proxy si ya funciona.

## Criterios de aceptación

1. Sin `STRIPE_SECRET_KEY`, las rutas de checkout y portal responden 503 con el mensaje en
   español, y el build no falla.
2. Un `checkout.session.completed` firmado (probar con `stripe.webhooks.generateTestHeaderString`
   en un script temporal que **no** se commitea) llama a `setPlan` con `plan: "pro"`; anotar en
   el reporte cómo se probó.
3. Firma inválida → 400.
4. `npx tsc --noEmit && npm run lint` verde.

## Fuera de alcance

- Crear el producto y los precios en Stripe, y registrar el webhook: lo hace Victor (R-022).
- La interfaz de pago dentro de la app (R-019) y la tabla de precios de la landing (R-012).
