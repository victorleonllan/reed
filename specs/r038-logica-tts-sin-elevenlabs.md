# Spec R-038 — `/api/tts` deja de usar ElevenLabs salvo que se active a mano

> Estado: diseñado (15-oct-2026).
> Capa: LÓGICA. `src/app/api/tts/route.ts`, `.env.example` (una variable).
> Depende de: R-034.
> Alimenta: R-040.

> **En una frase:** si el párrafo no está en la biblioteca de R2, `/api/tts` responde 404
> `audio_not_generated` y el lector usa la voz del navegador; ElevenLabs solo lee si
> `TTS_FALLBACK=elevenlabs`.

## Motivo

Victor, 15-oct-2026: la máquina local existe «para eliminar ElevenLabs y esos costos». Hoy
`/api/tts` cae a ElevenLabs con cada párrafo que no está en R2 (R-030). El 26-oct-2026 se
cancela el plan Creator: después de esa fecha ese camino se queda sin créditos de todas formas.

Se deja la variable para la transición: mientras el catálogo no esté generado, Victor puede
activarla en Vercel y apagarla cuando termine la máquina.

## Decisión

- Flujo: biblioteca (sin cambios, R-030) → si no está:
  - `TTS_FALLBACK === "elevenlabs"`: el camino de hoy (`consumeUsage("tts_chars")` +
    `textToSpeech`), con los topes de R-034/R-035.
  - Cualquier otro valor o sin variable: **404** `{ error: "Este párrafo todavía no tiene mi
    voz.", code: "audio_not_generated" }`. No gasta uso ni llama a ElevenLabs.
- `.env.example`: `TTS_FALLBACK=` con el comentario «Set to `elevenlabs` to read paragraphs that
  are not in the R2 library with ElevenLabs (costs credits). Empty: the reader falls back to the
  browser voice.»

## Criterios de aceptación

1. Sin `TTS_FALLBACK`, `src/app/api/tts/route.ts` no llama a `textToSpeech` ni a `consumeUsage`
   cuando el párrafo no está en la biblioteca.
2. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
