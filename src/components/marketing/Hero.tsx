import Image from "next/image";
import { config } from "@/config";

// Port of ShipeaRapido's Hero: promise on the left, product on the right. The product here is
// Reed itself in companion mode, cut out with no frame, standing on a soft contact shadow.
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <h1
            id="hero-title"
            className="font-serif text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl"
          >
            Cualquier libro cabe en tu día.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-ink-muted sm:text-xl">
            Reed te lee en voz alta, te resume y responde tus preguntas mientras lees. Como leer con
            un amigo curioso que ya leyó el libro.
          </p>
          <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
            <a
              href={config.appPath}
              className="inline-flex items-center rounded-full bg-reed px-6 py-3 font-bold text-on-reed transition-colors hover:bg-reed-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Empieza gratis
            </a>
            <a
              href="#modos"
              className="inline-flex items-center rounded-full border border-line-strong px-6 py-3 font-bold text-ink transition-colors hover:bg-paper-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Ver cómo funciona
            </a>
          </div>
          <p className="text-sm text-ink-muted">2.º lugar en Innovathon 2.0 · Chihuahua Tech Week 2026</p>
        </div>

        <div className="relative mx-auto flex h-80 w-full max-w-sm items-end justify-center sm:h-[26rem]">
          {/* The reed: a thin, slightly bent stem behind the character. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 40 400"
            preserveAspectRatio="none"
            className="absolute bottom-[4%] left-[58%] h-[92%] w-8 text-reed opacity-40"
          >
            <path
              d="M20 400 C 18 300, 26 200, 22 110 S 12 30, 30 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-1/2 h-[7%] w-[60%] -translate-x-1/2 translate-y-1/3 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(64,46,24,0.28),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(236,230,216,0.18),transparent_70%)]"
          />
          <Image
            src="/reed/companion.webp"
            alt="Reed en modo compañero: una cabecita redonda con dos hojas y un tallo de junco, que sonríe y mira de reojo"
            width={518}
            height={640}
            preload
            sizes="(min-width: 640px) 340px, 260px"
            className="relative h-full w-auto object-contain [filter:drop-shadow(0_2px_3px_rgba(64,46,24,0.18))] dark:[filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.45))]"
          />
        </div>
      </div>
    </section>
  );
}
