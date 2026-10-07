import React, { useState, useRef, useEffect } from 'react';
import { ReedMode } from '../../types';
import { useReed } from '../../context/ReedContext';
import { Sun } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { modeLabels } from './portraits';
import { ReedCharacter } from './ReedCharacter';
import { modeAccent } from './modeTheme';

const modeDescriptions: Record<ReedMode, string> = {
  sleeping: 'Reed no interviene, ni muestra resúmenes ni preguntas.',
  companion: 'Un amigo que lee contigo, resume con calma y cuenta datos curiosos.',
  teacher: 'Te ayuda a razonar con pistas socráticas y evalúa tu sesión.',
  librarian: 'Te sugiere lecturas afines y responde dudas de tu biblioteca.',
  reader: 'Muestra la barra de audio inferior y lee el texto sincronizado.',
};

const modeOrder: ReedMode[] = ['sleeping', 'companion', 'teacher', 'librarian', 'reader'];

// Menu grows from the button's corner; options follow 30 ms apart.
const menuVariants: Variants = {
  closed: { opacity: 0, scale: 0.96, transition: { duration: 0.12, ease: 'easeIn' } },
  open: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.18, ease: 'easeOut', staggerChildren: 0.03 },
  },
};
const optionVariants: Variants = {
  closed: { opacity: 0, y: 4 },
  open: { opacity: 1, y: 0, transition: { duration: 0.16, ease: 'easeOut' } },
};

// Reduced motion: plain 120 ms fades, no scale or stagger.
const menuFadeVariants: Variants = {
  closed: { opacity: 0, transition: { duration: 0.12 } },
  open: { opacity: 1, transition: { duration: 0.12 } },
};
const optionFadeVariants: Variants = {
  closed: { opacity: 1 },
  open: { opacity: 1 },
};

interface ReedBubbleProps {
  onOpenModeAction?: (actionType: string) => void;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  className?: string;
}

export const ReedBubble: React.FC<ReedBubbleProps> = ({
  onOpenModeAction,
  menuOpen,
  onMenuOpenChange,
  className = '',
}) => {
  const { mode, setMode } = useReed();
  const reduceMotion = useReducedMotion() ?? false;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = menuOpen ?? internalOpen;
  const setIsOpen = (open: boolean) => {
    onMenuOpenChange?.(open);
    if (menuOpen === undefined) setInternalOpen(open);
  };
  const popoverRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const modeOptions = modeOrder.map((key) => ({
    key,
    ...modeLabels[key],
    desc: modeDescriptions[key],
  }));

  const currentModeInfo = modeOptions.find(m => m.key === mode);

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={`Reed: ${currentModeInfo?.label || mode} («${currentModeInfo?.phrase}»). Clic para cambiar de modo.`}
        className="group relative flex items-end justify-center rounded-full transition-transform duration-states focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
        aria-label="Menú de Reed"
      >
        {/* Soft halo in the mode's accent; it shifts color with the mode and brightens on hover/focus. */}
        <span
          aria-hidden="true"
          style={{ backgroundColor: modeAccent[mode].color }}
          className="pointer-events-none absolute inset-2 rounded-full opacity-15 blur-xl transition-[background-color,opacity] duration-panels group-hover:opacity-35 group-focus-visible:opacity-35 motion-reduce:transition-none"
        />
        <ReedCharacter mode={mode} size="md" animated />
      </button>

      <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={reduceMotion ? menuFadeVariants : menuVariants}
          initial="closed"
          animate="open"
          exit="closed"
          style={{ originX: 1, originY: 1 }}
          className="fixed z-50 bottom-[6.5rem] right-[max(0.75rem,calc(50vw-36rem))] w-[min(20rem,calc(100vw-2rem))] max-h-[min(24rem,calc(100dvh-9.5rem))] overflow-x-hidden overflow-y-auto bg-paper-raised border border-line-strong shadow-2xl rounded-lg p-3.5 font-sans"
        >
          <div className="pb-2.5 mb-2.5 border-b border-line">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block font-sans">
              Acompañamiento
            </span>
            <h4 className="font-serif font-semibold text-lg text-ink leading-tight">
              ¿Cómo te acompaña Reed?
            </h4>
          </div>

          {/* Opción directa: Despertar a Reed si está dormido */}
          {mode === 'sleeping' && (
            <div className="mb-3 p-3 bg-paper rounded-md border border-line-strong flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-ink block">Reed está descansando</span>
                <span className="text-[11px] text-ink-muted">Sin avisos ni interrupciones</span>
              </div>
              <button
                onClick={() => {
                  setMode('companion');
                  setIsOpen(false);
                  if (onOpenModeAction) onOpenModeAction('companion');
                }}
                className="px-3 py-1.5 bg-reed text-on-reed text-xs font-bold rounded-md hover:bg-reed-strong transition-colors flex items-center gap-1.5"
              >
                <Sun size={14} />
                <span>Despertar a Reed</span>
              </button>
            </div>
          )}

          {/* Lista de modos */}
          <div className="space-y-1.5">
            {modeOptions.map((opt) => {
              const isActive = mode === opt.key;
              return (
                <motion.button
                  key={opt.key}
                  variants={reduceMotion ? optionFadeVariants : optionVariants}
                  title={opt.desc}
                  onClick={() => {
                    setMode(opt.key);
                    setIsOpen(false);
                    if (onOpenModeAction) {
                      onOpenModeAction(opt.key);
                    }
                  }}
                  className={`w-full text-left p-2 rounded-md transition-colors duration-states flex items-center gap-3 border ${
                    isActive
                      ? 'bg-clay border-clay-strong text-on-clay shadow-sm'
                      : 'border-transparent hover:bg-paper text-ink'
                  }`}
                >
                  <span className="flex w-14 flex-shrink-0 justify-center">
                    <ReedCharacter mode={opt.key} size="sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className={`block font-bold text-sm ${isActive ? 'text-on-clay' : 'text-ink'}`}>
                      {opt.label}
                    </span>
                    <span className={`block text-xs font-serif italic ${isActive ? 'text-on-clay/80' : 'text-ink-muted'}`}>
                      «{opt.phrase}»
                    </span>
                    <p className={`text-xs mt-0.5 leading-snug ${isActive ? 'text-on-clay/80' : 'text-ink-muted'}`}>
                      {opt.desc}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <p className="mt-2.5 border-t border-line pt-2.5 text-center text-xs leading-snug text-ink-muted">
            {mode === 'reader'
              ? 'El audio está activo en modo Lector.'
              : 'El audio aparece solo en modo Lector.'}
          </p>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
