# Spec R-019 — Plan, uso y pago de Reed Pro dentro de la app

> Estado: diseño (07-oct-2026).
> Capa: FRONTEND. `frontend/src/components/profile/ProfileView.tsx`,
> `frontend/src/components/billing/PlanCard.tsx` (nuevo),
> `frontend/src/components/billing/UpgradeModal.tsx` (nuevo),
> `frontend/src/components/billing/CheckoutReturn.tsx` (nuevo),
> `frontend/src/services/billing.ts` (nuevo), `frontend/src/services/api.ts`,
> `frontend/src/App.tsx`.
> Depende de: R-006 (`GET /api/usage` con plan), R-010 (checkout y portal), R-013 (`App.tsx` con
> `Toaster`), R-015 (`apiFetch` exportado).

> **En una frase:** el perfil muestra tu plan y cuánto usaste hoy; cuando llegas a un límite, Reed
> te ofrece Pro con calma; pagar y cancelar son un clic, y al volver de Stripe la app te dice qué
> pasó.

## Motivo

R-010 dejó el cobro listo en el servidor; falta que el usuario lo vea y lo use. El alma de marca
manda el tono: el usuario nunca debe sentir **culpa ni apuro**, así que el límite no se presenta
como castigo sino como «hoy leímos mucho».

## Decisión

### `services/billing.ts`

Con el `apiFetch` exportado de `services/api.ts`:
- `getUsage()` → `GET /api/usage` → `{ usage, plan }`.
- `startCheckout(interval)` → `POST /api/stripe/create-checkout` → `window.location.assign(url)`.
- `openPortal()` → `POST /api/stripe/create-portal` → `window.location.assign(url)`.
- 503 → aviso «Los pagos todavía no están activos.» (con `toast` de `react-hot-toast`).

### Límite alcanzado (`services/api.ts` + `UpgradeModal`)

- En `apiFetch`, ante un **429** se emite `window.dispatchEvent(new CustomEvent("reed:limit",
  { detail: { message } }))` antes de lanzar el `ApiError` de siempre. Es el único cambio en
  `api.ts`.
- `App.tsx` monta `<UpgradeModal />`, que escucha `reed:limit`. Si el plan es `free`: Reed
  dormido (`ReedCharacter mode="sleeping"`), «Hoy leímos mucho juntos.», el mensaje del
  servidor, lo que trae Pro (de `GET /api/usage` + textos fijos alineados con `config.plans.pro`)
  y dos botones: «Seguir mañana» (cierra) y «Probar Reed Pro» (`startCheckout("month")`). Si ya
  es `pro`, solo el mensaje y «Seguir mañana». No se abre dos veces en 10 minutos.

### Perfil (`ProfileView` + `PlanCard`)

`PlanCard` arriba de las estadísticas: nombre del plan, estado (activo · pago pendiente ·
cancelado), «se renueva el <fecha>» o «termina el <fecha>», y barras de uso de hoy por tipo
(`ProgressBar` de R-003) con etiquetas en español. Botones: gratis → «Mejorar a Reed Pro»
(mensual/anual); Pro → «Administrar suscripción» (`openPortal`). Sin sesión de backend (modo
demo) la tarjeta no aparece.

### Volver de Stripe y llegar desde la landing (`CheckoutReturn`)

Montado en `App.tsx`, lee la URL al cargar:
- `?checkout=ok` → `toast.success("Listo: ya tienes Reed Pro.")`, refresca el plan (el webhook
  puede tardar unos segundos: reintenta `getUsage()` hasta 3 veces, cada 2 s) y limpia la query.
- `?checkout=cancelado` → aviso neutro «No se hizo ningún cobro.» y limpia la query.
- `?plan=pro&interval=month|year` (viene del botón Pro de la landing, R-012) → con sesión,
  `startCheckout(interval)`; sin sesión, la pantalla de acceso (R-014) ya muestra la línea de Pro
  y, al entrar, la query sigue ahí y se dispara el checkout.

## Criterios de aceptación

1. Un 429 de cualquier endpoint abre el modal una vez (no en bucle).
2. El perfil muestra plan y uso de hoy desde `GET /api/usage`.
3. `?checkout=ok`, `?checkout=cancelado` y `?plan=pro` se manejan y la query queda limpia.
4. `npx tsc --noEmit -p frontend && npm run lint` verde.
5. **V5 (en ejecución, la mañana):** pago completo en modo de prueba de Stripe (tarjeta
   `4242 4242 4242 4242`) y cancelación desde el portal.

## Fuera de alcance

Cupones propios, facturas dentro de la app (las da el portal de Stripe).
