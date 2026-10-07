import React, { useRef, useState } from 'react';
import { Book, Paragraph, QuizQuestion } from '../../../types';
import { useReed } from '../../../context/ReedContext';
import { explainParagraph, generateQuiz, isBackendSession, isReedError } from '../../../services/api';
import { Button } from '../../ui/Button';
import { Clock, CheckCircle } from 'lucide-react';
import {
  MIN_QUIZ_CHARS,
  ReedAnswer,
  ReedThinking,
  SessionQuiz,
  SessionTestFlow,
  sessionText,
  useReedAnswers,
} from './SessionTestFlow';

interface TeacherModeProps {
  book: Book;
  currentParagraph: Paragraph | null;
  chapterCompleted: boolean;
  onQuizComplete?: () => void;
}

// Formato mm:ss
const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

// Socratic ladder: 1 hint, 2 reasoning question, 3 direct explanation.
type SocraticLevel = 1 | 2 | 3;

const SOCRATIC_LABELS: Record<SocraticLevel, string> = {
  1: '💡 Una pista:',
  2: '🤔 Pregunta para pensar:',
  3: '📖 Explicación directa:',
};

const socraticPrompt = (level: SocraticLevel, doubt: string) =>
  level === 1
    ? `Dame solo una pista, sin la respuesta, para que yo llegue solo a esto: ${doubt}`
    : level === 2
    ? `Hazme una pregunta que me ayude a razonarlo, sin darme la respuesta: ${doubt}`
    : doubt;

// The explain endpoint takes up to 1000 chars per question, prompt included.
const MAX_DOUBT_CHARS = 800;

// Session quizzes stay in memory by book and session range, like the other Reed answers.
const quizCache = new Map<string, QuizQuestion[]>();

