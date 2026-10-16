import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AppView } from '../../types';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';
import { UserAvatar } from '../auth/UserAvatar';
import { useAccount } from '../../context/AccountContext';
import { Library, UserRound, Warehouse } from 'lucide-react';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  bookTitle?: string;
  chapterTitle?: string;
}

const navItems = [
  { view: 'library', label: 'Biblioteca', Icon: Library },
  { view: 'catalog', label: 'Almacén', Icon: Warehouse },
  { view: 'profile', label: 'Perfil', Icon: UserRound },
] as const;

// Scroll distance (px) before the reader header reacts, so small jitters don't toggle it.
const SCROLL_THRESHOLD = 8;

// In the reader the header slides away while scrolling down and comes back on scroll up.
// Exported so the mobile progress bar can follow it (R-042).
export function useHideOnScroll(enabled: boolean) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    setHidden(false);
    if (!enabled) return;
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (Math.abs(delta) < SCROLL_THRESHOLD) return;
      setHidden(delta > 0 && y > 64);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled]);

  return hidden;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  bookTitle,
  chapterTitle,
}) => {
  const { user } = useAccount();
  const reduceMotion = useReducedMotion();
  const hidden = useHideOnScroll(currentView === 'reader');

  const itemClass = (view: AppView) =>
    `relative flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-sm transition-colors duration-states ${
      currentView === view ? 'text-ink' : 'text-ink-muted hover:text-ink'
    }`;

  return (
    <header
      className={`sticky top-0 z-30 bg-paper/95 backdrop-blur-sm border-b border-line transition-[transform,background-color,border-color] duration-states ease-out motion-reduce:transition-none ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('library')}
            className="text-left focus:outline-none focus-visible:outline-2 rounded-sm"
            aria-label="Ir a tu biblioteca"
          >
            <BrandLogo size="md" />
          </button>

          {currentView === 'reader' && bookTitle && (
            <div className="hidden md:flex items-center gap-2 text-sm text-ink-muted truncate">
              <span className="text-line-strong">/</span>
              <span className="text-ink font-medium truncate">{bookTitle}</span>
              {chapterTitle && (
                <>
                  <span className="text-line-strong">·</span>
                  <span className="truncate">{chapterTitle}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Below 640px the navigation lives in MobileNav, at the bottom of the screen. */}
          <nav aria-label="Secciones" className="hidden sm:flex items-center gap-1">
            {navItems.map(({ view, label, Icon }) => {
              const active = currentView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => onNavigate(view)}
                  className={itemClass(view)}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span>{label}</span>
                  {active && (
                    <motion.span
                      layoutId="header-active-item"
                      aria-hidden="true"
                      className="absolute left-3 right-3 -bottom-px h-[2px] rounded-pill bg-reed"
                      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="hidden sm:block h-5 w-px bg-line mx-1" />
          <ThemeToggle />

          {user && (
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2 ml-1 rounded-pill"
              title={user.name}
              aria-label="Abrir tu perfil"
            >
              <UserAvatar name={user.name} imageUrl={user.avatarUrl} />
              <span className="text-sm font-medium text-ink hidden lg:inline max-w-[8rem] truncate">{user.name}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
