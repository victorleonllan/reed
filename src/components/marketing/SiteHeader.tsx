"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { config } from "@/config";

const links = [
  { href: "/#modos", label: "Modos" },
  { href: "/#precios", label: "Precios" },
  { href: "/#preguntas", label: "Preguntas" },
  { href: "/blog", label: "Blog" },
];

const SCROLL_THRESHOLD_PX = 8;

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const ctaClasses =
  "inline-flex shrink-0 items-center rounded-full bg-reed px-4 py-2 text-sm font-bold text-on-reed transition-colors hover:bg-reed-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Port of ShipeaRapido's Header: logo, section links and one CTA. Sticky, and it only gets a
// translucent background once the page scrolls, so the hero keeps the bare paper at the top.
export function SiteHeader() {
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > SCROLL_THRESHOLD_PX,
    () => false,
  );

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-200 motion-reduce:transition-none ${
        scrolled ? "border-line/60 bg-paper/85 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
      >
        <Link
          href="/"
          className="rounded-sm font-serif text-2xl font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          {config.appName}
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Plain <a>: /app is the Vite app, not a Next route, so it needs a full page load. */}
        <Show
          when="signed-in"
          fallback={
            <a href={config.appPath} className={ctaClasses}>
              Abrir Reed
            </a>
          }
        >
          <a href={config.appPath} className={ctaClasses}>
            Ir a mi biblioteca
          </a>
        </Show>
      </nav>
    </header>
  );
}
