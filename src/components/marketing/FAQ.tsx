const questions = [
  {
    question: "¿Qué libros puedo leer?",
    answer:
      "Los tuyos, en EPUB, PDF, TXT, Markdown o HTML, de hasta 4 MB cada uno. Y si no tienes ninguno a la mano, el almacén de Reed trae clásicos de dominio público listos para abrir.",
  },
  {
    question: "¿En qué idioma funciona?",
    answer: "En español: Reed te lee, te explica y te responde en español.",
  },
  {
    question: "¿Reed inventa cosas?",
    answer:
      "Reed responde sobre el texto que estás leyendo. Si algo no está en el libro o no lo sabe, te lo dice en lugar de inventarlo.",
  },
  {
    question: "¿Qué pasa con mis libros?",
    answer: "Son tuyos: solo tú los ves en tu biblioteca.",
  },
  {
    question: "¿Cómo cancelo Reed Pro?",
    answer: "Desde tu perfil, en un clic.",
  },
  {
    question: "¿Sirve si me cuesta leer?",
    answer:
      "Sí. Reed te lee en voz alta para que sigas el texto con el oído, y te explica con calma lo que no se entiende. Sin apuro.",
  },
];

// Port of ShipeaRapido's FAQ. Native <details> gives keyboard support and works without JS.
export function FAQ() {
  return (
    <section id="preguntas" aria-labelledby="preguntas-title" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
      <h2
        id="preguntas-title"
        className="text-center font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl"
      >
        Preguntas frecuentes
      </h2>
      <div className="mt-12 divide-y divide-line/70 border-y border-line/70">
        {questions.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-lg font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
              <h3>{item.question}</h3>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="size-5 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
              >
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </summary>
            <p className="pb-5 leading-relaxed text-ink-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
