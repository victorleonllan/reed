# Spec R-036 — Cola de audio: la máquina local genera los libros de los usuarios

> Estado: aplicado (15-oct-2026). Verificado: `npx tsc --noEmit`, `npx tsc --noEmit -p frontend` y `npm run lint` en verde; las rutas en ejecución quedan para V16.
> Capa: LÓGICA. `src/lib/audio-library.ts`, `src/app/api/audio/queue/route.ts` (nuevo),
> `src/app/api/documents/[id]/audio/route.ts` (nuevo), `.env.example` (bloque de la biblioteca).
> Depende de: R-034.
> Alimenta: R-037, R-040.

> **En una frase:** la app publica una lista de los libros de usuarios con plan de voz que
> todavía no tienen audio; la máquina de audio la consulta, los genera y marca cada libro
> terminado con un manifiesto en R2.

## Motivo

Victor, 15-oct-2026: la máquina local existe «para eliminar ElevenLabs y esos costos», también
en los libros que suben los usuarios. Hoy esos libros solo suenan con ElevenLabs (R-030).

Decisiones de diseño:

- **La máquina pide trabajo; nadie le manda.** El PC no se expone a internet: consulta una ruta
  de la app cada pocos minutos. Si está apagado, la cola espera.
- **Sin cambios en la base** (regla 3). «Terminado» no es una columna: es un archivo en R2,
  `audio/<libraryVersion>/<voz>/books/<documentId>.json`, que la máquina sube después del último
  párrafo. Si existe, el libro está completo.
- **Una sola voz para libros propios**: `config.defaultReaderVoice` (Antonio). Generar dos voces
  duplica GPU y espacio.

## Decisión

### `src/lib/audio-library.ts`

- `bookManifestKey(voice, documentId)` → `audio/${libraryVersion}/${voice}/books/${documentId}.json`.
- `bookManifestUrl(voice, documentId)`: `REED_AUDIO_BASE_URL` + clave, o `null`.
- `hasBookManifest(voice, documentId)`: `HEAD` con 3 s de tiempo máximo; `true` solo con 200.
- Tipo `BookManifest = { documentId, voice, libraryVersion, paragraphs, generatedAt }`.

### `GET /api/audio/queue` (nuevo)

- Autorización: `Authorization: Bearer <REED_AUDIO_MACHINE_TOKEN>`, comparado con
  `crypto.timingSafeEqual`. Sin la variable → 503 «audio machine not configured». Token
  incorrecto → 401. No usa Clerk.
- Busca en `documents`: `userId <> CATALOG_USER_ID` y `status = "ready"`, orden `createdAt`
  ascendente.
- Agrupa por dueño y pide `getPlan` una vez por dueño (`src/lib/plan.ts` ya cachea 60 s). Se
  queda con los dueños cuyo `activePlan` tiene `audioBooks`.
- Descarta los libros con `hasBookManifest(defaultReaderVoice, id)`.
- Responde `{ voice, books: [{ id, title, paragraphCount }] }`, como máximo 20 por pedido.
- `export const maxDuration = 60`.

### `GET /api/documents/[id]/audio` (nuevo)

Usuario con sesión y `findReadableDocument`. Responde `{ status }`:

- `"ready"`: existe el manifiesto en la voz por defecto (vale también para el catálogo cuando
  R-037 lo genere con manifiesto).
- `"catalog"`: es del catálogo y no hay manifiesto; el lector pide párrafo por párrafo como hoy.
- `"queued"`: es del usuario, su plan tiene `audioBooks` y no hay manifiesto.
- `"unavailable"`: es del usuario y su plan no tiene `audioBooks`.

### `.env.example`

Agrega al bloque de la biblioteca:

```
# Shared secret between the app and the audio machine (R-036). Any long random string; set the
# same value on Vercel and in the audio machine's .env.local.
REED_AUDIO_MACHINE_TOKEN=
```

## Criterios de aceptación

1. Sin `REED_AUDIO_MACHINE_TOKEN`, `GET /api/audio/queue` responde 503; con token incorrecto, 401.
2. La cola nunca devuelve libros del catálogo ni de dueños sin `audioBooks`.
3. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
