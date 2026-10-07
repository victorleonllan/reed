import React from 'react';
import { Book, Paragraph, ReedMode } from '../../types';
import { useReed } from '../../context/ReedContext';
import { X } from 'lucide-react';
import sleeping from '../../assets/reed/sleeping.png';
import companion from '../../assets/reed/companion.png';
import teacher from '../../assets/reed/teacher.png';
import librarian from '../../assets/reed/librarian.png';
import reader from '../../assets/reed/reader.png';
import { SleepingMode } from './modes/SleepingMode';
import { CompanionMode } from './modes/CompanionMode';
import { TeacherMode } from './modes/TeacherMode';
import { LibrarianMode } from './modes/LibrarianMode';
import { ReaderMode } from './modes/ReaderMode';

const modePortraits: Record<ReedMode, string> = {
  sleeping,
  companion,
  teacher,
  librarian,
  reader,
};

interface ReedModePanelProps {
  book: Book;
  allBooks: Book[];
  currentParagraph: Paragraph | null;
  chapterTitle?: string;
  progressPercent?: number;
  chapterCompleted?: boolean;
  onQuizComplete?: () => void;
  onSelectBook: (book: Book) => void;
  onClose: () => void;
}

// Frame of the Reed panel: position, header and close button. Each mode renders its own body.
export const ReedModePanel: React.FC<ReedModePanelProps> = ({
  book,
  allBooks,
  currentParagraph,
  chapterTitle,
  progressPercent,
  chapterCompleted = false,
  onQuizComplete,
  onSelectBook,
  onClose,
}) => {
  const { mode } = useReed();

  if (mode === 'sleeping') {
    return <SleepingMode portrait={modePortraits.sleeping} onClose={onClose} />;
  }

  return (
    <div className="fixed z-40 bottom-[6.5rem] right-[max(0.75rem,calc(50vw-36rem))] w-[min(22rem,calc(100vw-2rem))] max-h-[min(26rem,calc(100dvh-9.5rem))] bg-paper-raised border border-line-strong rounded-lg shadow-2xl overflow-hidden animate-slideUp font-sans flex flex-col">
      <div className="p-3 bg-paper border-b border-line flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="w-12 h-16 rounded-[4px] overflow-hidden bg-paper border border-line-strong flex items-end justify-center flex-shrink-0">
            <img src={modePortraits[mode]} alt="" className="h-[94%] w-auto object-contain" />
          </span>
          <span className="min-w-0 text-sm font-bold leading-snug text-ink">
            {mode === 'companion' && 'Modo Compañero · Leyendo contigo'}
            {mode === 'teacher' && 'Modo Profesor · Comprensión y guía'}
            {mode === 'librarian' && 'Modo Bibliotecario · Tu biblioteca'}
            {mode === 'reader' && 'Modo Lector · Audio y ritmo'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-paper-sunk transition-colors"
          aria-label="Cerrar panel"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        {mode === 'companion' && (
          <CompanionMode
            book={book}
            currentParagraph={currentParagraph}
            chapterTitle={chapterTitle}
            progressPercent={progressPercent}
          />
        )}
        {mode === 'teacher' && (
          <TeacherMode
            book={book}
            currentParagraph={currentParagraph}
            chapterCompleted={chapterCompleted}
            onQuizComplete={onQuizComplete}
          />
        )}
        {mode === 'librarian' && (
          <LibrarianMode
            book={book}
            allBooks={allBooks}
            onSelectBook={onSelectBook}
            onClose={onClose}
          />
        )}
        {mode === 'reader' && <ReaderMode book={book} currentParagraph={currentParagraph} />}
      </div>
    </div>
  );
};
