import React from 'react';
import { ReedMode } from '../../types';
import { modeLabels, modePortraits } from './portraits';

type ReedCharacterSize = 'sm' | 'md' | 'lg' | 'xl';

interface ReedCharacterProps {
  mode: ReedMode;
  size?: ReedCharacterSize;
  className?: string;
}

// Fixed height, automatic width: the cut-out keeps its own proportions.
const sizeClasses: Record<ReedCharacterSize, string> = {
  sm: 'h-16',
  md: 'h-20',
  lg: 'h-32',
  xl: 'h-48',
};

// Reed drawn without a visible container: no background, border or clipping.
// A soft contact shadow under the feet keeps it floating on the page.
export const ReedCharacter: React.FC<ReedCharacterProps> = ({ mode, size = 'md', className = '' }) => (
  <span className={`relative inline-flex flex-shrink-0 items-end justify-center ${sizeClasses[size]} ${className}`}>
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-1/2 h-[8%] w-[70%] -translate-x-1/2 translate-y-1/3 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(64,46,24,0.28),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(236,230,216,0.18),transparent_70%)]"
    />
    <img
      src={modePortraits[mode]}
      alt={`Reed en modo ${modeLabels[mode].label}`}
      draggable={false}
      decoding="async"
      className="relative h-full w-auto object-contain [filter:drop-shadow(0_2px_3px_rgba(64,46,24,0.18))] dark:[filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.45))]"
    />
  </span>
);
