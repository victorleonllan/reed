"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";

interface Mode {
  id: string;
  label: string;
  phrase: string;
  when: string;
  src: string;
  width: number;
  alt: string;
  // Same accent per mode as frontend/src/components/reed/modeTheme.ts (R-008).
  accent: string;
}

// The Next landing and the Vite app don't share components, so the mode data lives here too.
const modes: Mode[] = [
  {
    id: "sleeping",
    label: "Dormido",
    phrase: "Déjame solo",
    when: "Tienes tiempo y quieres leer tú. Reed no interrumpe.",
    src: "/reed/sleeping.webp",
    width: 512,
    alt: "Reed en modo dormido, con los ojos cerrados",
    accent: "var(--color-ink-muted)",
  },
  {
    id: "companion",
    label: "Compañero",
    phrase: "Acompáñame",
    when: "Quieres entender más: resúmenes y datos curiosos.",
    src: "/reed/companion.webp",
    width: 518,
    alt: "Reed en modo compañero, sonriendo",
    accent: "var(--color-reed)",
  },
  {
    id: "teacher",
    label: "Profesor",
    phrase: "Enséñame",
    when: "Estás estudiando: pistas y preguntas para que llegues solo.",
    src: "/reed/teacher.webp",
    width: 476,
    alt: "Reed en modo profesor, con lentes redondos",
    accent: "var(--color-ambar)",
  },
  {
    id: "librarian",
    label: "Bibliotecario",
    phrase: "Ayúdame con mis libros",
    when: "Quieres ubicarte rápido entre tus libros.",
    src: "/reed/librarian.webp",
    width: 464,
    alt: "Reed en modo bibliotecario, con lentes de media luna",
    accent: "var(--color-clay-strong)",
  },
  {
    id: "reader",
    label: "Lector",
    phrase: "Léemelo",
    when: "No tienes nada de tiempo: te lo lee en voz alta.",
    src: "/reed/reader.webp",
    width: 495,
    alt: "Reed en modo lector, con audífonos y micrófono",
    accent: "var(--color-reed-strong)",
  },
];

const IMAGE_HEIGHT = 640;
const INITIAL_INDEX = 1;

// The reed that bends (R-008): the old character leans out from its feet, the new one
// straightens up with a small spring. Exit 180 ms, reed line 120-280 ms, entry from 60 ms.
const bendVariants: Variants = {
  initial: { opacity: 0, rotate: 8, scale: 0.92 },
  enter: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 18,
      delay: 0.06,
      opacity: { duration: 0.2, ease: "easeOut", delay: 0.06 },
    },
  },
  exit: { opacity: 0, rotate: -8, scale: 0.92, transition: { duration: 0.18, ease: "easeIn" } },
};

