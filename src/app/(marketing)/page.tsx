import { config } from "@/config";

// Provisional landing: R-012 replaces it with the real one.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="font-serif text-5xl font-semibold text-ink">{config.appName}</h1>
      <p className="max-w-md font-serif text-xl text-ink-muted">{config.tagline}</p>
      {/* Plain <a>: /app is the Vite app, not a Next route, so it needs a full page load. */}
      <a
        href={config.appPath}
        className="rounded-md bg-reed px-5 py-2.5 font-sans font-bold text-on-reed hover:bg-reed-strong"
      >
        Abrir Reed
      </a>
    </main>
  );
}
