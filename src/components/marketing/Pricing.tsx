"use client";

import { useState } from "react";
import { config } from "@/config";

type Interval = "month" | "year";

const { free, pro } = config.plans;

// 5000 -> "5 000" (non-breaking space), the way the copy writes thousands.
function formatNumber(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const monthsInWords: Record<number, string> = { 1: "un mes", 2: "dos meses", 3: "tres meses" };

// Derived from config so a price change also updates the "months free" line.
const monthsFree = Math.round((pro.priceMonthly * 12 - pro.priceYearly) / pro.priceMonthly);
const yearlyGift =
  monthsFree > 0 ? `${monthsInWords[monthsFree] ?? `${monthsFree} meses`} de regalo` : null;

const freeFeatures = [
  `Unos ${formatNumber(free.limits.tts_chars)} caracteres leídos en voz alta al día`,
  `Hasta ${formatNumber(free.limits.upload)} libros o documentos subidos al día`,
  `Hasta ${formatNumber(free.limits.ai_request)} respuestas, resúmenes y pistas al día`,
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-1 size-4 shrink-0" fill="none">
      <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const buttonBase =
  "mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Port of ShipeaRapido's Pricing: two cards straight from config.plans, Pro highlighted, with a
// monthly/yearly switch. The Pro button lands on /app with the plan in the URL; R-019 starts the
// checkout from there.
export function Pricing() {
  const [interval, setBillingInterval] = useState<Interval>("month");
  const proPrice = interval === "month" ? pro.priceMonthly : pro.priceYearly;

  return (
    <section id="precios" aria-labelledby="precios-title" className="scroll-mt-20 bg-paper-raised">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="precios-title" className="font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Empieza gratis, sigue con Pro si te gusta
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            El plan gratis alcanza para leer todos los días. Pro es para cuando Reed ya es parte de tu rutina.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div role="group" aria-label="Forma de pago de Reed Pro" className="inline-flex rounded-full bg-paper-sunk p-1">
            {(["month", "year"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={interval === value}
                onClick={() => setBillingInterval(value)}
                className={`rounded-full px-5 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  interval === value ? "bg-paper text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                {value === "month" ? "Mensual" : "Anual"}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          <article aria-labelledby="plan-free" className="flex flex-col rounded-3xl bg-paper p-8">
            <h3 id="plan-free" className="font-serif text-2xl font-semibold text-ink">
              {free.name}
            </h3>
            <p className="mt-4 flex items-baseline gap-2 text-ink">
              <span className="text-sm text-ink-muted">{free.currency}</span>
              <span className="font-serif text-5xl font-semibold">{free.priceMonthly}</span>
            </p>
            <p className="mt-1 text-sm text-ink-muted">Para siempre</p>
            <ul className="mt-6 flex-1 space-y-3">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex gap-3 leading-relaxed text-ink-muted">
                  <span className="text-reed">
                    <CheckIcon />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href={config.appPath}
              className={`${buttonBase} border border-line-strong text-ink hover:bg-paper-raised`}
            >
              Empieza gratis
            </a>
          </article>

          <article
            aria-labelledby="plan-pro"
            className="relative flex flex-col rounded-3xl border-2 border-reed bg-paper p-8 shadow-[0_12px_32px_-16px_rgba(31,42,34,0.35)]"
          >
            <span className="absolute -top-3 left-8 rounded-full bg-reed px-3 py-1 text-xs font-bold text-on-reed">
              El más completo
            </span>
            <h3 id="plan-pro" className="font-serif text-2xl font-semibold text-ink">
              {pro.name}
            </h3>
            <p className="mt-4 flex items-baseline gap-2 text-ink">
              <span className="text-sm text-ink-muted">{pro.currency}</span>
              <span className="font-serif text-5xl font-semibold">{formatNumber(proPrice)}</span>
              <span className="text-ink-muted">/{interval === "month" ? "mes" : "año"}</span>
            </p>
            <p className="mt-1 min-h-5 text-sm font-bold text-ambar-ink">
              {interval === "year" ? yearlyGift : null}
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {pro.features.map((feature) => (
                <li key={feature} className="flex gap-3 leading-relaxed text-ink">
                  <span className="text-reed">
                    <CheckIcon />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href={`${config.appPath}?plan=pro&interval=${interval}`}
              className={`${buttonBase} bg-reed text-on-reed hover:bg-reed-strong`}
            >
              Quiero Reed Pro
            </a>
          </article>
        </div>

        <p className="mt-8 text-center text-sm text-ink-muted">Cancelas cuando quieras desde tu perfil.</p>
      </div>
    </section>
  );
}
