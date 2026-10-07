import Link from "next/link";
import { config } from "@/config";

const linkClasses =
  "rounded-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Port of ShipeaRapido's Footer. /tos and /privacy-policy come with R-017, /blog with R-018.
export function SiteFooter() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-1">
          <span className="font-serif text-xl font-semibold text-ink">{config.appName}</span>
          <span className="text-ink-muted">
            © {new Date().getFullYear()} {config.appName} · Hecho en Chihuahua
          </span>
        </div>
        <nav aria-label="Pie de página">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href="/blog" className={linkClasses}>
                Blog
              </Link>
            </li>
            <li>
              <Link href="/tos" className={linkClasses}>
                Términos
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className={linkClasses}>
                Privacidad
              </Link>
            </li>
            <li>
              <a href={`mailto:${config.supportEmail}`} className={linkClasses}>
                {config.supportEmail}
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
