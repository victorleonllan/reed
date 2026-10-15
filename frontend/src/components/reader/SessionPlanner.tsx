import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { Paragraph } from '../../types';
import { getUsage } from '../../services/billing';
import { getReaderVoice, READER_VOICES, ReaderVoice, setReaderVoice } from '../../services/readerVoices';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Surface } from '../ui/Surface';

/** Characters read per minute at 1×. Measured 10-oct-2026 with Antonio: 1 108 chars = 1.24 min. */
export const CHARS_PER_MINUTE = 890;
const SESSION_MINUTES = [5, 15, 30];

/** One paragraph of the book in reading order, with where it sits (pages and chapters flattened). */
export interface StreamItem {
  paragraph: Paragraph;
  page: number;
  /** Index inside its page. */
  index: number;
  chapterTitle: string;
  lastInChapter: boolean;
}

/** A planned listening session: paragraphs stream[start..end] (inclusive), read with one voice. */
export interface ListenSession {
  voice: ReaderVoice;
  /** Minutes the reader chose (or the estimate, when the session goes to the end of the book). */
  minutes: number;
  untilEnd: boolean;
  start: number;
  end: number;
}

export const paragraphMinutes = (text: string, rate: number) => text.length / (CHARS_PER_MINUTE * rate);

export const voiceName = (voice: ReaderVoice) => READER_VOICES[voice].label.split(' · ')[0];

/** Consecutive paragraphs from `start` while their total stays within `minutes`; always at least one. */
function planEnd(stream: StreamItem[], start: number, minutes: number, rate: number) {
  let end = start;
  let total = paragraphMinutes(stream[start].paragraph.text, rate);
  while (end + 1 < stream.length) {
    const next = total + paragraphMinutes(stream[end + 1].paragraph.text, rate);
    if (next > minutes) break;
    total = next;
    end += 1;
  }
  return { end, total };
}

interface PlanOption {
  minutes: number;
  untilEnd: boolean;
  end: number;
  chars: number;
}

/** 5, 15 and 30 minutes; the ones that reach the end of the book collapse into one «Hasta el final». */
function sessionOptions(stream: StreamItem[], start: number, rate: number): PlanOption[] {
  const options: PlanOption[] = [];
  for (const minutes of SESSION_MINUTES) {
    const { end, total } = planEnd(stream, start, minutes, rate);
    const untilEnd = end === stream.length - 1;
    let chars = 0;
    for (let i = start; i <= end; i++) chars += stream[i].paragraph.text.length;
    options.push({ minutes: untilEnd ? Math.max(1, Math.round(total)) : minutes, untilEnd, end, chars });
    if (untilEnd) break;
  }
  return options;
}

// ---------- current session, shared with the Reader mode panel ----------

export interface ListenSessionSummary {
  minutes: number;
  /** Omitted when the browser voice reads (signed out). */
  voiceName?: string;
  untilEnd: boolean;
  endChapterTitle: string;
  endParagraph: number;
}

let currentSummary: ListenSessionSummary | null = null;
const listeners = new Set<() => void>();

/** ReaderView publishes its session here so ReaderMode can describe it; null when there is none. */
export function publishListenSession(summary: ListenSessionSummary | null) {
  currentSummary = summary;
  listeners.forEach((listener) => listener());
}

export function useListenSession() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => currentSummary,
    () => null,
  );
}

// ---------- the planner ----------

const FOCUSABLE = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SessionPlannerProps {
  isOpen: boolean;
  stream: StreamItem[];
  /** Index in `stream` where the session starts. */
  start: number;
  rate: number;
  /** Signed in (ElevenLabs voices). Without it the browser voice reads, so there is no voice to choose. */
  withVoices: boolean;
  onStart: (session: ListenSession) => void;
  onClose: () => void;
}

