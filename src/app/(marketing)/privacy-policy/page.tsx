import { config } from "@/config";
import { getSEOTags } from "@/lib/seo";

export const metadata = getSEOTags({
  title: "Política de privacidad",
  description: `Qué datos guarda ${config.appName}, quién los procesa, para qué y cómo pedir que los borremos.`,
  path: "/privacy-policy",
});

const lastUpdated = "7 de octubre de 2026";

// Port of ShipeaRapido's privacy-policy page, rewritten for Reed. Draft text: the visible notice
// stays until a lawyer reviews it (R-PENDIENTES).
export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-16 text-ink sm:px-6">
      <p role="note" className="rounded-lg border border-clay-strong bg-clay px-4 py-3 font-bold text-on-clay">
        Borrador — revisar con un abogado antes de lanzar. Este texto no es asesoría legal.
      </p>

      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Política de privacidad</h1>
        <p className="text-ink-muted">Última actualización: {lastUpdated}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Qué datos guardo</h2>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>Tu cuenta: nombre, correo y foto de perfil, a través de Clerk.</li>
          <li>Los libros y documentos que subes, y el texto que extraigo de ellos para leerte.</li>
          <li>Tu progreso de lectura: dónde quedaste en cada libro.</li>
          <li>Tus notas y los pasajes que marcas.</li>
          <li>
            Las conversaciones que tienes conmigo, por escrito o por voz, y sus transcripciones.
          </li>
          <li>Cuánto usas cada función, para aplicar los límites de tu plan.</li>
          <li>Si tienes {config.plans.pro.name}, el estado de tu suscripción. Los datos de tu tarjeta nunca pasan por mí.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Quién los procesa</h2>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li><strong>Clerk</strong>: inicio de sesión y cuenta.</li>
          <li><strong>Neon</strong>: base de datos donde viven tus libros, progreso, notas y conversaciones.</li>
          <li><strong>Vercel</strong>: aloja la aplicación.</li>
          <li><strong>ElevenLabs</strong>: la voz con la que te leo y el agente con el que conversas.</li>
          <li><strong>Stripe</strong>: cobro de {config.plans.pro.name}.</li>
          <li><strong>Resend</strong>: los correos que te envío (bienvenida y avisos de tu plan).</li>
          <li><strong>PostHog</strong>: estadísticas de uso para entender qué mejorar.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Para qué los uso</h2>
        <p>
          Solo para darte el servicio: leerte, resumir, responder tus preguntas sobre lo que lees,
          recordar dónde quedaste, cobrar tu plan si lo tienes y mejorar {config.appName}. No vendo
          tus datos ni los uso para publicidad.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Cuánto tiempo los guardo</h2>
        <p>
          Mientras tengas tu cuenta. Si la borras, o me lo pides, elimino tus libros, progreso, notas
          y conversaciones. Los registros de cobro se conservan el tiempo que exija la ley.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold">Cómo pedir que los borre</h2>
        <p>
          Escríbeme a{" "}
          <a
            href={`mailto:${config.supportEmail}`}
            className="font-bold text-reed underline underline-offset-4 hover:text-reed-strong"
          >
            {config.supportEmail}
          </a>{" "}
          desde el correo de tu cuenta y borro todo lo tuyo. También puedes escribirme para pedir una
          copia de tus datos o corregirlos.
        </p>
      </section>
    </article>
  );
}