export const TeacherMode: React.FC<TeacherModeProps> = ({
  book,
  currentParagraph,
  chapterCompleted,
  onQuizComplete,
}) => {
  const { sessionStats, habits } = useReed();
  const { get, ask } = useReedAnswers();

  // Estado para el modo profesor (Socrático): la duda queda fija junto al párrafo sobre el que se preguntó.
  const [socraticQuery, setSocraticQuery] = useState('');
  const [ladder, setLadder] = useState<{ paragraph: Paragraph; doubt: string; level: SocraticLevel } | null>(null);
  const [quiz, setQuiz] = useState<SessionQuiz | null>(null);
  const quizRun = useRef(0); // closing the test invalidates a quiz still loading

  const socraticKey = (paragraph: Paragraph, doubt: string, level: SocraticLevel) =>
    `${book.id}:socratic:${paragraph.id}:${level}:${doubt}`;

  const askLevel = (paragraph: Paragraph, doubt: string, level: SocraticLevel) => {
    setLadder({ paragraph, doubt, level });
    ask(socraticKey(paragraph, doubt, level), () => explainParagraph(paragraph.text, socraticPrompt(level, doubt)));
  };

  const startQuestion = () => {
    const doubt = socraticQuery.trim();
    if (!currentParagraph || !doubt) return;
    askLevel(currentParagraph, doubt, 1);
  };

  const startSessionTest = async () => {
    const run = ++quizRun.current;
    const text = sessionText(book, sessionStats);
    if (text.length < MIN_QUIZ_CHARS) {
      setQuiz('too-short');
      return;
    }
    const key = `${isBackendSession() ? 'ai' : 'demo'}:${book.id}:${sessionStats.chapterTitle}:${sessionStats.startParagraphOrder}-${sessionStats.endParagraphOrder}`;
    const cached = quizCache.get(key);
    if (cached) {
      setQuiz(cached);
      return;
    }
    setQuiz('loading');
    const questions = await generateQuiz(sessionStats.chapterTitle || book.title, text);
    if (questions.length) quizCache.set(key, questions);
    if (run === quizRun.current) setQuiz(questions.length ? questions : 'failed');
  };

  const closeSessionTest = () => {
    quizRun.current++;
    setQuiz(null);
  };

  const ladderLevels: SocraticLevel[] = ladder ? ([1, 2, 3] as SocraticLevel[]).filter((l) => l <= ladder.level) : [];
  const ladderAnswer = ladder ? get(socraticKey(ladder.paragraph, ladder.doubt, ladder.level)) : undefined;
  const ladderBusy = ladderAnswer === null;
  const ladderFailed = typeof ladderAnswer === 'string' && isReedError(ladderAnswer);

  return (
    <div className="space-y-4">
      {quiz === null ? (
        <>
          {/* 4.3 Guía de lectura personalizada */}
          {chapterCompleted && (
            <p className="font-serif text-sm text-ink leading-relaxed">
              Terminaste este capítulo. ¿Quieres comprobar qué recuerdas?
            </p>
          )}
          <div className="p-3.5 rounded-md bg-paper border border-line flex items-center gap-3">
            <Clock size={20} className="text-reed flex-shrink-0" />
            <div>
              <span className="text-xs font-bold text-ink block">
                Ritmo sugerido de hoy
              </span>
              <p className="text-xs text-ink-muted mt-0.5">
                {habits.recommendationNote}
              </p>
            </div>
          </div>

          {/* 4.1 Ayudar a comprender con método Socrático */}
          <div className="p-4 rounded-md bg-paper-raised border border-line space-y-3">
            <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              COMPRENSIÓN SOCRÁTICA
            </span>
            <p className="text-xs text-ink-muted">
              Reed no te dará la respuesta directa de inmediato; te ayudará a pensar por ti mismo.
            </p>

            {currentParagraph ? (
              <>
                <div className="p-2.5 bg-paper rounded border border-line text-xs italic font-serif text-ink line-clamp-2">
                  «{currentParagraph.text}»
                </div>
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    startQuestion();
                  }}
                >
                  <label htmlFor="reed-socratic-query" className="block text-xs font-bold text-ink">
                    ¿Qué no te queda claro?
                  </label>
                  <textarea
                    id="reed-socratic-query"
                    value={socraticQuery}
                    onChange={(e) => setSocraticQuery(e.target.value)}
                    maxLength={MAX_DOUBT_CHARS}
                    rows={2}
                    placeholder="Por ejemplo: qué quiere decir el autor con esta frase"
                    className="w-full resize-none rounded-md border border-line bg-paper p-2 text-sm text-ink placeholder:text-ink-muted focus:border-reed focus:outline-none"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={!socraticQuery.trim() || ladderBusy}
                    className="text-xs w-full"
                  >
                    Dame una pista
                  </Button>
                </form>
              </>
            ) : (
              <p className="text-xs text-ink-muted">
                Toca un párrafo del libro y cuéntame qué no te queda claro.
              </p>
            )}

            {/* Pasos socráticos */}
            {ladder && (
              <div className="p-3 rounded-md bg-reed-soft/40 border border-line text-sm text-ink space-y-3">
                {ladderLevels.map((level) => {
                  const answer = get(socraticKey(ladder.paragraph, ladder.doubt, level));
                  return (
                    <div key={level}>
                      <span className="font-bold text-xs text-reed block mb-1">{SOCRATIC_LABELS[level]}</span>
                      {answer === null ? <ReedThinking /> : answer ? <ReedAnswer text={answer} /> : null}
                    </div>
                  );
                })}

                <div className="flex gap-2 pt-1">
                  {ladderFailed && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => askLevel(ladder.paragraph, ladder.doubt, ladder.level)}
                      className="text-xs flex-1"
                    >
                      Inténtalo de nuevo
                    </Button>
                  )}
                  {!ladderFailed && ladder.level === 1 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={ladderBusy}
                      onClick={() => askLevel(ladder.paragraph, ladder.doubt, 2)}
                      className="text-xs flex-1"
                    >
                      Otra pista
                    </Button>
                  )}
                  {ladderFailed ? null : ladder.level < 3 ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={ladderBusy}
                      onClick={() => askLevel(ladder.paragraph, ladder.doubt, 3)}
                      className="text-xs flex-1"
                    >
                      Explícamelo ya
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setLadder(null);
                        setSocraticQuery('');
                      }}
                      className="text-xs flex-1"
                    >
                      Tengo otra duda
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4.2 Test después de la sesión */}
          <div className="pt-2 border-t border-line">
            <Button
              variant="primary"
              size="sm"
              onClick={startSessionTest}
              className="w-full flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              <span>Realizar test de esta sesión ({formatTime(sessionStats.secondsReading)})</span>
            </Button>
          </div>
        </>
      ) : (
        /* Componente de Test de sesión */
        <SessionTestFlow
          key={Array.isArray(quiz) ? quiz[0]?.id : quiz}
          quiz={quiz}
          onQuizComplete={onQuizComplete}
          onDone={closeSessionTest}
        />
      )}
    </div>
  );
};
