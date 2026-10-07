import React from 'react';

interface ProgressBarProps {
  label?: string;
  percent: number;
  className?: string;
  showText?: boolean;
}

/** Reading progress drawn as the reed: a thin line with a rounded tip. */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  percent,
  className = '',
  showText = true,
}) => {
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div className={`w-full ${className}`}>
      {showText && (
        <div className="flex justify-between items-center text-small text-ink-muted mb-2 font-sans">
          <span>{label}</span>
          <span className="font-bold tabular-nums">{clampedPercent}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clampedPercent}
        className="relative w-full h-[3px] rounded-pill bg-paper-sunk"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-pill bg-reed transition-[width] duration-panels ease-out"
          style={{ width: `${clampedPercent}%` }}
        />
        {clampedPercent > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-reed transition-[left] duration-panels ease-out"
            style={{ left: `${clampedPercent}%` }}
          />
        )}
      </div>
    </div>
  );
};
