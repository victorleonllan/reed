import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Library, UserRound, Warehouse } from 'lucide-react';
import { AppView } from '../../types';

interface MobileNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const navItems = [
  { view: 'library', label: 'Biblioteca', Icon: Library },
  { view: 'catalog', label: 'Almacén', Icon: Warehouse },
  { view: 'profile', label: 'Perfil', Icon: UserRound },
] as const;

// Bottom navigation for phones (< 640px). Hidden in the reader: down there the space belongs to the
// listening bar and Reed's button.
export const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate }) => {
  const reduceMotion = useReducedMotion();
  if (currentView === 'reader') return null;

  return (
    <nav
      aria-label="Secciones"
      className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-paper/95 backdrop-blur-sm border-t border-line pb-[env(safe-area-inset-bottom)] transition-colors duration-states"
    >
      <ul className="grid grid-cols-3">
        {navItems.map(({ view, label, Icon }) => {
          const active = currentView === view;
          return (
            <li key={view}>
              <button
                type="button"
                onClick={() => onNavigate(view)}
                aria-current={active ? 'page' : undefined}
                className={`relative w-full h-16 flex flex-col items-center justify-center gap-1 text-caption font-bold transition-colors duration-states ${
                  active ? 'text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {/* Positioned with a negative margin, not a translate: motion owns `transform` here. */}
                {active && (
                  <motion.span
                    layoutId="mobile-nav-active-item"
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -ml-5 w-10 h-[2px] rounded-pill bg-reed"
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }}
                  />
                )}
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" className={active ? 'text-reed' : undefined} />
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
