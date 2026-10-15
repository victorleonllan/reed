# Spec R-030 — `/api/tts` sirve primero el audio pregenerado

> Estado: aplicado (15-oct-2026) — tsc (raíz y frontend) y lint verdes; criterios 1-3 pendientes de verificar en ejecución (sin servidor ni Blob en esta tanda).
> Capa: LÓGICA. `src/app/api/tts/route.ts`.
> Depende de: R-025 (`voice` en el body), R-029 (`libraryAudioUrl`).

> **En una frase:** antes de pedirle audio a ElevenLabs, `/api/tts` busca el párrafo en la
> biblioteca pregenerada; si está, lo devuelve sin gastar créditos ni cupo del usuario.

## Motivo

R-029 define dónde vive el audio pregenerado y R-031 lo genera. Falta que el lector lo use. El
lector no cambia: sigue llamando a `POST /api/tts { text, voice }`. Decidir en el servidor
mantiene la caché del navegador de R-027 y el planificador de R-028 tal como están.

## Decisión

En `POST /api/tts`, después de validar `text` y `voice` y **antes** de `consumeUsage`:

1. `url = libraryAudioUrl(voice, input)`. Si es `null`, sigue el camino de hoy (ElevenLabs).
2. `fetch(url)` con timeout de 3 s (`AbortSignal.timeout(3000)`).
   - **200** → responde ese cuerpo con `Content-Type: audio/mpeg`, `Cache-Control: no-store`
     y `X-Reed-Audio: library`. **No** llama a `consumeUsage`: los límites de `tts_chars`
     existen para proteger la cuota de ElevenLabs, y este audio no la toca.
   - **404, otro estado o error de red** → sigue a ElevenLabs. Un error distinto de 404 se
     registra con `console.warn` (sin cortar la lectura).
3. El camino de ElevenLabs no cambia, salvo que agrega `X-Reed-Audio: elevenlabs`.

Sigue pidiendo sesión (`getUserId`) y respetando `MAX_TTS_CHARS` en ambos caminos.

## Criterios de aceptación

1. Sin `REED_AUDIO_BASE_URL`: el comportamiento es idéntico al de R-025 (mismo audio, mismo
   conteo de uso), más la cabecera `X-Reed-Audio: elevenlabs`.
2. Con la variable y un párrafo ya generado por R-031: responde audio con
   `X-Reed-Audio: library` y el uso `tts_chars` del usuario no sube.
3. Con la variable y un párrafo sin generar: responde con ElevenLabs y cuenta uso.
4. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
