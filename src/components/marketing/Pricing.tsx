"use client";

import { useState } from "react";
import { config } from "@/config";

type Interval = "month" | "year";

type PaidPlan = "basico" | "pro" | "biblioteca";

const paidPlans: readonly PaidPlan[] = ["basico", "pro", "biblioteca"];

// 5000 -> "5 000" (non-breaking space), the way the copy writes thousands.
function formatNumber(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

const monthsInWords: Record<number, string> = { 1: "un mes", 2: "dos meses", 3: "tres meses" };

// Derived from config so a price change also updates the "months free" line.
function yearlyGift(plan: PaidPlan) {
  const { priceMonthly, priceYearly } = config.plans[plan];
  const monthsFree = Math.round((priceMonthly * 12 - priceYearly) / priceMonthly);
  return monthsFree > 0 ? `${monthsInWords[monthsFree] ?? `${monthsFree} meses`} de regalo` : null;
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-1 size-4 shrink-0" fill="none">
      <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const buttonBase =
  "mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Three cards straight from config.plans (R-039), Pro highlighted, with a monthly/yearly switch.
// Each button lands on /app with the plan in the URL; CheckoutReturn starts the checkout from there.
export function Pricing() {
  const [interval, setBillingInterval] = useState<Interval>("month");

  return (
    <section id="precios" aria-labelledby="precios-title" className="scroll-mt-20 bg-paper-raised">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="precios-title" className="font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Un plan para cada ritmo de lectura
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            Empieza con lo justo y sube cuando quieras que te lea tus propios libros.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div role="group" aria-label="Forma de pago" className="inline-flex rounded-full bg-paper-sunk p-1">
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

        <div className="mx-auto mt-10 grid gap-6 md:grid-cols-3">
          {paidPlans.map((id) => (
            <PlanCard key={id} id={id} interval={interval} highlighted={id === "pro"} />
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-ink-muted">
          Sin plan también puedes leer y escuchar los libros de Reed.
        </p>
        <p className="mt-2 text-center text-sm text-ink-muted">Cancelas cuando quieras desde tu perfil.</p>
      </div>
    </section>
  );
}

function PlanCard({ id, interval, highlighted }: { id: PaidPlan; interval: Interval; highlighted: boolean }) {
  const plan = config.plans[id];
  const price = interval === "month" ? plan.priceMonthly : plan.priceYearly;
  const titleId = `plan-${id}`;

  return (
    <article
      aria-labelledby={titleId}
      className={`relative flex flex-col rounded-3xl bg-paper p-8 ${
        highlighted ? "border-2 border-reed shadow-[0_12px_32px_-16px_rgba(31,42,34,0.35)]" : ""
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-8 rounded-full bg-reed px-3 py-1 text-xs font-bold text-on-reed">
          Te leo tus libros
        </span>
      )}
      <h3 id={titleId} className="font-serif text-2xl font-semibold text-ink">
        {plan.name}
      </h3>
      <p className="mt-4 flex items-baseline gap-2 text-ink">
        <span className="text-sm text-ink-muted">{plan.currency}</span>
        <span className="font-serif text-5xl font-semibold">{formatNumber(price)}</span>
        <span className="text-ink-muted">/{interval === "month" ? "mes" : "año"}</span>
      </p>
      <p className="mt-1 min-h-5 text-sm font-bold text-ambar-ink">{interval === "year" ? yearlyGift(id) : null}</p>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className={`flex gap-3 leading-relaxed ${highlighted ? "text-ink" : "text-ink-muted"}`}>
            <span className="text-reed">
              <CheckIcon />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <a
        href={`${config.appPath}?plan=${id}&interval=${interval}`}
        className={`${buttonBase} ${
          highlighted
            ? "bg-reed text-on-reed hover:bg-reed-strong"
            : "border border-line-strong text-ink hover:bg-paper-raised"
        }`}
      >
        Quiero {plan.name}
      </a>
    </article>
  );
}
