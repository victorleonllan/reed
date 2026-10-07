const pains = [
  { title: "Tiempo", text: "Lees diez minutos en la noche y te quedas dormido." },
  { title: "Atención", text: "El libro compite con un celular que nunca se cansa." },
  { title: "Comprensión", text: "Cuando algo no se entiende, no hay a quién preguntarle." },
];

// Port of ShipeaRapido's Problem: name the pain before offering anything.
export function Problem() {
  return (
    <section aria-labelledby="problem-title" className="bg-paper-raised">
      <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
        <h2 id="problem-title" className="sr-only">
          El problema
        </h2>
        <blockquote className="mx-auto max-w-3xl font-serif text-3xl italic leading-snug text-ink sm:text-4xl">
          «Tengo tres libros empezados en la mesa de noche y no termino ninguno.»
        </blockquote>
        <p className="mt-4 text-ink-muted">No es falta de ganas. Es que leer compite con todo lo demás.</p>
        <ul className="mt-12 grid gap-6 text-left sm:grid-cols-3">
          {pains.map((pain) => (
            <li key={pain.title} className="rounded-2xl bg-paper p-6">
              <h3 className="font-serif text-xl font-semibold text-ink">{pain.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{pain.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
