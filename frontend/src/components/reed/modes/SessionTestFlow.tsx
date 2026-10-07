import React, { useEffect, useRef, useState } from 'react';
import { Book, QuizQuestion, ReadingSessionStats } from '../../../types';
import { isBackendSession, isReedError } from '../../../services/api';
import { Button } from '../../ui/Button';
import { Check } from 'lucide-react';

// ---------- shared by the Reed modes that ask the AI (Companion, Teacher) ----------

/** Waiting state while Reed answers: its voice plus the reed line, pulsing (static with reduced motion). */
export const ReedThinking: React.FC = () => (
  <div className="flex items-center gap-3 py-1" role="status">
    <span className="h-5 w-[2.5px] rounded-full bg-reed animate-pulse motion-reduce:animate-none" aria-hidden="true" />
    <span className="text-sm text-ink-muted">Déjame pensarlo…</span>
  </div>
);

/** Reed's answer, in Literata. */
export const ReedAnswer: React.FC<{ text: string }> = ({ text }) => (
  <p className="font-serif text-sm leading-relaxed text-ink animate-fadeIn">{text}</p>
);

// Answers stay in memory by book and passage, so going back to a tab doesn't spend the daily quota
// again. Demo and signed-in answers are kept apart; error messages aren't cached so the reader can retry.
const answerCache = new Map<string, string>();
const scopedKey = (key: string) => `${isBackendSession() ? 'ai' : 'demo'}:${key}`;

/** `get(key)`: undefined = not asked yet, null = Reed is thinking, string = the answer (or error message). */
export function useReedAnswers() {
  const [answers, setAnswers] = useState<Record<string, string | null>>({});

  const get = (key: string): string | null | undefined => {
    const scoped = scopedKey(key);
    return answerCache.get(scoped) ?? answers[scoped];
  };

  const ask = async (key: string, request: () => Promise<string>) => {
    const scoped = scopedKey(key);
    if (answerCache.has(scoped) || answers[scoped] === null) return;
    setAnswers((prev) => ({ ...prev, [scoped]: null }));
    const text = await request();
    if (!isReedError(text)) answerCache.set(scoped, text);
    setAnswers((prev) => ({ ...prev, [scoped]: text }));
  };

  return { get, ask };
}

/** Text read in this session: the chapter's paragraphs between the session's start and end. Empty if nothing was read yet. */
export function sessionText(book: Book, stats: ReadingSessionStats): string {
  if (stats.bookId !== book.id || stats.endParagraphOrder <= stats.startParagraphOrder) return '';
  const chapter = book.chapters.find((c) => c.title === stats.chapterTitle);
  if (!chapter) return '';
  return chapter.paragraphs
    .filter((p) => p.order >= stats.startParagraphOrder && p.order <= stats.endParagraphOrder)
    .map((p) => p.text)
    .join('\n\n');
}

/** Below this much session text, Reed doesn't build a test. */
export const MIN_QUIZ_CHARS = 600;

/** The session test: still loading, not enough reading yet, failed, or the questions. */
export type SessionQuiz = 'loading' | 'too-short' | 'failed' | QuizQuestion[];

// ---------- session test (Requisito 4.2) ----------

export const SessionTestFlow: React.FC<{
  quiz: SessionQuiz;
  onQuizComplete?: () => void;
  onDone: () => void;
}> = ({ quiz, onQuizComplete, onDone }) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answered, setAnswered] = useState(false);
  const quizReported = useRef(false);

  useEffect(() => {
    if (isFinished && !quizReported.current) {
      quizReported.current = true;
      onQuizComplete?.();
    }
  }, [isFinished, onQuizComplete]);

  if (!Array.isArray(quiz)) {
    return (
      <div className="space-y-3 animate-fadeIn">
        {quiz === 'loading' && <ReedThinking />}
        {quiz === 'too-short' && (
          <ReedAnswer text="Todavía leímos poco juntos. Sigue un rato y te pongo a prueba." />
        )}
        {quiz === 'failed' && (
          <ReedAnswer text="Esta vez no pude armar el test. Inténtalo de nuevo en un momento." />
        )}
        <Button variant="secondary" size="sm" onClick={onDone} className="w-full text-xs">
          Volver a la lectura
        </Button>
      </div>
    );
  }

  const sessionQuestions = quiz;
  const q = sessionQuestions[currentQIndex];

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelectedOpt(idx);
    setAnswered(true);
    if (idx === q.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQIndex + 1 < sessionQuestions.length) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOpt(null);
      setAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <div className="p-4 text-center space-y-3 animate-fadeIn">
        <h5 className="font-serif font-bold text-lg text-ink">
          Comprensión de tu sesión
        </h5>
        <p className="text-xs text-ink-muted">
          Respondiste correctamente {score} de {sessionQuestions.length} preguntas sobre los párrafos leídos.
        </p>
        <div className="p-3 bg-reed-soft/60 rounded-md text-xs text-ink font-serif">
          «Comprendiste muy bien los puntos clave de lo que leíste hoy. No hay notas ni reprobados en Reed: solo acompañamiento.»
        </div>
        <Button variant="primary" size="sm" onClick={onDone} className="w-full">
          Volver a la lectura
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between text-[11px] text-ink-muted">
        <span>Pregunta {currentQIndex + 1} de {sessionQuestions.length}</span>
        <span>Basado en tu lectura de hoy</span>
      </div>

      <p className="font-serif text-sm font-semibold text-ink">
        {q.question}
      </p>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let style = 'bg-paper border-line text-ink hover:border-line-strong';
          if (answered) {
            if (idx === q.correctIndex) style = 'bg-reed-soft border-reed text-ink font-bold';
            else if (idx === selectedOpt) style = 'bg-paper-sunk opacity-50';
          }
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={answered}
              className={`w-full text-left p-2.5 rounded-md border text-xs transition-all flex items-center justify-between ${style}`}
            >
              <span>{opt}</span>
              {answered && idx === q.correctIndex && <Check size={14} className="text-reed" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="p-2.5 bg-paper-sunk rounded text-xs text-ink-muted font-serif">
          {q.explanation}
        </div>
      )}

      {answered && (
        <Button variant="primary" size="sm" onClick={handleNext} className="w-full text-xs">
          {currentQIndex + 1 === sessionQuestions.length ? 'Finalizar comprobación' : 'Siguiente'}
        </Button>
      )}
    </div>
  );
};
