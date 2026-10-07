# Spec R-015 — Hablar con Reed por voz sobre el pasaje que lees

> Estado: aplicado (07-oct-2026) — `npx tsc --noEmit`, `npx tsc --noEmit -p frontend` y `npm run lint` verdes; conversación real pendiente (V3).
> Capa: FRONTEND. `frontend/src/components/reed/VoiceChat.tsx` (nuevo),
> `frontend/src/services/voice.ts` (nuevo),
> `frontend/src/components/reed/modes/CompanionMode.tsx`, `frontend/src/services/api.ts` (solo
> exportar `apiFetch`).
> Depende de: R-001 (`@elevenlabs/react`), R-009 (`CompanionMode` ya sin datos inventados).

> **En una frase:** desde el modo Compañero, «Hablar con Reed» abre una conversación de voz en
> vivo con el agente de ElevenLabs del libro abierto, que sabe en qué pasaje vas.

## Motivo

Es la promesa central de Reed («convertimos la lectura en una conversación») y el backend ya la
tiene lista: `GET /api/documents/:id/signed-url` (agente del documento) y
`GET /api/companion/signed-url` (agente general). El `README.md` lo deja escrito: «Live voice
conversation isn't in the frontend yet» y explica cómo agregarla. Este spec lo hace.

## Decisión

### `services/voice.ts`

- `getVoiceSignedUrl(book)`: si `book.documentId` → `/api/documents/${id}/signed-url`; si no
  (libro de ejemplo sin backend) → `/api/companion/signed-url`. Usa el `apiFetch` de
  `services/api.ts`, que hoy no está exportado: este spec le agrega el `export` y no cambia nada
  más de ese archivo.
- Errores: 429 → «Por hoy llegamos al límite de conversaciones. Mañana seguimos.»; 409 → «Este
  libro todavía se está preparando. Prueba en un minuto.»; otro → mensaje genérico.

### `VoiceChat`

- Usa `@elevenlabs/react` como dice `README.md`: `<ConversationProvider>` +
  `useConversation()`; `startSession({ signedUrl, dynamicVariables: { passage, book_title } })`.
  `passage` es el texto del párrafo actual (o del primero visible), recortado a ~1 500
  caracteres; `book_title` el título. Antes de escribir, leer los tipos instalados en
  `frontend/node_modules/@elevenlabs/react` para usar la API real de la versión instalada.
- Pide permiso de micrófono solo al tocar «Hablar con Reed», nunca al montar.
- Estados visibles: conectando («Despertando a Reed…»), escuchando (onda de voz con las 5
  barras `animate-wave-*`, en color `reed`), Reed hablando (la onda en `ambar`), terminado. Un
  botón grande «Terminar» siempre visible. Indicador de silencio del micrófono.
- Si el usuario cambia de párrafo con la conversación abierta, manda una actualización de
  contexto (`sendContextualUpdate` o el equivalente de la versión instalada) con el pasaje
  nuevo: el prompt del agente ya la espera (`ai-agents/reading-companion-agent.md`).
- Al cerrar el panel o desmontar, termina la sesión (no dejar el micrófono abierto).
- Sin micrófono o permiso denegado: «Necesito tu micrófono para conversar. Puedes darme permiso
  en la barra del navegador.»

### En `CompanionMode`

Un botón destacado «Hablar con Reed» arriba del contenido del modo, que despliega `VoiceChat`
dentro del panel. Solo con sesión (`isBackendSession()`); en modo demo, el botón aparece
deshabilitado con «Entra con tu cuenta para conversar con Reed».

## Criterios de aceptación

1. Ningún permiso de micrófono se pide antes del clic.
2. La sesión se cierra al terminar, al cerrar el panel y al desmontar.
3. Los errores 429 y 409 muestran sus mensajes.
4. `npx tsc --noEmit -p frontend && npm run lint` verde.
5. **V3 (en ejecución, la mañana):** conversación real con claves de ElevenLabs en un libro del
   almacén.

## Fuera de alcance

- Transcripciones y notas guardadas por el agente (el webhook ya existe en el backend).
- Cambiar el prompt o la voz del agente.
