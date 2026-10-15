import React from 'react';
import { Book, Paragraph } from '../../../types';
import { ListenSessionSummary, useListenSession } from '../../reader/SessionPlanner';

interface ReaderModeProps {
  book: Book;
  currentParagraph: Paragraph | null;
}

const describeSession = (session: ListenSessionSummary) => {
  const length = `${session.untilEnd ? '~' : ''}${session.minutes} min`;
  const voice = session.voiceName ? ` con ${session.voiceName}` : '';
  const until = session.untilEnd
    ? 'hasta el final del libro'
    : `hasta «${session.endChapterTitle}», párrafo ${session.endParagraph}`;
  return `Sesión de hoy: ${length}${voice} · ${until}`;
};

export const ReaderMode: React.FC<ReaderModeProps> = ({ book, currentParagraph }) => {
  const session = useListenSession();
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-md bg-paper border border-line space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-ambar-ink">
          <span className="w-2 h-2 rounded-full bg-ambar animate-ping" />
          <span>EXPERIENCIA DE AUDIO ENRIQUECIDA</span>
        </div>
        <p className="font-serif text-sm text-ink leading-relaxed">
          {session ? describeSession(session) : 'Elige cuánto tiempo tienes y te leo ese tramo, a tu ritmo.'}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted pt-2 border-t border-line font-sans">
          <div>
            <span className="font-bold text-ink block">Capítulo activo:</span>
            <span>{book.chapters[0]?.title}</span>
          </div>
          <div>
            <span className="font-bold text-ink block">Párrafo actual:</span>
            <span>{currentParagraph?.order || 1} de {book.chapters[0]?.paragraphs.length || 6}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
