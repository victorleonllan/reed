import React from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger'
  // Legacy names still used across the screens: `quiet` is `ghost`, `voice` is the amber audio button.
  | 'quiet'
  | 'voice';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a thin spinner in place of the icon and disables the button. */
  loading?: boolean;
  /** Icon rendered to the left of the label. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-[13px] leading-[18px] px-3 py-1.5 gap-1.5 rounded-sm',
  md: 'text-[15px] leading-[20px] px-4 py-2.5 gap-2 rounded-md',
  lg: 'text-[16px] leading-[24px] px-5 py-3 gap-2.5 rounded-md',
};

const spinnerSizes: Record<ButtonSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-[18px] w-[18px]',
};

const ghost = 'bg-transparent text-ink hover:bg-paper-sunk active:bg-paper-sunk';

const variantStyles: Record<ButtonVariant, string> = {
  // Reed green: one per view
  primary: 'bg-reed text-on-reed hover:bg-reed-strong shadow-1',
  secondary: 'bg-clay text-on-clay border border-clay-strong hover:brightness-95',
  ghost,
  quiet: ghost,
  outline: 'bg-transparent text-ink border border-line-strong hover:bg-paper-sunk',
  danger: 'bg-transparent text-danger border border-danger hover:bg-danger hover:text-paper',
  // Amber: voice / audio only
  voice: 'bg-ambar text-on-ambar hover:brightness-105 shadow-1',
};

const disabledStyles = 'bg-paper-sunk text-ink-muted border-transparent shadow-none opacity-70 cursor-not-allowed';

export const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    aria-hidden="true"
    className={`inline-block shrink-0 rounded-full border-2 border-current border-r-transparent animate-spin ${className}`}
  />
);

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  type = 'button',
  children,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const classes = [
    'inline-flex items-center justify-center font-sans font-bold select-none focus-ring',
    'transition-[background-color,color,box-shadow,transform,filter] duration-states',
    sizeStyles[size],
    // While loading the button keeps its colour so the change of state reads as "working", not "off".
    disabled && !loading ? disabledStyles : variantStyles[variant],
    isDisabled ? 'cursor-not-allowed' : 'active:scale-[0.99]',
    loading ? 'cursor-wait opacity-90' : '',
    className,
  ].join(' ');

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {loading ? <Spinner className={spinnerSizes[size]} /> : icon && <span aria-hidden="true" className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
