# Spec R-006 — El plan del usuario vive en Clerk y los límites dependen del plan

> Estado: diseño (07-oct-2026).
> Capa: LOGICA. `src/lib/plan.ts` (nuevo), `src/lib/usage.ts`, `src/app/api/usage/route.ts`.
> Depende de: R-001 (`config.plans`).

> **En una frase:** cada usuario tiene plan `free` o `pro`, guardado en la metadata pública de
> su cuenta de Clerk, y los límites diarios de uso salen de `config.plans[plan]` en vez de un
> solo número para todos.

## Motivo

Victor eligió «producto con cobro» y, a la vez, que la corrida de noche **no toque la base**:
la base Neon no puede cambiar de esquema sin supervisión. Clerk ya es el sistema de cuentas de
Reed y permite guardar datos por usuario (`publicMetadata`) sin migración. Ahí vive el plan.

`publicMetadata` es legible desde el navegador y **solo escribible desde el servidor** (con
`CLERK_SECRET_KEY`), así que un usuario no puede darse Pro a sí mismo.

## Decisión

### `src/lib/plan.ts`

```ts
export type PlanId = "free" | "pro";
export type PlanInfo = {
  plan: PlanId;
  status: "active" | "past_due" | "canceled" | "none";
  renewsAt: string | null;          // ISO
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};
export async function getPlan(userId: string): Promise<PlanInfo>;
export async function setPlan(userId: string, patch: Partial<PlanInfo>): Promise<void>;
export function isPro(info: PlanInfo): boolean; // plan === "pro" && status in (active, past_due)
```

- Lee y escribe `publicMetadata.reed` (un objeto, para no chocar con otras claves) con
  `clerkClient()` de `@clerk/nextjs/server`. `setPlan` mezcla con lo que ya hay
  (`updateUserMetadata`).
- Sin metadata → `{ plan: "free", status: "none", … null }`.
- **Caché en memoria** por usuario de 60 s para `getPlan` (cada request de la API lo consulta y
  Clerk tiene límite de llamadas). `setPlan` invalida la entrada del usuario.
- `past_due` cuenta como Pro: Stripe reintenta el cobro unos días y cortar al tiro sería hostil
  (el alma de marca: «nunca culpa ni apuro»).

### `src/lib/usage.ts`

- `usageLimits()` pasa a `usageLimits(plan: PlanId)`: por usuario, `config.plans[plan].limits`;
  las variables `LIMIT_*_PER_USER` siguen sobrescribiendo **solo** el plan `free` (compatibilidad
  con el deploy actual). Los topes globales (`LIMIT_*_GLOBAL`) quedan igual.
- `consumeUsage(userId, kind, amount)` mantiene su firma: adentro llama a `getPlan(userId)`.
  **Los usuarios Pro no cuentan para el tope global**: el tope global protege la cuota
  compartida de ElevenLabs del uso gratis, y quien paga la financia.
- `UsageLimitError` agrega `readonly plan: PlanId` y el mensaje para `free` dice en español que
  con Reed Pro el límite es mayor: «Llegaste al límite diario de <cosa> del plan gratis. Con Reed
  Pro tienes más.» Para `pro`: «Llegaste al límite diario de <cosa>. Vuelve mañana y seguimos.»
  Las etiquetas `LABELS` pasan a español.
- `usageSummary(userId)` devuelve además `plan`.

### `GET /api/usage`

Responde `{ usage, plan: { plan, status, renewsAt } }` (sin los ids de Stripe: no le sirven al
navegador).

### Errores

`handleRouteError` (`src/lib/http.ts`) ya mapea `UsageLimitError` → 429 con `err.message`; no se
toca. Si falta `CLERK_SECRET_KEY`, `getPlan` devuelve `free` y lo registra con `console.warn` una
sola vez (no rompe la API en local sin claves).

## Criterios de aceptación

1. Sin metadata, un usuario es `free` y sus límites son los de hoy (5 000 / 10 / 30 / 100).
2. Con `publicMetadata.reed = { plan: "pro", status: "active" }`, `usageLimits("pro")` devuelve
   los de `config.plans.pro.limits` y el tope global no se evalúa para ese usuario.
3. Las rutas que ya llaman a `consumeUsage` no cambian (verificar con `grep -rn consumeUsage src`).
4. `npx tsc --noEmit && npm run lint` verde.

## Fuera de alcance

Quién pone el plan en `pro`: el webhook de Stripe (R-010). Mostrar el plan en la app (R-019).
