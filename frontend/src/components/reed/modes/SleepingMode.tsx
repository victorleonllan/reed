import React from 'react';
import { useReed } from '../../../context/ReedContext';
import { Button } from '../../ui/Button';
import { X } from 'lucide-react';
import { ReedCharacter } from '../ReedCharacter';

interface SleepingModeProps {
  onClose: () => void;
}

// Short "Reed is asleep" panel; it draws its own smaller frame.
export const SleepingMode: React.FC<SleepingModeProps> = ({ onClose }) => {
  const { setMode } = useReed();

  return (
    <div className="fixed z-40 bottom-[6.5rem] right-[max(0.75rem,calc(50vw-36rem))] w-[min(20rem,calc(100vw-2rem))] max-h-[min(20rem,calc(100dvh-9.5rem))] overflow-y-auto bg-paper-raised border border-line-strong rounded-lg p-4 shadow-2xl animate-slideUp font-sans">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ReedCharacter mode="sleeping" size="sm" />
          <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
            Reed está dormido
          </span>
        </div>
        <button onClick={onClose} className="text-ink-muted hover:text-ink">
          <X size={16} />
        </button>
      </div>
      <p className="text-sm text-ink-muted mb-4 font-serif leading-relaxed">
        «Zzz... Disfruta tu lectura a solas. No te interrumpiré con avisos ni resúmenes mientras descanse.»
      </p>
      <Button variant="primary" size="sm" onClick={() => setMode('companion')} className="w-full">
        Despertar a Reed
      </Button>
    </div>
  );
};
