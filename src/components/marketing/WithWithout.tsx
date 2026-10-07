// Each row pairs a pain of reading alone with what Reed does about it, in the same order.
const rows = [
  { without: "Retomas el libro y ya perdiste el hilo.", with: "Te resume dónde quedaste antes de seguir." },
  {
    without: "Buscas en Google lo que no entendiste y terminas cerrando el libro.",
    with: "Le preguntas a Reed sobre el párrafo que estás leyendo, sin salir de la página.",
  },
  {
    without: "No encuentras el rato para sentarte a leer.",
    with: "Escuchas el libro mientras cocinas, caminas o vas de camino al trabajo.",
  },
  { without: "Lees y a la semana ya no te acuerdas.", with: "Un test corto de lo que leíste para que se quede." },
];

function CrossIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-1 size-4 shrink-0" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-1 size-4 shrink-0" fill="none">
      <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Port of ShipeaRapido's WithWithout: two columns, same four situations, before and after.
export function WithWithout() {
  return (
    <section aria-labelledby="withwithout-title" className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <h2
        id="withwithout-title"
        className="text-center font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl"
      >
        Leer solo o leer con Reed
      </h2>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-line/70 p-6 sm:p-8">
          <h3 className="font-serif text-2xl font-semibold text-ink-muted">Leer solo</h3>
          <ul className="mt-6 space-y-4">
            {rows.map((row) => (
              <li key={row.without} className="flex gap-3 leading-relaxed text-ink-muted">
                <CrossIcon />
                <span>{row.without}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-reed-soft p-6 sm:p-8">
          <h3 className="font-serif text-2xl font-semibold text-ink">Leer con Reed</h3>
          <ul className="mt-6 space-y-4">
            {rows.map((row) => (
              <li key={row.with} className="flex gap-3 leading-relaxed text-ink">
                <span className="text-reed-strong">
                  <CheckIcon />
                </span>
                <span>{row.with}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
