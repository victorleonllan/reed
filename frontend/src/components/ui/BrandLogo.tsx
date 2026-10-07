import React from 'react';
import logo from '../../assets/reed/logo.png';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

// Heights on the 4px grid, so the logo lines up with buttons of the same size (sm 28, md 36, lg 48).
const heights = {
  sm: 'h-7',
  md: 'h-9',
  lg: 'h-12',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showTagline = false }) => {
  return (
    <div className="flex flex-col">
      <img
        src={logo}
        alt="Reed"
        draggable={false}
        decoding="async"
        className={`${heights[size]} w-auto select-none`}
      />
      {showTagline && (
        <span className="text-caption text-ink-muted mt-1 font-sans">
          El amigo curioso que ya leyó el libro y te lo cuenta con calma.
        </span>
      )}
    </div>
  );
};
