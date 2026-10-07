import React, { useState } from 'react';
import { Book, Paragraph } from '../../../types';
import { useReed } from '../../../context/ReedContext';
import { Lightbulb } from 'lucide-react';

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

export const CompanionMode: React.FC<CompanionModeProps> = ({
  book,
  currentParagraph,
  chapterTitle,
  progressPercent,
}) => {
  const { sessionStats } = useReed();

  const [companionTab, setCompanionTab] = useState<'summary' | 'curiosity'>('curiosity');
  const [summaryScope, setSummaryScope] = useState<'paragraph' | 'chapter' | 'session'>('session');

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
          <div className="p-3.5 rounded-md bg-paper border border-line">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Lightbulb size={16} strokeWidth={2} />
              <span>¿Sabías esto sobre esta parte?</span>
            </div>
            <p className="font-serif text-sm text-ink leading-relaxed">
              {book.curiosities?.[0] ||
                'El junco se ha utilizado desde hace miles de años como cálamo para escribir los primeros pergaminos antes de la invención de la imprenta.'}
            </p>
          </div>

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

          <div className="p-4 rounded-md bg-paper border border-line">
            <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
              {summaryScope === 'paragraph' && 'Resumen del párrafo seleccionado'}
              {summaryScope === 'chapter' && `Resumen de ${chapterTitle || book.chapters[0]?.title || 'el capítulo'}`}
              {summaryScope === 'session' && `Lo que llevas leído en esta sesión (${formatTime(sessionStats.secondsReading)})`}
            </span>
            <p className="font-serif text-sm leading-relaxed text-ink">
              {summaryScope === 'paragraph'
                ? currentParagraph
                  ? `Se describe: "${currentParagraph.text.slice(0, 140)}..." En resumen, plasma cómo los personajes perciben lo novedoso con asombro.`
                  : 'Toca cualquier párrafo en el libro para ver su síntesis aquí.'
                : summaryScope === 'chapter'
                ? ((book.chapters.find((chapter) => chapter.title === chapterTitle) || book.chapters[0])?.whereYouLeftOffSummary || 'Sigo el hilo de este capítulo contigo, sin adelantarme al texto.')
                : `En esta sesión leíste desde el párrafo ${sessionStats.startParagraphOrder} hasta el ${sessionStats.endParagraphOrder} durante ${formatTime(sessionStats.secondsReading)}. Se ha explorado la fundación de Macondo y la fascinación por los inventos de los gitanos.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
