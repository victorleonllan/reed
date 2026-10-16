# Spec R-040 — El lector avisa el estado de la voz de tus libros, y subir respeta el cupo

> Estado: aplicado (15-oct-2026). Verificado: `npx tsc --noEmit`, `npx tsc --noEmit -p frontend` y `npm run lint` verdes; en ejecución, pendiente V15 y V16.
> Capa: FRONTEND. `frontend/src/services/api.ts`, `frontend/src/components/reader/ListenBar.tsx`,
> `frontend/src/components/reader/ReaderView.tsx`, `frontend/src/components/library/UploadBookModal.tsx`.
> Depende de: R-035, R-036, R-038.

> **En una frase:** al abrir un libro propio, el lector dice si su voz está lista, en
> preparación o fuera del plan, y usa la voz del navegador mientras tanto; subir un libro con el
> cupo lleno explica que hay que borrar uno.

## Motivo

Con R-036 y R-038, la voz de un libro propio llega horas después de subirlo (la máquina de audio
lo genera) y `/api/tts` responde 404 `audio_not_generated` mientras tanto. Hoy `ListenBar`
(líneas 82–85) pasa en silencio a la voz del navegador ante cualquier error: el usuario no sabe
por qué suena distinto. Y R-035 hace que subir con el cupo lleno responda 409.

Victor no eligió qué escucha el usuario mientras se genera su libro. Este spec usa la voz del
navegador con un aviso, porque es la única opción que no cuesta y no deja al usuario sin
lectura. Si Victor prefiere otra, va en un spec nuevo.

## Decisión

### `api.ts`

- `getBookAudioStatus(documentId)` → `GET /api/documents/{id}/audio` (R-036).
- `synthesizeSpeech`: un 404 con `code: "audio_not_generated"` lanza un error reconocible
  (`AudioNotGeneratedError`).
- `uploadBook`: un 409 con `code: "book_slots_full"` lanza `BookSlotsFullError` con el mensaje
  del servidor.
- `REED_LIMIT_MESSAGE` pasa de «Por hoy…» a «Llegamos al límite de respuestas de Reed de este
  mes.»

### Lector (`ReaderView.tsx` + `ListenBar.tsx`)

- Al abrir un libro, pide `getBookAudioStatus`. Arriba de los controles de escucha, una línea
  según el estado:
  - `queued`: «Estoy preparando mi voz para tu libro. Mientras tanto te leo con la voz de tu
    navegador.»
  - `unavailable`: «Con Reed Pro te leo tus libros con mi voz. Por ahora te leo con la voz de tu
    navegador.» con un enlace que abre el `UpgradeModal` (evento `reed:limit` sin mensaje de
    límite, o el mecanismo que ya use la app).
  - `ready` y `catalog`: nada.
- `ListenBar`: con `AudioNotGeneratedError` pasa a la voz del navegador como hoy, pero sin
  tratarlo como falla (sin mensaje de error). Con `queued` o `unavailable` usa la voz del
  navegador desde el primer párrafo, sin pedir `/api/tts`.

### `UploadBookModal.tsx`

Con `BookSlotsFullError`, muestra el mensaje en el modal (no un toast que se va) y un botón
«Ver mis libros» que cierra el modal y deja la biblioteca a la vista para borrar uno.

## Criterios de aceptación

1. Con `status: "queued"`, escuchar un libro propio no hace ningún `POST /api/tts`.
2. Un 409 `book_slots_full` al subir deja el mensaje visible en el modal.
3. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
