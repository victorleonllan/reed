"use client";

import Image from "next/image";
import { useEffect } from "react";

// Error boundary for every page under the root layout. retry() re-fetches and re-renders the
// segment, so a passing server hiccup recovers without a full reload.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Image
        src="/reed/sleeping.webp"
        alt="Reed dormido"
        width={256}
        height={320}
        className="h-auto w-44 sm:w-52"
      />
      <h1 className="max-w-md font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Algo se me cayó del estante. Prueba de nuevo.
      </h1>
      <button
        type="button"
        onClick={() => retry()}
        className="inline-flex items-center rounded-full bg-reed px-6 py-3 font-bold text-on-reed transition-colors hover:bg-reed-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Reintentar
      </button>
    </main>
  );
}
