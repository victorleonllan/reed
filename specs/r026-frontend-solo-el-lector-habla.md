# Spec R-026 — Solo el lector habla

> Estado: aplicado (15-oct-2026) — criterios 1, 2 y 4 verificados (tsc raíz, tsc frontend y
> lint en verde); el 3 queda abierto solo en `src/config.ts` y `src/lib/usage.ts`, ver addenda.
> Capa: FRONTEND. `frontend/src/components/reed/modes/CompanionMode.tsx`,
> `frontend/src/components/reed/VoiceChat.tsx` (se borra), `frontend/src/services/voice.ts`
> (se borra), `frontend/src/services/billing.ts`, `src/components/marketing/Pricing.tsx`,
> `src/app/(marketing)/tos/page.tsx`, `src/app/(marketing)/privacy-policy/page.tsx`.
> Supera: R-015 entero (conversación por voz en el modo Compañero).
> Depende de: nada.

> **En una frase:** Reed solo usa voz para leer en voz alta en el modo Lector; el modo Compañero
> deja de tener conversación por voz y se queda con lo que ya hace por escrito.

## Motivo

Victor, 10-oct-2026: «no debe haber voz en otro modo que no sea el lector». Dos razones:

- **Costo.** Cada minuto de voz de ElevenLabs se paga (~390 créditos por minuto de audio leído,
  medido el 10-oct-2026; la conversación por voz se cobra aparte por minuto). La cuenta tiene
  131 000 créditos al mes, unas 5,5 horas de audio en total. La voz se reserva para lo que la
  necesita: escuchar el libro.
- **Foco.** El Compañero ya responde por escrito (dato curioso, resúmenes de párrafo, capítulo y
  sesión) con el agente de texto, que cuesta ~19 créditos por respuesta.

## Decisión

### Modo Compañero

- Se quita el botón «Hablar con Reed» y el panel `VoiceChat`. Todo lo demás del modo (dato
  curioso, resúmenes) queda igual.
- Se borran `VoiceChat.tsx` y `services/voice.ts`: nadie más los usa. `MAX_PASSAGE_CHARS` deja
  de importarse.
- La dependencia `@elevenlabs/react` se queda en `package.json`: la regla de la cadena prohíbe
  instalar o desinstalar. Sacarla queda en `R-PENDIENTES.md`.

### Textos que prometen voz fuera del lector

- `services/billing.ts`: quitar «Conversa conmigo por voz el doble de veces» de `PRO_FEATURES`.
  En `USAGE_LABELS`, `agent_session` deja de mostrarse en la vista de uso (el tipo se queda,
  porque el servidor lo sigue devolviendo).
- `Pricing.tsx` (landing): quitar la línea «N conversaciones por voz con Reed al día».
- Términos (`tos`): donde dice que Reed «conversa contigo», queda «responde preguntas sobre los
  libros y documentos que subes»; en límites, quitar «conversaciones por voz».
- Privacidad: «Las conversaciones que tienes conmigo, por escrito o por voz» → «Las preguntas que
  me haces y mis respuestas». En ElevenLabs: «la voz con la que te leo y la IA que responde tus
  preguntas».

### Lo que no cambia (servidor)

Las rutas `/api/documents/:id/signed-url` y `/api/companion/signed-url`, el webhook de
transcripciones y la creación de un agente por libro al subirlo siguen en el servidor (capa
LÓGICA). Que la subida deje de crear ese agente ahorra ~1 minuto por subida, pero es otro spec:
queda como decisión abierta en `R-PENDIENTES.md`.

## Criterios de aceptación

1. En el modo Compañero no aparece ningún botón ni panel de voz, y la app nunca pide micrófono.
2. `grep -rn "VoiceChat\|services/voice" frontend/src` no devuelve nada.
3. `grep -rni "conversaciones por voz\|conversa conmigo por voz" frontend/src src` no devuelve
   nada.
4. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.

## Bugs encontrados al aplicar (15-oct-2026)

- **El criterio 3 no se cumple con los archivos declarados.** El grep también encuentra:
  - `src/config.ts:38`, «Conversa conmigo por voz el doble de veces» en `plans.pro.features`.
    `Pricing.tsx` muestra esa lista (`pro.features.map`), así que la landing **sigue prometiendo
    voz** en la tarjeta de Reed Pro. No se tocó: `src/config.ts` es de R-025, que corre en paralelo
    en la misma tanda.
  - `src/lib/usage.ts:33`, la etiqueta «conversaciones por voz» del mensaje de límite del
    servidor (capa LÓGICA, fuera de este spec).
  Hace falta un spec LÓGICA chico que quite esa línea de `plans.pro.features` y decida qué hacer
  con la etiqueta de `usage.ts`.
- `USAGE_LABELS` pasó a `Partial<Record<UsageKind, string>>`: con `Record` completo no se puede
  omitir `agent_session` sin romper el tipo, y así `PlanCard.tsx` sigue igual (salta las claves
  sin etiqueta).

