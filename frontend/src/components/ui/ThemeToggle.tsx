import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { IconButton } from './IconButton';

const iconBase = 'absolute inset-0 transition-[opacity,transform] duration-states ease-out';
const iconOn = 'opacity-100 rotate-0 scale-100';
const iconOff = 'opacity-0 scale-75';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('reed-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('reed-theme', 'light');
    }
  }, [isDark]);

  return (
    <IconButton
      variant="outline"
      onClick={() => setIsDark(!isDark)}
      title={isDark ? 'Cambiar a tema Papiro' : 'Cambiar a tema Noche'}
      aria-label="Tema Noche"
      aria-pressed={isDark}
    >
      {/* Both icons stay mounted so they can cross-fade and rotate instead of popping. */}
      <span className="relative h-5 w-5">
        <Moon size={20} strokeWidth={1.75} aria-hidden="true" className={`${iconBase} ${isDark ? `${iconOff} -rotate-90` : iconOn}`} />
        <Sun size={20} strokeWidth={1.75} aria-hidden="true" className={`${iconBase} ${isDark ? iconOn : `${iconOff} rotate-90`}`} />
      </span>
    </IconButton>
  );
};
