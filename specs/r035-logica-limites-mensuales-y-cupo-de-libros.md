# Spec R-035 — Límites por mes y cupo de libros guardados

> Estado: diseñado (15-oct-2026).
> Capa: LÓGICA. `src/lib/usage.ts`, `src/app/api/documents/route.ts` (solo el POST),
> `src/app/api/usage/route.ts`.
> Depende de: R-034.
> Alimenta: R-039, R-040.

> **En una frase:** el uso se cuenta en 30 días móviles con los topes de cada plan, y un usuario
> no puede tener más libros propios guardados que los que da su plan: para subir otro, borra uno.

## Motivo

Hoy `usage.ts` cuenta 24 h móviles (`WINDOW_MS`, línea 8), así que un usuario gratis puede subir
10 libros cada día y pedir 100 respuestas diarias (~USD 9 al mes en ElevenLabs). Además nada
limita cuántos libros guarda un usuario: con la voz local (R-036), cada libro son ~380 MB en R2 y
horas de GPU. Victor, 15-oct-2026: «el tier que permite el uso de voz en libros debe tener una
cantidad de libros guardados, por ejemplo 3. Si quieres otro libro debes borrar uno».

## Decisión

### `src/lib/usage.ts`

- `WINDOW_MS` = 30 días. Comentarios: «rolling 30-day window».
- El plan sale de `activePlan(info)` (R-034), con los cuatro `PlanId`. Los límites por usuario
  salen de `config.plans[plan].limits`. Las variables `LIMIT_*_PER_USER` dejan de leerse.
- **Tope global para todos los planes** (ya no se salta para Pro), por mes, sobreescribible con
  las mismas variables `LIMIT_*_GLOBAL`. Valores por defecto: `tts_chars` 131 000 (el cupo mensual
  del plan Creator), `upload` 2000, `agent_session` 5000, `ai_request` 30 000. Protege la cuenta
  de ElevenLabs aunque haya muchos usuarios pagando.
- `UsageLimitError`, mensajes (español neutro, tono de Reed, sin culpa):
  - global: «Este mes se agotó el presupuesto de {etiqueta} de Reed. Vuelvo a estar disponible
    pronto.»
  - plan `free`: «Para {etiqueta} necesitas un plan. Reed Básico cuesta USD 1 al mes.»
  - `basico`: «Llegaste al límite de {etiqueta} de este mes. Con Reed Pro tienes más.»
  - `pro`: igual, pero «Con Reed Biblioteca tienes más.»
  - `biblioteca`: «Llegaste al límite de {etiqueta} de este mes.»
- Nueva `countSavedBooks(userId)`: cuenta `documents` del usuario con `status` distinto de
  `failed`. Nueva `BookSlotsFullError(limit, plan)`, con mensaje:
  - `limit` 0: «Para guardar tus libros necesitas un plan. Reed Básico cuesta USD 1 al mes.»
  - si no: «Ya tienes {limit} libros guardados, el máximo de tu plan. Borra uno para subir otro.»
- `usageSummary` agrega `books: { used, limit }` y devuelve `plan` con el `PlanInfo` y
  `activePlan`.

### `POST /api/documents`

Antes de `consumeUsage(userId, "upload")`: si `countSavedBooks(userId) >= limits.books` →
**409** con `{ error: <mensaje>, code: "book_slots_full", limit }`. El 409 no abre el aviso de
límite del frontend, que solo escucha 429 (R-040 lo muestra junto al botón de subir).

### `GET /api/usage`

Devuelve el `usageSummary` nuevo sin cambiar las claves que ya existen.

## Criterios de aceptación

1. `WINDOW_MS` es 30 días y `grep -n "LIMIT_.*_PER_USER" src/lib/usage.ts` vacío.
2. Con `books` = 3 y 3 libros guardados, el POST responde 409 `book_slots_full` sin insertar fila
   ni gastar `upload`.
3. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
