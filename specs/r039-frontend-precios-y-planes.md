# Spec R-039 — Precios y planes: Básico, Pro y Biblioteca en la landing y en la app

> Estado: aplicado (15-oct-2026). Verificado: grep de «MXN|al día» vacío, `tsc -p frontend` y
> `npm run lint` verdes; `tsc` raíz verde en los archivos del spec (el único error está en
> `scripts/generate-audiobook.mts`, en curso de otro spec).
> Capa: FRONTEND. `src/components/marketing/Pricing.tsx`, `frontend/src/services/billing.ts`,
> `frontend/src/components/billing/PlanCard.tsx`, `frontend/src/components/billing/UpgradeModal.tsx`,
> `frontend/src/components/billing/CheckoutReturn.tsx` (solo `isProPlan` → `hasPaidPlan` y la
> llamada a `startCheckout`, que conserva el plan elegido).
> Depende de: R-034, R-035.

> **En una frase:** la landing y la app muestran los tres planes en dólares con sus topes
> mensuales y su cupo de libros, y el aviso de límite deja elegir plan.

## Motivo

R-034 cambió los planes y R-035 los límites, pero la landing (`Pricing.tsx`) solo conoce
`{ free, pro }` y escribe «al día», y la app repite precios y textos a mano en
`frontend/src/services/billing.ts` («$99 MXN», `PLAN_NAMES`, `PRO_FEATURES`).

## Decisión

### Landing: `Pricing.tsx`

- Tres tarjetas: Reed Básico, Reed Pro (destacada: «Te leo tus libros») y Reed Biblioteca.
  Precio en USD con `config.plans[x].priceMonthly` y `currency`, y la opción anual. Viñetas desde
  `features`.
- Debajo, una línea: «Sin plan también puedes leer y escuchar los libros de Reed.»
- Sin «al día» en ningún texto.

### App: `billing.ts`

- `PlanId` del frontend: `'free' | 'basico' | 'pro' | 'biblioteca'`. `PLAN_NAMES` con «Sin plan»,
  «Reed Básico», «Reed Pro», «Reed Biblioteca».
- `PLAN_PRICES` por plan e intervalo (`USD 1 / mes`, `USD 10 / año`, …), en lugar de
  `PRO_PRICES`. `PLAN_FEATURES` por plan, iguales a `config.plans[x].features`.
- `USAGE_LABELS` dice «al mes». Agrega la etiqueta de libros guardados.
- `startCheckout(plan, interval)` manda `{ plan, interval }`. El tipo de `getUsage()` incluye
  `books: { used, limit }`.
- `isProPlan` pasa a `hasPaidPlan` (cualquier plan pagado activo). Actualizar sus usos.

### `PlanCard.tsx`

- Muestra el nombre del plan, la barra de **libros guardados** («2 de 3 libros») arriba de las
  demás, y las barras de uso con «este mes».
- Sin plan pagado: botón «Elegir plan» (abre el `UpgradeModal`). Con plan pagado: «Gestionar
  suscripción» (portal, como hoy).

### `UpgradeModal.tsx`

- Muestra el mensaje del límite (como hoy) y debajo las tres opciones con precio y una línea cada
  una. Elegir una llama `startCheckout(plan, "month")`.
- Si el usuario ya tiene un plan pagado, en lugar de las opciones: «Puedes cambiar de plan desde
  "Gestionar suscripción".» y el botón del portal.
- Tono de Reed: sin culpa ni apuro, sin «¡Mejora ya!».

## Criterios de aceptación

1. `grep -rn "MXN\|al día" src/components/marketing/Pricing.tsx frontend/src/services/billing.ts frontend/src/components/billing`
   vacío.
2. La landing muestra tres tarjetas con USD 1, USD 10 y USD 25.
3. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
