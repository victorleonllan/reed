import React from 'react';

interface BadgeProps {
  variant?: 'neutral' | 'reed' | 'clay' | 'ambar' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = '',
}) => {
  const variantStyles = {
    neutral: 'bg-paper-sunk text-ink-muted',
    reed: 'bg-reed-soft text-ink font-semibold',
    clay: 'bg-clay text-on-clay font-semibold',
    ambar: 'bg-ambar text-on-ambar font-semibold',
    danger: 'border border-danger text-danger bg-transparent',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-caption rounded-pill whitespace-nowrap transition-colors duration-states font-sans ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
