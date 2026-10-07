import { ReedMode } from '../../types';

interface ModeAccent {
  // Raw color for inline styles (halo, reed line); follows light/dark through the CSS variable.
  color: string;
  // Literal Tailwind classes so the JIT scanner picks them up.
  bg: string;
  decoration: string;
}

// One accent per mode, built only from existing tokens.
export const modeAccent: Record<ReedMode, ModeAccent> = {
  sleeping: { color: 'var(--color-ink-muted)', bg: 'bg-ink-muted', decoration: 'decoration-ink-muted' },
  companion: { color: 'var(--color-reed)', bg: 'bg-reed', decoration: 'decoration-reed' },
  teacher: { color: 'var(--color-ambar)', bg: 'bg-ambar', decoration: 'decoration-ambar' },
  librarian: { color: 'var(--color-clay-strong)', bg: 'bg-clay-strong', decoration: 'decoration-clay-strong' },
  reader: { color: 'var(--color-reed-strong)', bg: 'bg-reed-strong', decoration: 'decoration-reed-strong' },
};
