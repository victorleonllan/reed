import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { config } from "@/config";
import { getArticle, getArticles, modeCharacters, type ArticleBlock } from "@/lib/blog";
import { getSEOTags } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

// Only the slugs in src/lib/blog.ts exist; anything else is a 404 instead of a runtime render.
export const dynamicParams = false;

export function generateStaticParams() {
  return getArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};

  return getSEOTags({
    title: article.title,
    description: article.description,
    path: `/blog/${article.slug}`,
    extra: {
      openGraph: {
        title: `${article.title} · ${config.appName}`,
        description: article.description,
        url: `${config.siteUrl}/blog/${article.slug}`,
        siteName: config.appName,
        locale: "es_MX",
        type: "article",
        publishedTime: article.publishedAt,
      },
    },
  });
}

function formatDate(isoDate: string) {
  // Noon UTC keeps the calendar day stable in any timezone.
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${isoDate}T12:00:00Z`),
  );
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-6 font-serif text-2xl font-semibold leading-snug">{block.text}</h2>;
    case "quote":
      return (
        <blockquote className="my-2 border-l-4 border-reed pl-5 font-serif text-xl italic leading-relaxed">
          {block.text}
        </blockquote>
      );
    default:
      return <p>{block.text}</p>;
  }
}

// One article: the mode's character on top, a 60-70 character reading column in Literata, and a
// CTA to the app at the end.
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const character = modeCharacters[article.mode];

  return (
    <div className="flex flex-col">
      <article className="mx-auto flex w-full max-w-[65ch] flex-col gap-8 px-4 py-16 text-ink sm:px-0">
        <Link
          href="/blog"
          className="self-start text-sm font-bold text-reed underline-offset-4 hover:text-reed-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          ← Volver al blog
        </Link>

        <header className="flex flex-col items-center gap-5 text-center">
          <Image
            src={character.src}
            alt={character.alt}
            width={character.width}
            height={character.height}
            sizes="160px"
            preload
            className="h-40 w-auto object-contain [filter:drop-shadow(0_2px_3px_rgba(64,46,24,0.18))] dark:[filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.45))]"
          />
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {article.title}
          </h1>
          <p className="text-ink-muted">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time> ·{" "}
            {article.readingMinutes} min de lectura · Reed {character.label}
          </p>
        </header>

        <div className="flex flex-col gap-5 font-serif text-lg leading-relaxed">
          {article.content.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </div>
      </article>

      <section aria-labelledby="blog-cta-title" className="bg-reed">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
          <h2 id="blog-cta-title" className="font-serif text-3xl font-semibold tracking-tight text-on-reed sm:text-4xl">
            ¿Lo probamos con tu libro?
          </h2>
          <a
            href={config.appPath}
            className="inline-flex items-center rounded-full bg-on-reed px-8 py-3 text-lg font-bold text-reed-strong transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-reed"
          >
            Empieza gratis
          </a>
        </div>
      </section>
    </div>
  );
}
