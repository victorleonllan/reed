import { ArticleCard } from "@/components/marketing/ArticleCard";
import { getArticles } from "@/lib/blog";
import { getSEOTags } from "@/lib/seo";

export const metadata = getSEOTags({
  title: "Leer en un mundo sin tiempo",
  description:
    "Ideas tranquilas para leer más y mejor con días cortos: retomar libros a medias, escuchar libros y entender textos difíciles.",
  path: "/blog",
});

// Static blog index (R-018): articles come from src/lib/blog.ts, no database.
export default function BlogPage() {
  const articles = getArticles();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Leer en un mundo sin tiempo
        </h1>
        <p className="text-lg leading-relaxed text-ink-muted">
          Notas sobre cómo hacerle espacio a los libros cuando el día no alcanza.
        </p>
      </header>

      <ul className="flex flex-col gap-5">
        {articles.map((article) => (
          <li key={article.slug}>
            <ArticleCard article={article} />
          </li>
        ))}
      </ul>
    </div>
  );
}
