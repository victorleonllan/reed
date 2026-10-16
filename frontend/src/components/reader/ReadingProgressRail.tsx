import React, { useEffect } from 'react';
import { List } from 'lucide-react';
import { useHideOnScroll } from '../ui/Header';

interface RailChapter {
  chapterNumber: number;
  chapterTitle: string;
  /** Index of the chapter's first page. */
  index: number;
}

interface ReadingProgressRailProps {
  progress: number;
  totalPages: number;
  chapters: RailChapter[];
  currentChapter: number;
  onJump: (pageIndex: number) => void;
  /** Track colour, taken from the reading theme. */
  trackColor: string;
}

/**
 * Book progress as the reed: a thin vertical line pinned to the left margin on desktop, a 2px bar
 * under the header on mobile. Small marks at each chapter start jump to that chapter.
 */
export const ReadingProgressRail: React.FC<ReadingProgressRailProps> = ({
  progress,
  totalPages,
  chapters,
  currentChapter,
  onJump,
  trackColor,
}) => {
  const percent = Math.max(0, Math.min(100, progress));
  const at = (index: number) => (totalPages > 0 ? (index / totalPages) * 100 : 0);
  // Same hide-on-scroll as the header: when it slides away, the bar moves up with it instead of
  // floating 64px down over the text.
  const headerHidden = useHideOnScroll(true);

  return (
    <>
      {/* Mobile: horizontal, 2px, under the sticky header (or at the top edge while it is hidden) */}
      <div
        className={`lg:hidden fixed top-16 inset-x-0 z-20 h-[2px] transition-transform duration-states ease-out motion-reduce:transition-none ${
          headerHidden ? '-translate-y-16' : 'translate-y-0'
        }`}
        style={{ background: `${trackColor}33` }}
        role="progressbar"
        aria-label="Progreso del libro"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-reed transition-[width] duration-states" style={{ width: `${percent}%` }} />
      </div>

      {/* Desktop: vertical reed on the left margin */}
      <nav aria-label="Capítulos" className="hidden lg:block fixed left-8 xl:left-12 top-28 bottom-32 z-20 w-6">
        <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-px rounded-pill" style={{ background: `${trackColor}55` }} />
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-[2px] rounded-pill bg-reed transition-[height] duration-states"
          style={{ height: `${percent}%` }}
          role="progressbar"
          aria-label="Progreso del libro"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        {chapters.length > 1 &&
          chapters.map((chapter) => {
            const isCurrent = chapter.chapterNumber === currentChapter;
            return (
              <button
                key={chapter.chapterNumber}
                type="button"
                onClick={() => onJump(chapter.index)}
                aria-label={`Ir a ${chapter.chapterTitle}`}
                aria-current={isCurrent ? 'true' : undefined}
                className="group focus-ring absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-4 flex items-center justify-center rounded-sm"
                style={{ top: `${at(chapter.index)}%` }}
              >
                <span
                  className={`block h-px rounded-pill transition-all duration-states group-hover:w-3 ${isCurrent ? 'w-3 bg-reed' : 'w-2'}`}
                  style={isCurrent ? undefined : { background: trackColor }}
                />
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-sm bg-paper-raised border border-line shadow-2 px-2 py-1 text-xs text-ink opacity-0 transition-opacity duration-states group-hover:opacity-100 group-focus-visible:opacity-100">
                  {chapter.chapterTitle}
                </span>
              </button>
            );
          })}
      </nav>
    </>
  );
};

interface ChapterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapters: RailChapter[];
  currentChapter: number;
  onJump: (pageIndex: number) => void;
  /** Colour of the "Contenido" trigger, from the reading theme. */
  color: string;
}

/** "Contenido": the trigger and the side drawer with every chapter. */
export const ChapterDrawer: React.FC<ChapterDrawerProps> = ({ open, onOpenChange, chapters, currentChapter, onJump, color }) => {
  const position = chapters.findIndex((chapter) => chapter.chapterNumber === currentChapter);
  const jump = (index: number) => {
    onJump(index);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="focus-ring inline-flex items-center gap-1.5 px-2 py-1 rounded-sm hover:opacity-70"
        style={{ color }}
      >
        <List size={16} />
        Contenido
      </button>
      {open && (
        <div className="fixed inset-0 z-40 bg-ink/30 animate-fadeIn" onClick={() => onOpenChange(false)}>
          <aside
            aria-label="Contenido del libro"
            className="absolute left-0 top-0 bottom-0 w-full max-w-sm bg-paper-raised text-ink border-r border-line shadow-3 p-6 overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl">Contenido</h2>
              <div className="flex gap-3 text-xs">
                <button type="button" className="focus-ring rounded-sm text-ink-muted hover:text-ink disabled:opacity-40" onClick={() => jump(chapters[position - 1].index)} disabled={position <= 0}>
                  Capítulo anterior
                </button>
                <button type="button" className="focus-ring rounded-sm text-ink-muted hover:text-ink disabled:opacity-40" onClick={() => jump(chapters[position + 1].index)} disabled={position < 0 || position >= chapters.length - 1}>
                  Capítulo siguiente
                </button>
              </div>
            </div>
            <ul className="space-y-1">
              {chapters.map((chapter) => (
                <li key={chapter.chapterNumber}>
                  <button
                    type="button"
                    onClick={() => jump(chapter.index)}
                    aria-current={chapter.chapterNumber === currentChapter ? 'true' : undefined}
                    className={`focus-ring w-full text-left px-3 py-2.5 rounded-md text-sm ${chapter.chapterNumber === currentChapter ? 'bg-reed-soft text-ink font-semibold' : 'hover:bg-paper-sunk text-ink'}`}
                  >
                    {chapter.chapterTitle}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </>
  );
};
