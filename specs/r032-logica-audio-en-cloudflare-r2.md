# Spec R-032 — El audio pregenerado vive en Cloudflare R2, no en Vercel Blob

> Estado: diseñado (15-oct-2026).
> Capa: LÓGICA. `scripts/generate-audiobook.mts` (solo la subida), `package.json` y
> `package-lock.json` (sale `@vercel/blob`, entra `aws4fetch`), `.env.example` (bloque de la
> biblioteca), `README.md` (sección «Máquina de audio»), `specs/R-PENDIENTES.md`.
> Depende de: R-029, R-031.
> Supera: el almacenamiento en Vercel Blob de R-029 y R-031. Las claves de `audio-library.ts`,
> `/api/tts` (R-030) y el resto del script no cambian.

> **En una frase:** el script de la máquina de audio sube los mp3 a un bucket público de
> Cloudflare R2, porque el plan Hobby de Vercel Blob no alcanza para el catálogo.

## Motivo

El 15-oct-2026, antes de crear el Blob, `npm run audio:generate -- --catalog --dry-run` midió
el catálogo: **3027 párrafos y 1 747 267 caracteres por voz**, unas 33 horas de audio (a 890
caracteres por minuto, R-028). VoiceStudio codifica el mp3 a 128 kbps
(`openai_compat.py`: `-b:a 128k`), así que una voz pesa ~1,9 GB.

Límites de Vercel Blob en Hobby (`vercel.com/docs/vercel-blob/usage-and-pricing`, revisado el
15-oct-2026): **1 GB** de almacenamiento, **2000** operaciones avanzadas al mes (cada `put()`
cuenta una), 10 000 simples y 10 GB de transferencia. Si se pasa uno, **Blob se bloquea 30
días**. Una sola voz pasa dos límites: 3027 subidas y ~1,9 GB. Pasar a Pro (USD 20/mes) choca
con la regla de Victor del 10-oct-2026: Reed sigue en Hobby y Vercel no entra en sus costos
(ver «Reed — credenciales del fork» en el vault).

Cloudflare R2 (`developers.cloudflare.com/r2/pricing/`, revisado el 15-oct-2026) da gratis
por mes **10 GB** de almacenamiento, **1 millón** de escrituras, **10 millones** de lecturas y
**salida sin costo**. Caben las dos voces (~3,8 GB) con margen.

R-029 ya dejó la lectura separada del proveedor: `/api/tts` solo hace `fetch` a
`REED_AUDIO_BASE_URL`. Cambiar de Blob a R2 toca **solo la subida**.

## Decisión

### Dependencias

- `npm uninstall @vercel/blob` (solo lo usaba la subida del script).
- `npm install aws4fetch`: firma pedidos S3 con `fetch`. Pesa unos KB, frente a
  `@aws-sdk/client-s3`, que trae decenas de paquetes para usar uno solo de sus comandos.
- **Excepción a la regla 1 del índice:** este spec va solo en su paso de la cadena.

### Subida en `scripts/generate-audiobook.mts`

- Cambia `put()` de `@vercel/blob` por un `PUT` firmado con `AwsClient` de `aws4fetch` a
  `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${audioKey(...)}`, con
  `Content-Type: audio/mpeg` y `Cache-Control: public, max-age=31536000, immutable`. La clave
  nunca cambia de contenido: si cambia la voz o el motor, cambia `libraryVersion` (R-029).
- Un `PUT` que no responde 200 cuenta como fallo del párrafo (mismo reintento que R-031).
- La revisión «ya existe» sigue siendo `HEAD` a `REED_AUDIO_BASE_URL` (R-031), sin cambios.
- Variables obligatorias para generar (no para `--dry-run`): `R2_ACCOUNT_ID`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` y `REED_AUDIO_BASE_URL`.
  `BLOB_READ_WRITE_TOKEN` deja de leerse.

### `.env.example`

Reemplaza el bloque de Blob de R-029 por:

```
# Pre-generated audio library (R-029..R-032). Cloudflare → R2 → create bucket `reed-audio`.
# Audio machine only: R2 → Manage API tokens → Object Read & Write on that bucket.
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=reed-audio
# Public URL of the bucket (Settings → Public access): the r2.dev URL to start, a custom
# domain for production. Set it on Vercel too so /api/tts serves the library (R-030).
REED_AUDIO_BASE_URL=
```

### `README.md` — sección «Máquina de audio (VoiceStudio)»

El paso 3 (Blob) pasa a: crear el bucket `reed-audio` en Cloudflare R2, activar el acceso
público (URL `r2.dev`), crear un token de API con lectura y escritura solo para ese bucket, y
poner las cinco variables en `.env.local` de la máquina de audio. `REED_AUDIO_BASE_URL` también
va en Vercel. Una línea explica por qué R2 y no Blob, con los números de arriba.

### `specs/R-PENDIENTES.md`

- La decisión abierta «espacio del Blob» se cierra: R2 aguanta las dos voces.
- Nueva decisión abierta: **dominio para el audio**. Cloudflare dice que la URL `r2.dev` «is
  rate-limited and should only be used for development purposes» y no tiene caché; en
  producción pide un dominio propio en Cloudflare. Va junto con la decisión del dominio del fork.
- V12 cambia «aparecen en el Blob» por «aparecen en el bucket R2».

## Criterios de aceptación

1. `grep -rn "@vercel/blob" package.json scripts src` no devuelve nada; `aws4fetch` está en
   `dependencies`.
2. `npm run audio:generate -- --catalog --dry-run` sigue funcionando solo con `DATABASE_URL`.
3. Sin `R2_*`, una corrida real sale con 1 y nombra las variables que faltan, antes de llamar a
   VoiceStudio.
4. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
