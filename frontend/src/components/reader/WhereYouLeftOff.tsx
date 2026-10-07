import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Surface } from '../ui/Surface';

interface WhereYouLeftOffProps {
  open: boolean;
  chapterTitle: string;
  /** Pre-written chapter summary (`chapter.whereYouLeftOffSummary`); never generated here. */
  summary?: string;
  onContinue: () => void;
  onDismiss: () => void;
}

// Scrolling this far (px) means the reader has started reading: the card steps aside.
const SCROLL_DISMISS = 48;
// Opening a book smooth-scrolls the window to the top; ignore that scroll before listening.
const ARM_DELAY_MS = 900;

/** Discreet card above the column when a book with progress opens: "Quedaste en …". */
export const WhereYouLeftOff: React.FC<WhereYouLeftOffProps> = ({ open, chapterTitle, summary, onContinue, onDismiss }) => {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    let startY = 0;
    let armed = false;
    const arm = window.setTimeout(() => {
      startY = window.scrollY;
      armed = true;
    }, ARM_DELAY_MS);
    const onScroll = () => {
      if (armed && Math.abs(window.scrollY - startY) > SCROLL_DISMISS) onDismiss();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(arm);
      window.removeEventListener('scroll', onScroll);
    };
  }, [open, onDismiss]);

  return (
    <AnimatePresence initial={!reduceMotion}>
      {open && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="mx-auto max-w-[40rem] mb-10"
        >
          <Surface as="aside" aria-label="Dónde quedaste" padding="sm" className="relative flex gap-3 text-ink">
            <span className="reed-line" aria-hidden="true" />
            <div className="min-w-0 flex-1 pr-8">
              <p className="text-xs uppercase tracking-wider text-ink-muted">Quedaste en</p>
              <p className="font-serif text-lg leading-snug mt-0.5">{chapterTitle}</p>
              {summary && <p className="text-sm text-ink-muted mt-2 leading-relaxed">{summary}</p>}
              <Button variant="primary" size="sm" className="mt-3" onClick={onContinue}>
                Seguir
              </Button>
            </div>
            <IconButton aria-label="Cerrar" size="sm" className="absolute top-2 right-2 text-ink-muted" onClick={onDismiss}>
              <X size={16} strokeWidth={1.75} />
            </IconButton>
          </Surface>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
