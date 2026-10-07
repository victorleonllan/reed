# Spec R-018 — Blog de Reed con tres artículos

> Estado: aplicado (07-oct-2026). Verificado: `npx tsc --noEmit`, `npx tsc --noEmit -p frontend` y `npm run lint` en verde; tres artículos de 588-606 palabras; `/blog` y `/blog/<slug>` sin probar en ejecución (la cadena no levanta servidores).
> Capa: FRONTEND. `src/lib/blog.ts` (nuevo), `src/app/(marketing)/blog/page.tsx` (nuevo),
> `src/app/(marketing)/blog/[slug]/page.tsx` (nuevo),
> `src/components/marketing/ArticleCard.tsx` (nuevo).
> Depende de: R-012 (`(marketing)/layout.tsx`), R-017 (`getSEOTags`, `sitemap.ts` ya lista `/blog`).

> **En una frase:** un blog estático, sin base de datos, con tres artículos escritos con la voz
> de Reed, para que la landing tenga contenido que Google pueda encontrar.

## Motivo

El SEO de un producto de lectura vive de contenido sobre leer. ShipeaRapido trae un blog estático
(`~/projects/shipearapido/app/blog/` y `app/blog/_assets/content.js`, **solo lectura**): los
artículos son datos en código, no filas de una base. Se toma ese patrón, simplificado (sin
autores ni categorías múltiples).

## Decisión

- `src/lib/blog.ts`: `articles: Article[]` con `slug`, `title`, `description`, `publishedAt`,
  `readingMinutes`, `mode` (qué personaje ilustra el artículo) y `content` como JSX o bloques
  `{ type: "p" | "h2" | "quote", text }` (lo que resulte más simple de renderizar con buena
  tipografía). Funciones `getArticles()` y `getArticle(slug)`.
- `/blog`: título «Leer en un mundo sin tiempo», lista de `ArticleCard` (personaje del modo, título,
  descripción, minutos de lectura).
- `/blog/[slug]`: `generateStaticParams`, `generateMetadata` con `getSEOTags`, columna de lectura
  en Literata (60-70 caracteres), personaje del modo arriba, y al final un CTA a `/app`.
- Agregar las URLs de los artículos a `src/app/sitemap.ts` **no**: ese archivo es de R-017.
  En su lugar, `sitemap.ts` ya lista `/blog`; anotar en el reporte que los slugs individuales
  quedan para una mejora (R-PENDIENTES).
- Tres artículos de 500-700 palabras, en español neutro, voz de Reed (curiosa, cálida, clara;
  sin culpa; sin inventar estadísticas ni citas — si se menciona un dato, que sea de
  conocimiento general y sin cifra exacta):
  1. «Tres libros empezados en la mesa de noche» — por qué dejamos libros a medias (tiempo,
     atención, comprensión) y qué ayuda a retomarlos. Personaje: compañero.
  2. «Escuchar también es leer» — leer con los oídos mientras haces otra cosa, y cuándo conviene
     volver al texto. Personaje: lector.
  3. «Preguntarle al libro» — leer con preguntas (el método socrático explicado simple) para
     entender textos difíciles. Personaje: profesor.

## Criterios de aceptación

1. `/blog` lista los tres artículos y cada uno abre en `/blog/<slug>` como página estática.
2. Cada artículo tiene `title` y `description` propios en su metadata.
3. `npx tsc --noEmit && npm run lint` verde.

## Fuera de alcance

Editor de artículos, autores, categorías, RSS.
