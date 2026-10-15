# Spec R-025 — Dos voces para el lector

> Estado: diseñado (10-oct-2026).
> Capa: LÓGICA. `src/config.ts`, `src/lib/elevenlabs.ts`, `src/app/api/tts/route.ts`.
> Depende de: nada.
> Alimenta: R-027 y R-028.

> **En una frase:** la API de voz (`POST /api/tts`) acepta elegir entre dos voces latinas,
> Antonio y Mauricio, en vez de leer siempre con la única voz de `ELEVENLABS_VOICE_ID`.

## Motivo

Victor eligió el 10-oct-2026, escuchando muestras, dos voces masculinas de la biblioteca pública
de ElevenLabs: **Antonio** («más suave y pausado») y **Mauricio** («más estándar»), y pidió «esas
dos opciones para el lector». Las voces prediseñadas (Sarah, George…) son inglesas y en español
suenan a España; estas dos son de hablantes latinos. Las dos se pueden usar por API también en el
plan gratis de ElevenLabs, que es al que vuelve la cuenta el 26-oct-2026.

Hoy `textToSpeech()` lee siempre `ELEVENLABS_VOICE_ID`, así que elegir voz necesita este cambio
en el servidor antes que en la interfaz.

## Decisión

### `src/config.ts`

Agrega la lista de voces del lector. Los IDs de voz no son secretos (son públicos en la biblioteca
de ElevenLabs), por eso viven en `config` y no en variables de entorno:

```ts
readerVoices: {
  antonio: { label: "Antonio", voiceId: "htFfPSZGJwjBv1CL0aMD" },   // suave y pausado
  mauricio: { label: "Mauricio", voiceId: "94zOad0g7T7K4oa7zhDq" }, // más estándar
},
defaultReaderVoice: "antonio",
```

Exporta el tipo `ReaderVoice = keyof typeof config.readerVoices`.

### `src/lib/elevenlabs.ts`

- `textToSpeech(text, voiceId)` recibe la voz como parámetro y deja de leer
  `ELEVENLABS_VOICE_ID` por su cuenta.
- El modelo sigue siendo `eleven_multilingual_v2`. Medido el 10-oct-2026: 0,44 créditos por
  carácter, ~390 créditos por minuto de audio. `eleven_flash_v2_5` cuesta la mitad pero suena
  peor en lectura larga; cambiarlo es otra decisión, no de este spec.

### `src/app/api/tts/route.ts`

- Body: `{ text, voice? }`. `voice` es una clave de `config.readerVoices`.
- Sin `voice` → `config.defaultReaderVoice`. Si `ELEVENLABS_VOICE_ID` está definida, reemplaza
  solo el `voiceId` de la voz por defecto, para no romper despliegues que ya la usan.
- `voice` desconocida → 400 `Unknown voice. Use one of: antonio, mauricio`.
- Límites y conteo de uso (`consumeUsage(..., "tts_chars", ...)`) sin cambios.

## Criterios de aceptación

1. `POST /api/tts` con `{ "text": "Hola", "voice": "mauricio" }` responde audio; con
   `"voice": "pepe"` responde 400; sin `voice` lee con Antonio.
2. `grep -n "ELEVENLABS_VOICE_ID" src/lib/elevenlabs.ts` no devuelve nada.
3. `npx tsc --noEmit && npm run lint` verde.
