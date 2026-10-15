# Spec R-033 — Reed Pro deja de prometer conversación por voz

> Estado: diseñado (15-oct-2026).
> Capa: LÓGICA. `src/config.ts` (solo `plans.pro.features`), `src/lib/usage.ts` (solo
> `LABELS`), `src/lib/emails.ts` (solo la línea de `agent_session` del correo de Pro).
> Depende de: R-026.

> **En una frase:** la tarjeta de Reed Pro, el mensaje de límite y el correo de Pro dejan de
> decir «por voz», porque desde R-026 con Reed se conversa por escrito.

## Motivo

R-026 (15-oct-2026) quitó la voz del modo Compañero, pero su addenda «Bugs encontrados al
aplicar» dejó tres textos de la capa LÓGICA que la siguen prometiendo:

- `src/config.ts:54`, en `plans.pro.features`: «Conversa conmigo por voz el doble de veces».
  `Pricing.tsx` lo muestra en la tarjeta de Reed Pro de la landing.
- `src/lib/usage.ts:33`, en `LABELS`: `agent_session: "conversaciones por voz"`. Aparece en el
  mensaje que sale al llegar al límite.
- `src/lib/emails.ts:105`, en el correo de Pro: «conversamos por voz hasta N veces».

El límite `agent_session` **sigue existiendo**: lo consumen `/api/companion/signed-url` y
`/api/documents/[id]/signed-url` cada vez que se abre una conversación (ahora escrita) con el
agente de ElevenLabs. Por eso se cambian las palabras y se mantiene el límite.

## Decisión

| Archivo | Antes | Después |
|---|---|---|
| `src/config.ts` | `"Conversa conmigo por voz el doble de veces"` | `"Conversa conmigo el doble de veces"` |
| `src/lib/usage.ts` | `agent_session: "conversaciones por voz"` | `agent_session: "conversaciones con Reed"` |
| `src/lib/emails.ts` | `` `conversamos por voz hasta ${…} veces;` `` | `` `conversamos hasta ${…} veces;` `` |

No cambia ningún límite, ni precio, ni el resto de `features`. «Te leo en voz alta…» se queda:
la lectura en voz alta sigue existiendo.

## Criterios de aceptación

1. `grep -rn "por voz" src/config.ts src/lib/usage.ts src/lib/emails.ts` no devuelve nada.
2. `config.plans.pro.limits` queda idéntico.
3. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
