# Spec R-027 — Audio solo cuando lo pides, y nunca dos veces

> Estado: aplicado (15-oct-2026) — `tsc` raíz + frontend y `lint` verdes; criterios 1-3 (Red, voz, navegación privada) pendientes de probar en el navegador. Toca además `ReaderView.tsx` (pasa `voice: getReaderVoice()`, imprescindible por `voice` obligatorio).
> Capa: FRONTEND. `frontend/src/services/api.ts` (solo `synthesizeSpeech`),
> `frontend/src/services/readerVoices.ts` (nuevo), `frontend/src/services/audioCache.ts`
> (nuevo), `frontend/src/components/reader/ListenBar.tsx` (solo `useParagraphVoice`).
> Depende de: R-025 (la API acepta `voice`).
> Alimenta: R-028.

> **En una frase:** el motor de voz del lector genera audio solo para el párrafo que se pide,
> guarda en el navegador lo ya generado para no pagarlo otra vez, y lee con la voz elegida.

## Motivo

Victor, 10-oct-2026: «que ElevenLabs no genere el audio si no se lo pides, para no gastar
créditos de más». Revisando el código, el audio ya se genera solo al apretar Play, pero se gasta
de más por dos lados:

1. **Se paga dos veces lo mismo.** El audio de cada párrafo vive en memoria (`cacheRef`) y se
   pierde al recargar o cambiar de libro. Volver a escuchar un párrafo lo genera y lo cobra otra
   vez (~0,44 créditos por carácter).
2. **Se adelanta el párrafo siguiente** (`following`) apenas empieza a sonar el actual. Si el
   lector pausa, ese audio ya se pagó. Este spec deja el adelanto bajo control de quien llama;
   R-028 lo limita al tramo que el lector eligió.

## Decisión

### `services/readerVoices.ts` (nuevo)

- `READER_VOICES`: `antonio` («Antonio · suave y pausado») y `mauricio` («Mauricio · más
  estándar»). Las claves son las de `config.readerVoices` del servidor (R-025).
- `getReaderVoice()` / `setReaderVoice(voice)`: preferencia en `localStorage`
  (`reed.readerVoice`), por defecto `antonio`.

### `services/audioCache.ts` (nuevo)

- Usa Cache Storage (`caches.open('reed-audio-v1')`). Clave: una URL sintética
  `https://reed.local/audio/<voz>/<sha256 del texto>`, con `crypto.subtle.digest`.
- `getCachedAudio(voice, text)` → blob URL o `null`. `putCachedAudio(voice, text, blob)`.
- Tope de 300 audios: al guardar, si hay más, borra los más viejos (orden de `cache.keys()`).
  Un párrafo típico pesa ~100–300 KB, así que el tope ronda 30–90 MB.
- Si `caches` no existe (navegación privada, navegador viejo), todo sigue funcionando sin caché.

### `synthesizeSpeech(text, voice)`

- Busca primero en `audioCache`. Si está, devuelve el blob URL **sin llamar a la API**.
- Si no, `POST /api/tts { text, voice }`, guarda el blob en la caché y devuelve el blob URL.

### `useParagraphVoice`

- `speak(paragraph, { voice, rate, following?, onEnd, onError })`: `voice` nuevo y obligatorio.
- `following` se sigue precargando solo si quien llama lo pasa. No se precarga nada más.
- La caché en memoria se indexa por `voz + párrafo`, para que cambiar de voz no reproduzca el
  audio de la otra.
- La voz del navegador (respaldo sin sesión o sin cupo) usa `es-MX` en vez de `es-ES`: Victor
  quiere español neutro latino, no de España.

## Criterios de aceptación

1. Escuchar un párrafo, recargar y escucharlo de nuevo: la segunda vez no hay `POST /api/tts`
   en la pestaña Red.
2. Cambiar de voz y escuchar el mismo párrafo: sí hay una llamada nueva, con la otra voz.
3. En navegación privada (sin Cache Storage) el lector sigue sonando.
4. `npx tsc --noEmit -p frontend && npm run lint` verde.