// Reduced motion: no rotation or spring, just a 120 ms fade.
const fadeVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const textVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut", delay: 0.12 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: "easeIn" } },
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
      <path
        d={direction === "left" ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The star section: the five characters as tabs. Picking one plays the reed transition on the
// big stage and shows what that mode is for. On phones the row is a horizontal snap carousel.
export function ModesShowcase() {
  const reduceMotion = useReducedMotion() ?? false;
  const [selected, setSelected] = useState(INITIAL_INDEX);
  // Counts real changes so the reed line plays on a change, not on first paint.
  const [changes, setChanges] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mode = modes[selected];

  const select = (index: number, moveFocus = false) => {
    const next = (index + modes.length) % modes.length;
    if (next !== selected) {
      setSelected(next);
      setChanges((count) => count + 1);
    }
    const tab = tabRefs.current[next];
    if (!tab) return;
    if (moveFocus) tab.focus({ preventScroll: true });
    // Center the tab inside the carousel only; scrollIntoView would also scroll the page.
    const list = tab.parentElement;
    list?.scrollTo({
      left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  // WAI-ARIA tabs pattern: arrows move between characters, Home/End jump to the ends.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowRight: selected + 1,
      ArrowDown: selected + 1,
      ArrowLeft: selected - 1,
      ArrowUp: selected - 1,
      Home: 0,
      End: modes.length - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    select(keys[event.key], true);
  };

  return (
    <section id="modos" aria-labelledby="modos-title" className="scroll-mt-20 bg-paper-raised">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="modos-title" className="font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Un Reed para cada momento
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            Reed cambia de modo según lo que necesitas hoy. Elige uno y conócelo.
          </p>
        </div>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          {/* Stage: the selected character, big, with the reed transition. */}
          <div className="flex items-center justify-center gap-2 sm:gap-6">
            <button
              type="button"
              onClick={() => select(selected - 1)}
              aria-label="Modo anterior"
              className={`rounded-full p-2 text-ink-muted transition-colors hover:bg-paper-sunk hover:text-ink ${focusRing}`}
            >
              <Chevron direction="left" />
            </button>

            <div className="relative flex h-64 w-56 items-end justify-center sm:h-80 sm:w-64">
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-1/2 h-[7%] w-[70%] -translate-x-1/2 translate-y-1/3 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(64,46,24,0.28),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(236,230,216,0.18),transparent_70%)]"
              />
              {!reduceMotion && changes > 0 && (
                <motion.span
                  key={changes}
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-[2%] left-1/2 h-[85%] w-[2px] rounded-full"
                  style={{ backgroundColor: mode.accent, x: "-50%", originY: 1 }}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: [0, 1, 1], opacity: [0, 1, 0] }}
                  transition={{ delay: 0.12, duration: 0.16, times: [0, 0.6, 1], ease: "easeOut" }}
                />
              )}
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mode.id}
                  variants={reduceMotion ? fadeVariants : bendVariants}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  style={{ originX: 0.5, originY: 1 }}
                  className="relative inline-flex h-full items-end justify-center"
                >
                  <Image
                    src={mode.src}
                    alt={mode.alt}
                    width={mode.width}
                    height={IMAGE_HEIGHT}
                    sizes="(min-width: 640px) 260px, 210px"
                    className="h-full w-auto object-contain [filter:drop-shadow(0_2px_3px_rgba(64,46,24,0.18))] dark:[filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.45))]"
                  />
                </motion.span>
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => select(selected + 1)}
              aria-label="Modo siguiente"
              className={`rounded-full p-2 text-ink-muted transition-colors hover:bg-paper-sunk hover:text-ink ${focusRing}`}
            >
              <Chevron direction="right" />
            </button>
          </div>

          <div
            role="tabpanel"
            id="modos-panel"
            aria-labelledby={`modo-tab-${mode.id}`}
            aria-live="polite"
            className="min-h-48 text-center lg:text-left"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode.id}
                variants={reduceMotion ? fadeVariants : textVariants}
                initial="initial"
                animate="enter"
                exit="exit"
              >
                <h3 className="font-serif text-3xl font-semibold text-ink">
                  <span
                    className="underline decoration-[3px] underline-offset-8"
                    style={{ textDecorationColor: mode.accent }}
                  >
                    {mode.label}
                  </span>
                </h3>
                <p className="mt-5 font-serif text-2xl italic text-ink">«{mode.phrase}»</p>
                <p className="mt-3 text-lg leading-relaxed text-ink-muted">{mode.when}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* The five characters in a row; on phones, a horizontal carousel with scroll-snap. */}
        <div
          role="tablist"
          aria-label="Modos de Reed"
          onKeyDown={handleKeyDown}
          className="relative -mx-4 mt-12 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 pt-6 sm:mx-0 sm:justify-center sm:gap-6 sm:overflow-visible sm:px-0"
        >
          {modes.map((item, index) => {
            const isSelected = index === selected;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`modo-tab-${item.id}`}
                aria-selected={isSelected}
                aria-controls="modos-panel"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => select(index)}
                className={`flex w-24 shrink-0 snap-center flex-col items-center gap-2 rounded-2xl px-2 pb-3 pt-2 transition-colors sm:w-28 ${
                  isSelected ? "bg-paper" : "hover:bg-paper-sunk/60"
                } ${focusRing}`}
              >
                <motion.span
                  className="inline-flex h-20 items-end"
                  style={{ originY: 1 }}
                  animate={{ scale: isSelected ? 1.15 : 1 }}
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 18 }}
                >
                  <Image
                    src={item.src}
                    alt=""
                    width={item.width}
                    height={IMAGE_HEIGHT}
                    sizes="80px"
                    className="h-full w-auto object-contain"
                  />
                </motion.span>
                <span className={`text-sm ${isSelected ? "font-bold text-ink" : "text-ink-muted"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
