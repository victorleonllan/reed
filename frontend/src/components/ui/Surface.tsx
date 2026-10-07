import React from 'react';

type SurfaceElevation = 1 | 2 | 3;
type SurfacePadding = 'sm' | 'md' | 'lg';

export interface SurfaceProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  elevation?: SurfaceElevation;
  padding?: SurfacePadding;
}

const elevationStyles: Record<SurfaceElevation, string> = {
  1: 'surface',
  2: 'surface-raised',
  3: 'surface-raised shadow-3',
};

const paddingStyles: Record<SurfacePadding, string> = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

/** Standard card. Wraps the `.surface` classes so screens stop repeating border/shadow/radius by hand. */
export const Surface: React.FC<SurfaceProps> = ({
  as: Component = 'div',
  elevation = 1,
  padding = 'md',
  className = '',
  children,
  ...props
}) => (
  <Component className={`${elevationStyles[elevation]} ${paddingStyles[padding]} ${className}`} {...props}>
    {children}
  </Component>
);
