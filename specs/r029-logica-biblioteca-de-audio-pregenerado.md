# Spec R-029 — Biblioteca de audio pregenerado (claves y almacenamiento)

> Estado: aplicado (15-oct-2026) — `@vercel/blob` ^2.8.2; criterios 1-3 probados con tsx (misma clave con y sin espacios, otra para mauricio, `null` sin `REED_AUDIO_BASE_URL`, `/` final recortada); `tsc` raíz + frontend y `lint` verdes.
> Capa: LÓGICA. `package.json`, `package-lock.json` (solo `@vercel/blob`), `src/config.ts`
> (solo `readerVoices` y `localTts`), `src/lib/audio-library.ts` (nuevo), `.env.example`.
> Depende de: R-025 (`config.readerVoices`).
> Alimenta: R-030 y R-031.

> **En una frase:** define dónde vive el audio de un párrafo ya generado (Vercel Blob, en una
> ruta que se deduce del texto y la voz) para que el servidor y la máquina de audio lleguen al
> mismo archivo sin base de datos.

## Motivo

Victor, 15-oct-2026: implementar VoiceStudio (repo que recomendó Angel) «para poder bajar
costos y poder usar una máquina para crear los audios». Hoy cada párrafo leído cuesta ~0,44
créditos de ElevenLabs por carácter (~390 por minuto, R-025), y los créditos del plan Creator
vencen ~26-oct-2026.

Los libros del catálogo son texto fijo: su audio se puede generar **una vez**, en una máquina
propia con VoiceStudio (gratis, local), y servirse a todos los lectores. Este spec fija el
lugar común; R-031 lo llena y R-030 lo lee.

**Sin base de datos** (regla de la v2, `R-README.md`): la ruta del archivo se calcula del
texto, así nadie tiene que guardar «qué párrafo tiene audio».

## Decisión

### Dependencia

Agrega `@vercel/blob` (última versión estable) a `dependencies` con `npm install @vercel/blob`.
**Excepción a la regla 1 del índice:** este spec va solo en su paso de la cadena, así que el
`npm install` no pisa a otro agente. No instales nada más.

### `src/config.ts`

- Cada voz de `readerVoices` (R-025) gana `localProfile`: el nombre del perfil de voz en
  VoiceStudio que la reemplaza en el audio pregenerado.
  - `antonio` → `localProfile: "Reed Antonio"`
  - `mauricio` → `localProfile: "Reed Mauricio"`
- Nuevo bloque:

```ts
localTts: {
  // VoiceStudio engine used by the audio machine (R-031). See VoiceStudio docs/engines.
  model: "omnivoice",
  language: "es",
  // Bump to regenerate every file (new engine, new voice profiles) without deleting the old ones.
  libraryVersion: "v1",
},
```

### `src/lib/audio-library.ts` (nuevo)

- `normalizeForAudio(text)`: `text.trim()`. Es la única normalización; `/api/tts` ya recorta
  así el texto (R-025), y el lector manda el párrafo tal cual sale de `BookContent`.
- `audioKey(voice: ReaderVoice, text)`:
  `audio/<libraryVersion>/<voice>/<sha256 hex de normalizeForAudio(text)>.mp3`, con
  `createHash` de `node:crypto`.
- `libraryAudioUrl(voice, text)`: `${REED_AUDIO_BASE_URL}/${audioKey(...)}`, o `null` si la
  variable no está (sin biblioteca configurada todo sigue igual que hoy).
- `REED_AUDIO_BASE_URL` se lee sin `/` final.
- Sin imports de Next: el script de R-031 lo importa desde `tsx`.

### `.env.example`

```
# Pre-generated audio library (R-029..R-031). Vercel → Storage → Blob → create a public store.
# Read/write token: only the audio machine needs it (R-031). Not needed on Vercel.
BLOB_READ_WRITE_TOKEN=
# Public base URL of that store, e.g. https://<store-id>.public.blob.vercel-storage.com
# Set it on Vercel so /api/tts serves pre-generated audio before calling ElevenLabs (R-030).
REED_AUDIO_BASE_URL=
```

## Criterios de aceptación

1. `audioKey("antonio", "  Hola  ")` y `audioKey("antonio", "Hola")` dan la misma clave;
   `audioKey("mauricio", "Hola")` da otra.
2. Sin `REED_AUDIO_BASE_URL`, `libraryAudioUrl` devuelve `null`.
3. `grep -n "@vercel/blob" package.json` lo encuentra.
4. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
