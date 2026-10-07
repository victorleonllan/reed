import React from 'react';

type IconButtonVariant = 'ghost' | 'outline' | 'primary';
type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  /** Required: an icon alone says nothing to a screen reader. */
  'aria-label': string;
  children: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8 rounded-sm',
  md: 'h-10 w-10 rounded-md',
  lg: 'h-12 w-12 rounded-md',
};

const variantStyles: Record<IconButtonVariant, string> = {
  ghost: 'bg-transparent text-ink hover:bg-paper-sunk',
  outline: 'bg-transparent text-ink border border-line hover:bg-paper-sunk',
  primary: 'bg-reed text-on-reed hover:bg-reed-strong shadow-1',
};

export const IconButton: React.FC<IconButtonProps> = ({
  variant = 'ghost',
  size = 'md',
  type = 'button',
  className = '',
  disabled,
  children,
  ...props
}) => (
  <button
    type={type}
    disabled={disabled}
    className={[
      'relative inline-flex shrink-0 items-center justify-center focus-ring',
      'transition-colors duration-states',
      sizeStyles[size],
      variantStyles[variant],
      disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.97]',
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </button>
);
