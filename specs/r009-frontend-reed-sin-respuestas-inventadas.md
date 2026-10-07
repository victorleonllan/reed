# Spec R-009 — Reed sin datos inventados: los modos usan la IA real

> Estado: diseño (07-oct-2026).
> Capa: FRONTEND. `frontend/src/components/reed/modes/CompanionMode.tsx`,
> `frontend/src/components/reed/modes/TeacherMode.tsx`,
> `frontend/src/components/reed/modes/SessionTestFlow.tsx`, `frontend/src/services/api.ts`.
> Depende de: R-002 (los modos en archivos propios).

> **En una frase:** los resúmenes, datos curiosos, pistas del profesor y el test de sesión
> dejan de ser texto fijo sobre *Cien años de soledad* y salen de los endpoints de Reed
> (`/api/ai/explain`, `/summarize`, `/quiz`) con el libro que el usuario está leyendo.

## Motivo

En la v1 (hackathon) varias partes del panel muestran texto escrito a mano sobre Macondo, los
gitanos y los imanes, sin importar el libro abierto. El catálogo real son cinco libros de
dominio público (Ramón y Cajal, Reclus, Michelet, Ingenieros, Rodó): con cualquiera de ellos,
el panel miente. Un producto con cobro no puede mostrar respuestas falsas.

El backend ya tiene lo necesario (`README.md` → API): `explainParagraph`, `summarizeChapter` y
`generateQuiz` en `services/api.ts` llaman a `/api/ai/*` cuando hay sesión.

## Decisión

### Regla general

- Nada se pide solo: **cada llamada a la IA la dispara el usuario** con un botón (gasta su cuota
  diaria de «respuestas de Reed», `src/lib/usage.ts`). Mientras carga, un estado de espera con
  la voz de Reed («Déjame pensarlo…») y la línea del junco animada; al terminar, el texto en
  Literata.
- Los resultados se guardan en memoria por (libro, capítulo/párrafo) mientras el panel vive:
  volver a la pestaña no vuelve a gastar.
- Errores: el mensaje que ya devuelve `reedErrorMessage` (429 incluido).

### Compañero (`CompanionMode`)

- **Datos curiosos:** botón «Cuéntame algo curioso». Llama a `explainParagraph(textoDelPárrafo
  ActualOPrimeroDelCapítulo, "Cuéntame un dato curioso y breve sobre este pasaje, su época o su
  autor. Dos o tres frases, sin inventar.")`. Si el libro trae `curiosities`, se muestran
  primero, sin llamada.
- **Resúmenes:** los tres alcances se quedan (párrafo · capítulo · sesión):
  - Párrafo: `explainParagraph(párrafo, "Resume este párrafo en una o dos frases.")`; sin
    párrafo seleccionado, el texto actual «Toca cualquier párrafo…».
  - Capítulo: `summarizeChapter(título, textoDelCapítulo)` con los párrafos del capítulo
    actual (de `book.chapters`), recortado a ~12 000 caracteres desde el inicio del capítulo
    hasta la posición actual (no adelantar lo que no leyó).
  - Sesión: `summarizeChapter("Esta sesión", textoEntre sessionStats.startParagraphOrder y
    endParagraphOrder)`. Sin párrafos leídos todavía: «Lee un poco y te cuento lo que llevamos.»
- Se borra todo texto fijo sobre Macondo, gitanos, imanes y el junco como dato curioso de
  relleno.

### Profesor (`TeacherMode`)

El método socrático (tres niveles: pista → pregunta de razonamiento → explicación directa) se
mantiene, pero sobre lo que el usuario pregunta del pasaje real:

- Campo «¿Qué no te queda claro?» (ya existe `socraticQuery`).
- Nivel 1: `explainParagraph(párrafo, "Dame solo una pista, sin la respuesta, para que yo llegue
  solo a esto: " + duda)`.
- Nivel 2: «Hazme una pregunta que me ayude a razonarlo, sin darme la respuesta: …».
- Nivel 3: `explainParagraph(párrafo, duda)` (explicación completa).
- Botones «Otra pista» / «Explícamelo ya» avanzan de nivel. Sin la pregunta fija de Macondo.

### Test de sesión (`SessionTestFlow`)

- Las preguntas salen de `generateQuiz(título, textoLeídoEnLaSesión)`; mientras cargan, el
  estado de espera. Se mantiene el flujo actual (una pregunta por vez, explicación al responder,
  puntaje, `onQuizComplete`).
- Si el texto leído en la sesión es muy corto (< 600 caracteres), en vez del test: «Todavía
  leímos poco juntos. Sigue un rato y te pongo a prueba.»

### `services/api.ts`

- Los **fallbacks de modo demo** (sin sesión) dejan de hablar de Macondo: respuestas genéricas,
  honestas y cortas en la voz de Reed («En modo demo no puedo leer este libro contigo. Entra con
  tu cuenta y te lo explico de verdad.»). El quiz demo devuelve 2 preguntas sobre cómo usar Reed
  (sus modos), no sobre un libro.
- No cambia la firma de ninguna función exportada.

## Criterios de aceptación

1. `grep -rniE "macondo|gitanos|melqu[ií]ades|buend[ií]a|cañabrava" frontend/src` no devuelve
   nada.
2. Ninguna llamada a `/api/ai/*` se hace al montar un componente: todas salen de un `onClick`
   (verificable leyendo los `useEffect` de los tres modos).
3. El resumen de capítulo nunca incluye párrafos posteriores a la posición actual.
4. `npx tsc --noEmit -p frontend && npm run lint` verde.

## Fuera de alcance

- La conversación por voz (R-015) y el modo Bibliotecario (su búsqueda local sobre la biblioteca
  es real; se queda).
- Cambiar los prompts del backend (`src/lib/reed-ai.ts`).
