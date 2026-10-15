import { config } from "@/config";
import { getSEOTags } from "@/lib/seo";

export const metadata = getSEOTags({
  title: "Términos del servicio",
  description: `Qué es ${config.appName}, cómo funcionan el plan gratis y ${config.plans.pro.name}, y qué esperar de sus respuestas.`,
  path: "/tos",
});

const lastUpdated = "7 de octubre de 2026";
const { free, pro } = config.plans;

// Port of ShipeaRapido's tos page, rewritten for Reed. Draft text: the visible notice stays until
// a lawyer reviews it (R-PENDIENTES).
export default function TermsPage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-16 text-ink sm:px-6">
      <p role="note" className="rounded-lg border border-clay-strong bg-clay px-4 py-3 font-bold text-on-clay">
        Borrador — revisar con un abogado antes de lanzar. Este texto no es asesoría legal.
      </p>

      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Términos del servicio</h1>
        <p className="text-ink-muted">Última actualización: {lastUpdated}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Qué es {config.appName}</h2>
        <p>
          {config.appName} es un compañero de lectura: te lee en voz alta, resume y responde
          preguntas sobre los libros y documentos que subes. Al crear una cuenta
          aceptas estos términos.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Planes</h2>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>
            <strong>{free.name}</strong>: sin costo, con límites diarios de uso.
          </li>
          <li>
            <strong>{pro.name}</strong>: ${pro.priceMonthly} {pro.currency} al mes o $
            {pro.priceYearly} {pro.currency} al año, con límites más altos.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Cobro y cancelación</h2>
        <p>
          {pro.name} se cobra de forma recurrente con Stripe, cada mes o cada año según el periodo que
          elijas, hasta que lo canceles. Puedes cancelar cuando quieras desde tu perfil; conservas
          {" "}{pro.name} hasta el final del periodo ya pagado y no se hacen más cargos.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Límites de uso</h2>
        <p>
          Cada plan tiene un límite de lectura en voz alta, subidas y respuestas
          por cada 24 horas. Al llegar al límite, esa función se pausa hasta que se libere
          tu cuota. Puedo ajustar los límites; si cambian, lo verás reflejado en la página de precios.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Lo que subes</h2>
        <p>
          Eres responsable de tener derecho a subir los libros y documentos que usas conmigo. Solo
          los uso para leértelos y responder tus preguntas sobre ellos; no los comparto con otras personas.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Mis respuestas pueden equivocarse</h2>
        <p>
          Mis resúmenes, explicaciones y respuestas los genera una inteligencia artificial y pueden
          tener errores. Úsalos como apoyo para leer, no como fuente definitiva.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Contacto</h2>
        <p>
          Para cualquier duda sobre estos términos, escríbeme a{" "}
          <a
            href={`mailto:${config.supportEmail}`}
            className="font-bold text-reed underline underline-offset-4 hover:text-reed-strong"
          >
            {config.supportEmail}
          </a>
          .
        </p>
      </section>
    </article>
  );
}
