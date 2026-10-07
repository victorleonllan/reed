import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ReedMode } from '../../types';
import { useReed } from '../../context/ReedContext';
import { Button } from '../ui/Button';
import { ReedCharacter } from './ReedCharacter';
import { modeLabels } from './portraits';
import { modeAccent } from './modeTheme';

const STORAGE_KEY = 'reed-onboarding-v2';
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Same order and "when it helps" lines as the landing (R-012, ModesShowcase).
const modeOrder: ReedMode[] = ['sleeping', 'companion', 'teacher', 'librarian', 'reader'];
const modeWhen: Record<ReedMode, string> = {
  sleeping: 'Tienes tiempo y quieres leer tú. Reed no interrumpe.',
  companion: 'Quieres entender más: resúmenes y datos curiosos.',
  teacher: 'Estás estudiando: pistas y preguntas para que llegues solo.',
  librarian: 'Quieres ubicarte rápido entre tus libros.',
  reader: 'No tienes nada de tiempo: te lo lee en voz alta.',
};

// Step 0 is the greeting, 1-5 one mode each, 6 the choice.
const LAST_STEP = modeOrder.length + 1;
const DEFAULT_MODE: ReedMode = 'companion';

// Storage that fails counts as "already seen", so the welcome never loops.
const shouldShow = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'done';
  } catch {
    return false;
  }
};

const markSeen = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'done');
  } catch {
    // Nothing to do: shouldShow() already returns false when storage throws.
  }
};

/** First visit only: Reed introduces itself and its five modes, then lets the user pick one. */
export const Onboarding: React.FC = () => {
  const [open, setOpen] = useState(shouldShow);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const { setMode } = useReed();
  const reduceMotion = useReducedMotion() ?? false;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const titleId = useId();

  const stepMode: ReedMode = step >= 1 && step <= modeOrder.length ? modeOrder[step - 1] : DEFAULT_MODE;
  const isLast = step === LAST_STEP;

  const close = () => {
    markSeen();
    setOpen(false);
  };

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(LAST_STEP, next));
    setDirection(clamped >= step ? 1 : -1);
    setStep(clamped);
  };

  const choose = (mode: ReedMode) => {
    setMode(mode);
    close();
  };

  // Latest handlers for the document listeners, which are bound once per open.
  const keyHandlers = useRef({ close, goTo, step });
  keyHandlers.current = { close, goTo, step };

  // Escape skips, arrows move between steps, Tab stays inside the dialog.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const frame = window.requestAnimationFrame(() => (titleRef.current ?? dialogRef.current)?.focus());

    const onKey = (event: KeyboardEvent) => {
      const handlers = keyHandlers.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        handlers.close();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handlers.goTo(handlers.step + 1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlers.goTo(handlers.step - 1);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = dialogRef.current?.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    // Focus that escapes (a click on the backdrop, a programmatic jump) comes back in.
    const onFocusIn = (event: FocusEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        (focusables()[0] ?? dialogRef.current).focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocusIn);
      previous?.focus?.();
    };
  }, [open]);

  // «Atrás» disappears on the first step and «Siguiente» on the last: if the focused button
  // went away with the step, focus the new title so the keyboard isn't left on the body.
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      if (!dialogRef.current?.contains(document.activeElement)) titleRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, step]);

  const textVariants = {
    initial: (dir: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 * dir }),
    enter: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
    exit: (dir: number) =>
      reduceMotion
        ? { opacity: 0, transition: { duration: 0.12 } }
        : { opacity: 0, x: -12 * dir, transition: { duration: 0.14, ease: 'easeIn' as const } },
  };

  let title: string;
  let body: React.ReactNode;
  if (step === 0) {
    title = 'Hola, soy Reed.';
    body = (
      <p className="font-serif text-lg leading-relaxed text-ink">
        Ya leí el libro; lo leemos juntos. Tengo cinco maneras de acompañarte, según el tiempo y las ganas
        que tengas hoy. Te las muestro rápido.
      </p>
    );
  } else if (isLast) {
    title = '¿Cómo empezamos?';
    body = (
      <>
        <p className="text-sm text-ink-muted">Puedes cambiarlo cuando quieras desde el botón de Reed.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {modeOrder.map((mode) => {
            const suggested = mode === DEFAULT_MODE;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => choose(mode)}
                className={`focus-ring flex flex-col items-center rounded-md border p-2 pt-3 text-center transition-colors duration-states hover:bg-paper-sunk ${
                  suggested ? 'border-reed bg-paper' : 'border-line'
                }`}
              >
                <ReedCharacter mode={mode} size="sm" />
                <span className="mt-2 text-sm font-bold text-ink">{modeLabels[mode].label}</span>
                <span className="font-serif text-xs italic text-ink-muted">«{modeLabels[mode].phrase}»</span>
                {suggested && <span className="mt-1 text-[11px] font-bold text-reed-strong">Para empezar</span>}
              </button>
            );
          })}
        </div>
      </>
    );
  } else {
    const { label, phrase } = modeLabels[stepMode];
    title = label;
    body = (
      <>
        <p className="font-serif text-xl italic text-ink">«{phrase}»</p>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">{modeWhen[stepMode]}</p>
      </>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="reed-onboarding"
          className="fixed inset-0 z-[60] flex items-stretch justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="flex h-full w-full flex-col overflow-y-auto bg-paper-raised text-ink outline-none sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:rounded-lg sm:border sm:border-line sm:shadow-3"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
              <div className="flex items-center gap-2">
                <span className="h-4 w-[2px] rounded-pill bg-reed" aria-hidden="true" />
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-ink-muted">Bienvenida</span>
              </div>
              <Button variant="ghost" size="sm" onClick={close}>
                Saltar
              </Button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-5 py-6 text-center sm:px-6">
              {!isLast && <ReedCharacter mode={stepMode} size="xl" animated />}

              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={textVariants}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  className={`w-full max-w-sm ${isLast ? '' : 'mt-6'}`}
                >
                  <h2
                    id={titleId}
                    ref={titleRef}
                    tabIndex={-1}
                    className="font-serif text-2xl font-semibold text-ink outline-none"
                  >
                    {title}
                  </h2>
                  <div className="mt-3">{body}</div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="border-t border-line px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-5">
              {/* Progress as a segmented reed line: done and current segments in the step's accent. */}
              <p className="sr-only" aria-live="polite">{`Paso ${step + 1} de ${LAST_STEP + 1}`}</p>
              <div className="mb-4 flex items-center justify-center gap-1.5" aria-hidden="true">
                {Array.from({ length: LAST_STEP + 1 }, (_, i) => (
                  <button key={i} type="button" tabIndex={-1} onClick={() => goTo(i)} className="flex h-4 items-center">
                    <span
                      className={`block h-[3px] rounded-pill transition-[width,background-color] duration-states motion-reduce:transition-none ${
                        i === step ? 'w-6' : 'w-3'
                      } ${i <= step ? '' : 'bg-line-strong'}`}
                      style={i <= step ? { backgroundColor: modeAccent[stepMode].color } : undefined}
                    />
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3">
                {step > 0 ? (
                  <Button variant="quiet" onClick={() => goTo(step - 1)}>
                    Atrás
                  </Button>
                ) : (
                  <span />
                )}
                {isLast ? (
                  <Button variant="primary" onClick={() => choose(DEFAULT_MODE)}>
                    Empezar con {modeLabels[DEFAULT_MODE].label}
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => goTo(step + 1)}>
                    Siguiente
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
