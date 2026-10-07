import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { config } from "@/config";

export const metadata: Metadata = {
  title: `Página no encontrada · ${config.appName}`,
};

// Root 404: catches unmatched URLs too. It renders under the root layout only (no marketing
// header/footer), so it carries its own way back home.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Image
        src="/reed/librarian.webp"
        alt="Reed vestido de bibliotecario"
        width={232}
        height={320}
        priority
        className="h-auto w-44 sm:w-52"
      />
      <h1 className="max-w-md font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Esta página no está en ninguna de mis estanterías.
      </h1>
      <Link
        href="/"
        className="inline-flex items-center rounded-full bg-reed px-6 py-3 font-bold text-on-reed transition-colors hover:bg-reed-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
