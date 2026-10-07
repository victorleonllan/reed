"use client";

import { useState } from "react";

const features = [
  {
    title: "Escuchar",
    description:
      "Reed te lee el libro en voz alta, con una voz natural. Sigues por donde ibas, con los ojos o sin ellos.",
  },
  {
    title: "Preguntar",
    description:
      "¿Quién era este personaje? ¿Qué quiso decir aquí? Pregúntale a Reed sobre lo que estás leyendo y te responde con el texto en la mano.",
  },
  {
    title: "Resumir",
    description: "Un resumen de lo que llevas o del capítulo que acabas de terminar, para retomar sin perder el hilo.",
  },
  {
    title: "Ponerte a prueba",
    description: "Al cerrar la sesión, unas pocas preguntas sobre lo que leíste. Sin nota: solo para que se quede.",
  },
  {
    title: "Tu biblioteca",
    description:
      "Sube tus libros en EPUB, PDF o TXT y tenlos todos en un solo lugar, con la página donde quedaste en cada uno.",
  },
];

// Port of ShipeaRapido's FeaturesAccordion: one item open at a time, the title is the button.
// Height animates with the grid-rows 0fr -> 1fr trick, so nothing has to be measured.
export function Features() {
  const [open, setOpen] = useState(0);

  return (
    <section aria-labelledby="features-title" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h2
        id="features-title"
        className="text-center font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl"
      >
        Lo que Reed hace por ti
      </h2>
      <ul className="mt-12 divide-y divide-line/70 border-y border-line/70">
        {features.map((feature, index) => {
          const isOpen = index === open;
          const panelId = `feature-panel-${index}`;
          const buttonId = `feature-button-${index}`;
          return (
            <li key={feature.title}>
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left font-serif text-xl font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className={isOpen ? "text-reed-strong" : undefined}>{feature.title}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className={`size-5 shrink-0 text-ink-muted transition-transform duration-200 motion-reduce:transition-none ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden" inert={!isOpen}>
                  <p className="pb-5 leading-relaxed text-ink-muted">{feature.description}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
