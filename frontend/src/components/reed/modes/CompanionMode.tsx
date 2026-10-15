import React, { useState } from 'react';
import { Book, Chapter, Paragraph } from '../../../types';
import { useReed } from '../../../context/ReedContext';
import { explainParagraph, isReedError, summarizeChapter } from '../../../services/api';
import { Button } from '../../ui/Button';
import { Lightbulb } from 'lucide-react';
import { ReedAnswer, ReedThinking, sessionText, useReedAnswers } from './SessionTestFlow';

interface CompanionModeProps {
  book: Book;
  currentParagraph: Paragraph | null;
  chapterTitle?: string;
  progressPercent?: number;
}

function progressPhrase(percent: number): string {
  if (percent >= 100) return 'Llegaste al final del libro.';
  if (percent >= 45 && percent <= 60) return 'Ya llevas aproximadamente la mitad del libro.';
  if (percent > 0) return `Llevas cerca del ${percent}% del libro.`;
  return 'Apenas empieza esta lectura. Sigo aquí si me necesitas.';
}

// Formato mm:ss
const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

const CURIOSITY_PROMPT = 'Cuéntame un dato curioso y breve sobre este pasaje, su época o su autor. Dos o tres frases, sin inventar.';
const PARAGRAPH_SUMMARY_PROMPT = 'Resume este párrafo en una o dos frases.';
// Chapter summaries send at most this much text, counted from the chapter's start.
const MAX_CHAPTER_CHARS = 12000;

