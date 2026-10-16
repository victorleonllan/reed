# Spec R-037 — La máquina de audio atiende la cola, cuida el bucket y limpia lo huérfano

> Estado: diseñado (15-oct-2026).
> Capa: LÓGICA. `scripts/generate-audiobook.mts`, `README.md` (sección «Máquina de audio»).
> Depende de: R-036.

> **En una frase:** `npm run audio:generate -- --queue --watch` deja el PC generando los libros
> de los usuarios a medida que llegan, sin pasarse del espacio fijado en R2, y `--prune` borra el
> audio que ningún libro usa.

## Motivo

R-036 publica la cola. Falta quien la atienda. Victor teme que el uso «reviente» R2: además del
cupo de libros (R-035), la máquina se frena sola antes de un tope de espacio, y el audio de los
libros borrados se limpia.

## Decisión

### Modo `--queue`

- Pide `GET ${REED_APP_URL}/api/audio/queue` con `Authorization: Bearer ${REED_AUDIO_MACHINE_TOKEN}`.
  Ambas variables son obligatorias en este modo (sale con 1 nombrándolas si faltan).
- Genera cada libro de la respuesta con la voz que trae la respuesta, con el mismo flujo por
  párrafo de hoy (salta lo que ya existe, reintenta una vez).
- **Manifiesto:** si todos los párrafos del libro quedaron en R2, sube `bookManifestKey` (R-036)
  con el `BookManifest` en JSON (`Content-Type: application/json`, `Cache-Control: no-cache`).
  Si falló alguno, no lo sube: el libro vuelve a salir en la cola y la próxima pasada retoma.
- Los modos `--catalog` y `--book` también suben el manifiesto de cada libro completo.

### `--watch [minutos]`

Solo con `--queue`. Repite la consulta cada N minutos (por defecto 10) hasta Ctrl+C. Imprime una
línea por libro (`título — párrafos — minutos`) y una línea «cola vacía» con la hora.

### Tope de espacio

- Antes de cada libro, suma el tamaño del bucket con `ListObjectsV2` (firmado con `aws4fetch`,
  paginado por `continuation-token`).
- Si la suma pasa `R2_MAX_GB` (por defecto **9**, debajo de los 10 GB gratis), no genera más,
  imprime «Bucket en X GB, tope R2_MAX_GB = Y: no genero más. Sube R2_MAX_GB o corre --prune.» y
  sale con 2 (en `--watch`, espera a la próxima vuelta sin salir).

### `--prune [--yes]`

- Arma el conjunto de claves en uso: todos los párrafos de todos los `documents` con
  `status = "ready"` (catálogo en las dos voces, libros de usuarios en la voz por defecto) y el
  manifiesto de cada uno.
- Lista el bucket bajo `audio/${libraryVersion}/` y marca las claves que no están en uso. Como la
  clave es el hash del texto (R-029), un párrafo compartido por dos libros queda protegido
  mientras alguno exista.
- Sin `--yes` solo imprime cuántas claves y cuántos MB borraría. Con `--yes`, las borra con
  `DELETE` firmado.

### `README.md`

La sección «Máquina de audio» agrega: las variables `REED_APP_URL`, `REED_AUDIO_MACHINE_TOKEN` y
`R2_MAX_GB`; el comando de servicio `npm run audio:generate -- --queue --watch`; y `--prune`, una
vez al mes.

## Criterios de aceptación

1. `--queue` sin `REED_APP_URL` o sin `REED_AUDIO_MACHINE_TOKEN` sale con 1 antes de llamar a
   VoiceStudio.
2. `--prune` sin `--yes` no borra nada.
3. `--catalog --dry-run` sigue funcionando solo con `DATABASE_URL`.
4. `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint` verde.
