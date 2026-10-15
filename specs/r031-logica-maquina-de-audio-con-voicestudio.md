# Spec R-031 — Máquina de audio: generar los libros con VoiceStudio

> Estado: aplicado (15-oct-2026) — criterio 1 probado (sin `--catalog`/`--book` muestra el uso y sale con 1); falta de variables obligatorias sale con 1 antes de empezar (en `--dry-run` solo pide `DATABASE_URL`); criterio 3 por grep (sin `insert`/`update`/`delete`); `tsc` raíz + frontend y `lint` verdes. La corrida real contra la base y VoiceStudio queda en V11–V12.
> Capa: LÓGICA. `scripts/generate-audiobook.mts` (nuevo), `package.json` (solo `scripts`),
> `.env.example` (solo el bloque de VoiceStudio), `README.md` (sección nueva),
> `specs/R-PENDIENTES.md` (V11–V13 y una decisión).
> Depende de: R-029 (`audioKey`, `config.localTts`).

> **En una frase:** un comando que corre en una máquina propia, lee los libros del catálogo,
> genera el audio de cada párrafo con VoiceStudio y lo sube a la biblioteca de R-029.

## Motivo

Victor, 15-oct-2026: «usar una máquina para crear los audios». VoiceStudio
(`github.com/debpalash/VoiceStudio`, fork `victorleonllan/VoiceStudio`) es una alternativa local
y gratis a ElevenLabs. Su backend expone `POST /v1/audio/speech` en el puerto 3900, con el
formato de OpenAI: `voice` acepta el nombre de un perfil de voz.

La máquina puede ser el PC de Windows (si tiene GPU NVIDIA, usa CUDA) o el Mac M5 (Metal).
El script habla con VoiceStudio por HTTP, así que también puede correr en una máquina y usar
el VoiceStudio de otra por Tailscale.

**Licencia:** VoiceStudio es AGPL-3.0. Usarlo sin modificar para generar archivos no obliga a
publicar el código de Reed.

## Decisión

### `scripts/generate-audiobook.mts` (nuevo) y `npm run audio:generate`

`"audio:generate": "tsx scripts/generate-audiobook.mts"`. Carga `.env.local`/`.env` con
`dotenv`, igual que `scripts/seed-catalog.mts`.

Opciones:

- `--catalog` → todos los libros con `userId = CATALOG_USER_ID` y `status = "ready"`.
- `--book <documentId>` → un libro (repetible). `--catalog` o `--book` es obligatorio.
- `--voice <antonio|mauricio>` → por defecto `config.defaultReaderVoice`. Una voz por corrida.
- `--limit <n>` → corta tras `n` párrafos generados (para probar).
- `--dry-run` → no llama a VoiceStudio ni sube nada: cuenta párrafos, caracteres, cuántos ya
  existen y los créditos de ElevenLabs que se evitarían (`caracteres × 0,44`). Sin
  `REED_AUDIO_BASE_URL` no puede saber cuáles existen: lo dice y los cuenta todos como nuevos.

Variables:

- `DATABASE_URL` — **solo lectura**: un `select` de `documents`. El script no escribe en la base.
- `BLOB_READ_WRITE_TOKEN`, `REED_AUDIO_BASE_URL` (R-029).
- `VOICESTUDIO_URL` (por defecto `http://127.0.0.1:3900`) y `VOICESTUDIO_API_KEY` (opcional;
  si está, va como `Authorization: Bearer`). Falta una variable obligatoria → mensaje claro y
  salida 1, antes de empezar.

Por cada párrafo de cada capítulo, en orden y **de a uno** (la GPU es una sola):

1. `url = libraryAudioUrl(voice, paragraph)`. `HEAD url` → 200 = ya existe, se salta. Así el
   comando es **reanudable**: si se corta, se vuelve a correr igual.
2. `POST ${VOICESTUDIO_URL}/v1/audio/speech` con
   `{ model: config.localTts.model, input: normalizeForAudio(paragraph), voice: <localProfile de la voz>, response_format: "mp3", language: config.localTts.language }`.
   Timeout de 5 min por párrafo. Un fallo se reintenta una vez; si vuelve a fallar, se anota y
   sigue con el siguiente.
3. `put(audioKey(voice, paragraph), audio, { access: "public", addRandomSuffix: false, contentType: "audio/mpeg" })`.

Salida: una línea por capítulo (`Cap. 3 — 41/41 · 12 nuevos · 29 ya estaban`) y un resumen
final con generados, saltados, fallidos, caracteres y créditos evitados. Termina con código 1 si
hubo fallidos, para volver a correrlo.

### `.env.example`

```
# Audio machine only (R-031): where VoiceStudio's backend listens.
VOICESTUDIO_URL=http://127.0.0.1:3900
# Only when VoiceStudio has an API key set (remote access, e.g. over Tailscale).
VOICESTUDIO_API_KEY=
```

### `README.md` — sección «Máquina de audio (VoiceStudio)»

Paso a paso, en español neutro:

1. Instalar VoiceStudio (Windows: `irm https://voicestudio.sh/install | iex`; macOS:
   `curl -fsSL https://voicestudio.sh/install | sh`) y abrirlo; instalar el modelo OmniVoice
   cuando lo pida.
2. Crear dos perfiles de voz llamados **exactamente** `Reed Antonio` y `Reed Mauricio`
   (diseño de voz o clonación de una grabación **con permiso** de quien habla).
3. En Vercel: crear un Blob público, copiar el token a `.env.local` de la máquina de audio y la
   URL pública a `REED_AUDIO_BASE_URL` en `.env.local` **y** en Vercel.
4. `npm run audio:generate -- --catalog --dry-run`, después
   `npm run audio:generate -- --catalog --limit 5`, escuchar, y la corrida completa.
5. Qué hacer si se corta (volver a correr) y cómo regenerar todo (`libraryVersion`).

### `specs/R-PENDIENTES.md`

- **V11** (R-031) — `--dry-run` sobre el catálogo: anotar párrafos, caracteres y créditos.
- **V12** (R-031) — `--limit 5`: los 5 mp3 aparecen en el Blob y suenan bien en español.
- **V13** (R-030) — en el lector, un párrafo generado responde `X-Reed-Audio: library` y el
  uso de ElevenLabs no sube.
- Decisión abierta: **espacio del Blob**. Medir el tamaño real en V12 y proyectarlo a los 5
  libros antes de generar la segunda voz; revisar el límite del plan de Vercel.

## Criterios de aceptación

1. `npm run audio:generate` sin `--catalog` ni `--book` explica el uso y sale con 1.
2. `npm run audio:generate -- --catalog --dry-run` sin `BLOB_READ_WRITE_TOKEN` ni VoiceStudio
   igual funciona (solo necesita `DATABASE_URL`) y no sube nada.
3. El script no contiene `insert`, `update` ni `delete` sobre la base.
4. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
