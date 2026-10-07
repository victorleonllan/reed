import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import { ReadingPrefs } from '../../types';
import { IconButton } from '../ui/IconButton';
import { Surface } from '../ui/Surface';

export interface ReadingTheme {
  bg: string;
  fg: string;
  muted: string;
  page: string;
}

export const READING_THEMES: Record<ReadingPrefs['theme'], ReadingTheme> = {
  light: { bg: '#f7f3ea', fg: '#1f2a22', muted: '#586257', page: '#fffdf8' },
  sepia: { bg: '#f3e6c8', fg: '#3d2b1f', muted: '#6d5844', page: '#f8efdc' },
  dark: { bg: '#161b17', fg: '#ece6d8', muted: '#a9ad9f', page: '#1f2621' },
};

const FONT_SIZE = { sm: 17, md: 20, lg: 24 };
const LINE_HEIGHT = { compact: 1.5, normal: 1.75, wide: 2.05 };

/** The reading controls (Aa, Contenido) fade out after a moment without moving the pointer. */
export function useIdleChrome(delayMs = 2800) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let timer = window.setTimeout(() => setVisible(false), delayMs);
    const reveal = () => {
      setVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVisible(false), delayMs);
    };
    window.addEventListener('mousemove', reveal);
    window.addEventListener('touchstart', reveal);
    return () => {
      window.removeEventListener('mousemove', reveal);
      window.removeEventListener('touchstart', reveal);
      window.clearTimeout(timer);
    };
  }, [delayMs]);
  return visible;
}

/** Inline style for the reading column, derived from the reader's preferences. */
export const readingTextStyle = (prefs: ReadingPrefs): React.CSSProperties => ({
  fontFamily: prefs.font === 'serif' ? 'Literata, Georgia, serif' : '"Atkinson Hyperlegible", system-ui, sans-serif',
  fontSize: FONT_SIZE[prefs.fontScale],
  lineHeight: LINE_HEIGHT[prefs.leading],
  color: READING_THEMES[prefs.theme].fg,
});

interface ReadingSettingsProps {
  prefs: ReadingPrefs;
  onChange: (prefs: ReadingPrefs) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Colour of the "Aa" trigger, so it sits quietly on any reading theme. */
  color?: string;
}

/** "Aa" button with a popover: font size, font, line height and theme, applied live to the column. */
export const ReadingSettings: React.FC<ReadingSettingsProps> = ({ prefs, onChange, open, onOpenChange, color }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const patch = (partial: Partial<ReadingPrefs>) => onChange({ ...prefs, ...partial });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        aria-label="Ajustes de lectura"
        aria-expanded={open}
        aria-haspopup="dialog"
        size="sm"
        onClick={() => onOpenChange(!open)}
        className="font-serif text-lg leading-none hover:bg-transparent hover:opacity-70"
        style={{ color }}
      >
        Aa
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Ajustes de lectura"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-right"
          >
            <Surface elevation={3} padding="sm" className="text-ink text-sm space-y-4">
              <SettingRow label="Tamaño">
                <IconButton
                  aria-label="Letra más pequeña"
                  variant="outline"
                  size="sm"
                  disabled={prefs.fontScale === 'sm'}
                  onClick={() => patch({ fontScale: prefs.fontScale === 'lg' ? 'md' : 'sm' })}
                >
                  <Minus size={14} />
                </IconButton>
                <span className="w-8 text-center font-serif" style={{ fontSize: FONT_SIZE[prefs.fontScale] }}>A</span>
                <IconButton
                  aria-label="Letra más grande"
                  variant="outline"
                  size="sm"
                  disabled={prefs.fontScale === 'lg'}
                  onClick={() => patch({ fontScale: prefs.fontScale === 'sm' ? 'md' : 'lg' })}
                >
                  <Plus size={14} />
                </IconButton>
              </SettingRow>
              <SettingRow label="Fuente">
                <Choice active={prefs.font === 'serif'} onClick={() => patch({ font: 'serif' })} className="font-serif">Serif</Choice>
                <Choice active={prefs.font === 'sans'} onClick={() => patch({ font: 'sans' })}>Sans</Choice>
              </SettingRow>
              <SettingRow label="Interlineado">
                <Choice active={prefs.leading === 'compact'} onClick={() => patch({ leading: 'compact' })}>Junto</Choice>
                <Choice active={prefs.leading === 'normal'} onClick={() => patch({ leading: 'normal' })}>Normal</Choice>
                <Choice active={prefs.leading === 'wide'} onClick={() => patch({ leading: 'wide' })}>Amplio</Choice>
              </SettingRow>
              <SettingRow label="Tema">
                {(['light', 'sepia', 'dark'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => patch({ theme: key })}
                    aria-pressed={prefs.theme === key}
                    className={`focus-ring h-8 px-3 rounded-sm border text-xs font-semibold transition-colors duration-states ${
                      prefs.theme === key ? 'border-reed ring-1 ring-reed' : 'border-line'
                    }`}
                    style={{ background: READING_THEMES[key].bg, color: READING_THEMES[key].fg }}
                  >
                    {{ light: 'Claro', sepia: 'Sepia', dark: 'Oscuro' }[key]}
                  </button>
                ))}
              </SettingRow>
              <p
                className="rounded-sm px-3 py-2 border border-line"
                style={{ ...readingTextStyle(prefs), background: READING_THEMES[prefs.theme].page, fontSize: Math.min(FONT_SIZE[prefs.fontScale], 18) }}
              >
                Así se verá la página.
              </p>
            </Surface>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="w-24 text-xs uppercase tracking-wider text-ink-muted">{label}</span>
    {children}
  </div>
);

const Choice: React.FC<{ active: boolean; onClick: () => void; className?: string; children: React.ReactNode }> = ({
  active,
  onClick,
  className = '',
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`focus-ring h-8 px-3 rounded-sm border text-xs transition-colors duration-states ${
      active ? 'border-reed bg-reed-soft text-ink font-bold' : 'border-line text-ink-muted hover:bg-paper-sunk'
    } ${className}`}
  >
    {children}
  </button>
);
