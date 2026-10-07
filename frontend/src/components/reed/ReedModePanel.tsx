import React from 'react';
import { Book, Paragraph, ReedMode } from '../../types';
import { useReed } from '../../context/ReedContext';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { ReedCharacter } from './ReedCharacter';
import { modeAccent } from './modeTheme';
import { SleepingMode } from './modes/SleepingMode';
import { CompanionMode } from './modes/CompanionMode';
import { TeacherMode } from './modes/TeacherMode';
import { LibrarianMode } from './modes/LibrarianMode';
import { ReaderMode } from './modes/ReaderMode';

// Panel rises 12 px on mount and sinks on unmount (the exit runs when the parent uses AnimatePresence).
const panelVariants: Variants = {
  hidden: { opacity: 0, y: 12, transition: { duration: 0.16, ease: 'easeIn' } },
  shown: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

// Mode content and title cross: the old one leaves 8 px to one side, the new one enters from the other.
const crossVariants: Variants = {
  enter: { opacity: 0, x: 8 },
  center: { opacity: 1, x: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.14, ease: 'easeIn' } },
};

// Reduced motion: 120 ms fades only.
const fadeVariants: Variants = {
  hidden: { opacity: 0, transition: { duration: 0.12 } },
  shown: { opacity: 1, transition: { duration: 0.12 } },
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const modeTitles: Partial<Record<ReedMode, string>> = {
  companion: 'Modo Compañero · Leyendo contigo',
  teacher: 'Modo Profesor · Comprensión y guía',
  librarian: 'Modo Bibliotecario · Tu biblioteca',
  reader: 'Modo Lector · Audio y ritmo',
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
  const reduceMotion = useReducedMotion() ?? false;

  if (mode === 'sleeping') {
    return <SleepingMode onClose={onClose} />;
  }

  return (
    <motion.div
      variants={reduceMotion ? fadeVariants : panelVariants}
      initial="hidden"
      animate="shown"
      exit="hidden"
      className="fixed z-40 bottom-[6.5rem] right-[max(0.75rem,calc(50vw-36rem))] w-[min(22rem,calc(100vw-2rem))] max-h-[min(26rem,calc(100dvh-9.5rem))] bg-paper-raised border border-line-strong rounded-lg shadow-2xl overflow-hidden font-sans flex flex-col"
    >
      <div className="p-3 bg-paper border-b border-line flex items-center justify-between gap-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            variants={reduceMotion ? fadeVariants : crossVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <ReedCharacter mode={mode} size="sm" />
            <span
              className={`min-w-0 text-sm font-bold leading-snug text-ink underline decoration-2 underline-offset-4 ${modeAccent[mode].decoration}`}
            >
              {modeTitles[mode]}
            </span>
          </motion.div>
        </AnimatePresence>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-paper-sunk transition-colors"
          aria-label="Cerrar panel"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="p-4 overflow-y-auto overflow-x-hidden flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            variants={reduceMotion ? fadeVariants : crossVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="space-y-4"
          >
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
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
