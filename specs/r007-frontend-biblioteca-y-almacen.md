# Spec R-007 — Biblioteca y almacén: portadas, estados vacíos y subida

> Estado: diseño (07-oct-2026).
> Capa: FRONTEND. `frontend/src/components/library/LibraryView.tsx`,
> `frontend/src/components/library/BookCard.tsx`,
> `frontend/src/components/library/UploadBookModal.tsx`,
> `frontend/src/components/catalog/CatalogView.tsx`,
> `frontend/src/components/ui/BookCover.tsx` (nuevo).
> Depende de: R-003 (tokens, `Button`, `Surface`, `Badge`, `ProgressBar`), R-004
> (`ReedCharacter`).

> **En una frase:** la biblioteca y el almacén dejan de ser listas de tarjetas planas y pasan a
> verse como una estantería: portadas generadas para cada libro, «sigue leyendo» arriba, estados
> vacíos con Reed y una subida de archivos clara.

## Motivo

Es lo primero que ve un usuario con sesión. Hoy los libros no tienen portada (solo
`coverAccent`), el «dónde quedaste» compite con el resto y la subida no explica qué formatos
acepta hasta que falla.

## Decisión

### `BookCover` (nuevo)

Portada **generada** cuando el libro no trae imagen: proporción 2:3, color de fondo derivado de
`book.coverAccent` o, si no hay, de un hash estable del `book.id` sobre una paleta de 6 tonos
de la marca (salvia, arcilla, ámbar, tinta, junco, papel oscuro). Título en Literata, autor en
Atkinson, y la **línea vertical del junco** como lomo (`.reed-line` de R-003). Tamaños `sm`,
`md`, `lg`. Sin degradados violeta/cian ni íconos de chispas.

### Biblioteca (`LibraryView`, `BookCard`)

- Arriba, si hay un libro en curso: bloque **«Sigue leyendo»** con portada grande, título,
  `whereYouLeftOff`, progreso (`ProgressBar`) y dos botones: «Seguir leyendo» y «Escuchar»
  (este último usa el `onPlayBookAudio` que ya existe).
- Debajo, la grilla de libros: 2 columnas en móvil, 3-4 en escritorio, `BookCover` + título +
  autor + progreso. Hover/focus con elevación suave (`shadow-2`), sin saltos de layout.
- Filtros por estado (Todos · Leyendo · Sin empezar · Terminados) como segmento, si la lista
  tiene más de 4 libros.
- **Estado vacío:** `ReedCharacter mode="librarian" size="lg"` (de R-004, sin marco) y la
  copia «Tu estantería está vacía. Sube un libro o elige uno del almacén.», con botones a las
  dos acciones.

### Almacén (`CatalogView`)

Misma grilla con `BookCover`, más un botón por libro: «Agregar» o «En tu biblioteca ✓» (un
check de texto, no emoji de chispas) y «Leer». Encabezado corto que explique qué es el almacén:
«Libros de dominio público para empezar. Reed ya los leyó.»

### Subida (`UploadBookModal`)

- Zona de arrastrar y soltar con estados: reposo, arrastrando encima, subiendo (progreso
  indeterminado con la línea del junco), error.
- Dice antes de subir lo que acepta: EPUB, PDF, TXT, MD o HTML, hasta 4 MB (los límites del
  backend, `README.md` → API).
- Errores en español y sin culpa: 413 → «Ese archivo pasa de 4 MB. Prueba con uno más
  liviano.»; 415 → «Ese formato no lo leo todavía…»; 429 → el mensaje del servidor.
- Mantiene su API de props: `LibraryView` y `App.tsx` no cambian su forma de usarlo.

## Criterios de aceptación

1. Todo libro sin imagen se ve con `BookCover`; dos libros distintos sin `coverAccent` dan
   colores estables (mismo id → mismo color en cada carga).
2. La biblioteca vacía muestra el estado vacío con las dos acciones.
3. `UploadBookModal` muestra formatos y tamaño antes de elegir archivo.
4. `npx tsc --noEmit -p frontend && npm run lint` verde.
5. No se tocó `App.tsx` ni `AccountContext.tsx`.

## Fuera de alcance

El encabezado y la navegación (R-013). Buscar libros en internet.
