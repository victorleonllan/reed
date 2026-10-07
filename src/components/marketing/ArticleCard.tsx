import Image from "next/image";
import Link from "next/link";
import { modeCharacters, type Article } from "@/lib/blog";

// One entry in the /blog list: the mode's character, title, description and reading time.
// The whole card is the link; the heading carries its accessible name.
export function ArticleCard({ article }: { article: Article }) {
  const character = modeCharacters[article.mode];

  return (
    <article className="relative flex gap-5 rounded-2xl bg-paper-raised p-5 transition-colors hover:bg-paper-sunk has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus sm:gap-6 sm:p-6">
      <span className="flex h-24 w-20 shrink-0 items-end justify-center sm:h-28 sm:w-24">
        <Image
          src={character.src}
          alt=""
          width={character.width}
          height={character.height}
          sizes="96px"
          className="h-full w-auto object-contain"
        />
      </span>

      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm text-ink-muted">
          Reed {character.label} · {article.readingMinutes} min de lectura
        </p>
        <h2 className="font-serif text-2xl font-semibold leading-snug text-ink">
          <Link
            href={`/blog/${article.slug}`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
          >
            {article.title}
          </Link>
        </h2>
        <p className="leading-relaxed text-ink-muted">{article.description}</p>
      </div>
    </article>
  );
}
