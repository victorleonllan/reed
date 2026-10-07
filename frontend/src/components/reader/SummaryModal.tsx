import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Surface } from '../ui/Surface';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Small caps label above the title, with the reed mark. */
  eyebrow: string;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
}

/**
 * Shell shared by the reader's modals: Surface card, motion entrance (scale 0.98 → 1, fade),
 * Escape to close and focus kept inside while open, then returned to where it was.
 */
export const ReaderModal: React.FC<ReaderModalProps> = ({ isOpen, onClose, eyebrow, title, closeLabel, children }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const reduceMotion = useReducedMotion();

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
      if (!items.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = dialogRef.current?.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    // Focus that escapes (a click on the backdrop, a programmatic jump) comes back in.
    const onFocusIn = (event: FocusEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        (focusables()[0] ?? dialogRef.current).focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocusIn);
      previous?.focus?.();
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="reader-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
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
            aria-label={title}
            tabIndex={-1}
            className="w-full max-w-xl outline-none"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <Surface elevation={3} padding="md" className="relative text-ink sm:p-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <IconButton aria-label={closeLabel} size="sm" className="absolute top-4 right-4 text-ink-muted" onClick={onClose}>
                <X size={18} strokeWidth={1.75} />
              </IconButton>
              <div className="flex items-center gap-2 mb-1 pr-10">
                <span className="w-[2px] h-4 bg-reed rounded-pill" aria-hidden="true" />
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wider font-sans">{eyebrow}</span>
              </div>
              <h3 className="font-serif font-semibold text-2xl text-ink mb-4 pr-10">{title}</h3>
              {children}
            </Surface>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ModalLoading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="py-12 text-center text-ink-muted text-sm font-sans flex flex-col items-center justify-center gap-3">
    <span className="w-5 h-5 border-2 border-reed border-t-transparent rounded-full animate-spin" aria-hidden="true" />
    <span>{children}</span>
  </div>
);

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle: string;
  summaryText: string;
  isLoading?: boolean;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  chapterTitle,
  summaryText,
  isLoading = false,
}) => (
  <ReaderModal isOpen={isOpen} onClose={onClose} eyebrow="Resumen de 1 minuto" title={chapterTitle} closeLabel="Cerrar resumen">
    {isLoading ? (
      <ModalLoading>Reed está sintetizando el capítulo...</ModalLoading>
    ) : (
      <div className="bg-paper p-5 rounded-md border border-line mb-6">
        <p className="font-serif text-[17px] leading-[28px] text-ink whitespace-pre-line">{summaryText}</p>
      </div>
    )}
    <div className="flex justify-end gap-3 pt-4 border-t border-line">
      <Button variant="primary" onClick={onClose}>
        Seguir leyendo
      </Button>
    </div>
  </ReaderModal>
);