export const CompanionMode: React.FC<CompanionModeProps> = ({
  book,
  currentParagraph,
  chapterTitle,
  progressPercent,
}) => {
  const { sessionStats } = useReed();
  const { get, ask } = useReedAnswers();

  const [companionTab, setCompanionTab] = useState<'summary' | 'curiosity'>('curiosity');
  const [summaryScope, setSummaryScope] = useState<'paragraph' | 'chapter' | 'session'>('session');

  // Chapter the reader is in: the one holding the current paragraph, else the one by title.
  const chapter: Chapter | undefined =
    (currentParagraph && book.chapters.find((c) => c.paragraphs.some((p) => p.id === currentParagraph.id))) ||
    book.chapters.find((c) => c.title === chapterTitle) ||
    book.chapters[0];

  // Curiosity: about the current paragraph, or the chapter's first one.
  const curiosityParagraph = currentParagraph ?? chapter?.paragraphs[0] ?? null;
  const curiosityKey = curiosityParagraph ? `${book.id}:curiosity:${curiosityParagraph.id}` : '';
  const curiosity = curiosityKey ? get(curiosityKey) : undefined;

  // Chapter summary: from the chapter's start up to where the reader is, never further.
  const readUpTo = chapter
    ? Math.max(
        currentParagraph && chapter.paragraphs.some((p) => p.id === currentParagraph.id) ? currentParagraph.order : 0,
        sessionStats.bookId === book.id && sessionStats.chapterTitle === chapter.title ? sessionStats.endParagraphOrder : 0,
      )
    : 0;
  const chapterText = chapter
    ? chapter.paragraphs
        .filter((p) => p.order <= readUpTo)
        .map((p) => p.text)
        .join('\n\n')
        .slice(0, MAX_CHAPTER_CHARS)
    : '';

  const readInSession = sessionText(book, sessionStats);

  const summary = {
    paragraph: {
      key: currentParagraph ? `${book.id}:summary-paragraph:${currentParagraph.id}` : '',
      empty: 'Toca cualquier párrafo en el libro para ver su síntesis aquí.',
      request: () => explainParagraph(currentParagraph?.text ?? '', PARAGRAPH_SUMMARY_PROMPT),
    },
    chapter: {
      key: chapter && chapterText ? `${book.id}:summary-chapter:${chapter.id}:${readUpTo}` : '',
      empty: 'Lee un poco de este capítulo y te cuento lo que llevamos.',
      request: () => summarizeChapter(chapter?.title ?? '', chapterText),
    },
    session: {
      key: readInSession
        ? `${book.id}:summary-session:${sessionStats.chapterTitle}:${sessionStats.startParagraphOrder}-${sessionStats.endParagraphOrder}`
        : '',
      empty: 'Lee un poco y te cuento lo que llevamos.',
      request: () => summarizeChapter('Esta sesión', readInSession),
    },
  }[summaryScope];
  const summaryAnswer = summary.key ? get(summary.key) : undefined;

  return (
    <div className="space-y-4">
      {typeof progressPercent === 'number' && (
        <p className="font-serif text-sm text-ink leading-relaxed">{progressPhrase(progressPercent)}</p>
      )}
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          onClick={() => setCompanionTab('curiosity')}
          className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${
            companionTab === 'curiosity'
              ? 'bg-reed-soft text-ink'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Datos curiosos
        </button>
        <button
          onClick={() => setCompanionTab('summary')}
          className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${
            companionTab === 'summary'
              ? 'bg-reed-soft text-ink'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Resúmenes breves
        </button>
      </div>

      {companionTab === 'curiosity' ? (
        <div className="space-y-3">
          {/* Curiosities that come with the book are shown first, without asking the AI. */}
          {book.curiosities?.[0] && (
            <div className="p-3.5 rounded-md bg-paper border border-line">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Lightbulb size={16} strokeWidth={2} />
                <span>¿Sabías esto sobre esta parte?</span>
              </div>
              <p className="font-serif text-sm text-ink leading-relaxed">{book.curiosities[0]}</p>
            </div>
          )}

          {book.curiosities && book.curiosities.length > 1 && (
            <div className="p-3.5 rounded-md bg-paper border border-line">
              <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                Contexto del autor ({book.author})
              </span>
              <p className="font-serif text-sm text-ink leading-relaxed">
                {book.curiosities[1]}
              </p>
            </div>
          )}

          {curiosity !== undefined && (
            <div className="p-3.5 rounded-md bg-paper border border-line">
              {curiosity === null ? <ReedThinking /> : <ReedAnswer text={curiosity} />}
            </div>
          )}

          {curiosityParagraph && (curiosity === undefined || (curiosity !== null && isReedError(curiosity))) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => ask(curiosityKey, () => explainParagraph(curiosityParagraph.text, CURIOSITY_PROMPT))}
              className="w-full text-xs"
              icon={<Lightbulb size={14} strokeWidth={2} />}
            >
              Cuéntame algo curioso
            </Button>
          )}

          <div className="p-3 bg-paper-sunk rounded-md text-xs text-ink-muted">
            Reed: «Leo a tu lado. Si quieres saber más sobre algún pasaje, selecciónalo y pregúntame.»
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Selector de alcance de resumen */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-paper-sunk rounded-md text-xs font-medium text-center">
            <button
              onClick={() => setSummaryScope('paragraph')}
              className={`py-1 rounded ${
                summaryScope === 'paragraph' ? 'bg-paper-raised text-ink font-bold shadow-sm' : 'text-ink-muted'
              }`}
            >
              Párrafo
            </button>
            <button
              onClick={() => setSummaryScope('chapter')}
              className={`py-1 rounded ${
                summaryScope === 'chapter' ? 'bg-paper-raised text-ink font-bold shadow-sm' : 'text-ink-muted'
              }`}
            >
              Capítulo
            </button>
            <button
              onClick={() => setSummaryScope('session')}
              className={`py-1 rounded ${
                summaryScope === 'session' ? 'bg-paper-raised text-ink font-bold shadow-sm' : 'text-ink-muted'
              }`}
            >
              Esta sesión
            </button>
          </div>

          <div className="p-4 rounded-md bg-paper border border-line space-y-3">
            <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              {summaryScope === 'paragraph' && 'Resumen del párrafo seleccionado'}
              {summaryScope === 'chapter' && `Resumen de ${chapter?.title || 'el capítulo'}, hasta donde vas`}
              {summaryScope === 'session' && `Lo que llevas leído en esta sesión (${formatTime(sessionStats.secondsReading)})`}
            </span>
            {!summary.key ? (
              <p className="font-serif text-sm leading-relaxed text-ink">{summary.empty}</p>
            ) : summaryAnswer === null ? (
              <ReedThinking />
            ) : summaryAnswer !== undefined && !isReedError(summaryAnswer) ? (
              <ReedAnswer text={summaryAnswer} />
            ) : (
              <>
                {summaryAnswer && <ReedAnswer text={summaryAnswer} />}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => ask(summary.key, summary.request)}
                  className="w-full text-xs"
                >
                  Resúmemelo
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