/** «¿Cuánto tiempo tienes hoy?»: picks how far today's session goes and the voice, before any audio is made. */
export const SessionPlanner: React.FC<SessionPlannerProps> = ({ isOpen, stream, start, rate, withVoices, onStart, onClose }) => {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [voice, setVoice] = useState<ReaderVoice>(getReaderVoice);
  const [selected, setSelected] = useState(0);
  // Characters of voice left today; null when unknown (signed out or the query failed): nothing is disabled.
  const [charsLeft, setCharsLeft] = useState<number | null>(null);

  const startItem = stream[start];
  const options = useMemo(() => (startItem ? sessionOptions(stream, start, rate) : []), [stream, start, rate, startItem]);
  const fits = (option: PlanOption) => charsLeft === null || option.chars <= charsLeft;
  const minutesLeft = charsLeft === null ? 0 : Math.floor(charsLeft / (CHARS_PER_MINUTE * rate));

  useEffect(() => {
    if (!isOpen) return;
    setVoice(getReaderVoice());
    setCharsLeft(null);
    if (!withVoices) return;
    let cancelled = false;
    getUsage()
      .then(({ usage }) => {
        const tts = usage.tts_chars;
        if (!cancelled && tts && Number.isFinite(tts.limit)) setCharsLeft(Math.max(0, tts.limit - tts.used));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, withVoices]);

  // Preselect the first option that fits today's voice.
  useEffect(() => {
    const first = options.findIndex(fits);
    setSelected(first < 0 ? 0 : first);
  }, [options, charsLeft]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const frame = window.requestAnimationFrame(() => (focusables()[0] ?? dialogRef.current)?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [isOpen]);

  const chosen = options[selected];
  const canStart = !!chosen && fits(chosen);
  const begin = () => {
    if (!chosen || !canStart) return;
    if (withVoices) setReaderVoice(voice);
    onStart({ voice, minutes: chosen.minutes, untilEnd: chosen.untilEnd, start, end: chosen.end });
  };

  const optionDetail = (option: PlanOption) => {
    if (!fits(option)) return `Hoy te quedan ~${minutesLeft} min de voz`;
    if (option.untilEnd) return 'Terminas el libro';
    const last = stream[option.end];
    return last.lastInChapter ? 'Terminas el capítulo' : `Llegas a «${last.chapterTitle}», párrafo ${last.paragraph.order}`;
  };

  return (
    <AnimatePresence>
      {isOpen && startItem && (
        <motion.div
          key="session-planner"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-ink/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-planner-title"
            tabIndex={-1}
            className="w-full sm:max-w-md outline-none"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <Surface elevation={3} padding="md" className="relative text-ink rounded-b-none sm:rounded-b-lg sm:p-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <IconButton aria-label="Cerrar sin escuchar" size="sm" className="absolute top-4 right-4 text-ink-muted" onClick={onClose}>
                <X size={18} strokeWidth={1.75} />
              </IconButton>
              <div className="flex items-center gap-2 mb-1 pr-10">
                <span className="w-[2px] h-4 bg-reed rounded-pill" aria-hidden="true" />
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wider font-sans">Sesión de escucha</span>
              </div>
              <h3 id="session-planner-title" className="font-serif font-semibold text-2xl text-ink pr-10">¿Cuánto tiempo tienes hoy?</h3>
              <p className="text-sm text-ink-muted mt-1 mb-5">
                Te leo desde «{startItem.chapterTitle}», párrafo {startItem.paragraph.order}
              </p>

              <div className="space-y-2" role="radiogroup" aria-label="Duración de la sesión">
                {options.map((option, index) => {
                  const disabled = !fits(option);
                  const active = index === selected && !disabled;
                  return (
                    <button
                      key={option.untilEnd ? 'end' : option.minutes}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={disabled}
                      onClick={() => setSelected(index)}
                      className={`focus-ring w-full text-left rounded-md border px-4 py-3 transition-colors duration-states ${
                        active ? 'border-ambar bg-paper-sunk' : 'border-line hover:bg-paper-sunk'
                      } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                    >
                      <span className="block font-semibold text-ink">
                        {option.untilEnd ? `Hasta el final (~${option.minutes} min)` : `${option.minutes} minutos`}
                      </span>
                      <span className="block text-xs text-ink-muted mt-0.5">{optionDetail(option)}</span>
                    </button>
                  );
                })}
              </div>

              {withVoices && (
                <div className="mt-5">
                  <p className="text-xs font-bold text-ink-muted uppercase tracking-wider font-sans mb-2">Voz</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Voz">
                    {(Object.keys(READER_VOICES) as ReaderVoice[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={voice === key}
                        onClick={() => setVoice(key)}
                        className={`focus-ring text-left text-sm rounded-md border px-3 py-2 transition-colors duration-states ${
                          voice === key ? 'border-ambar bg-paper-sunk text-ink' : 'border-line text-ink-muted hover:bg-paper-sunk'
                        }`}
                      >
                        {READER_VOICES[key].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 mt-5 border-t border-line">
                <Button variant="ghost" onClick={onClose}>Ahora no</Button>
                <Button variant="primary" onClick={begin} disabled={!canStart}>Empezar</Button>
              </div>
            </Surface>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
