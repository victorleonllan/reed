import { config } from "@/config";

// Port of ShipeaRapido's CTA: one line, one button, nothing else.
export function CTA() {
  return (
    <section aria-labelledby="cta-title" className="bg-reed">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 py-24 text-center sm:px-6">
        <h2 id="cta-title" className="font-serif text-4xl font-semibold tracking-tight text-on-reed sm:text-5xl">
          Vuelve a terminar libros.
        </h2>
        <a
          href={config.appPath}
          className="inline-flex items-center rounded-full bg-on-reed px-8 py-3 text-lg font-bold text-reed-strong transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-reed"
        >
          Empieza gratis
        </a>
      </div>
    </section>
  );
}
