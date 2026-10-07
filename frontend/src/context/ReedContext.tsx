import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ReedMode, ReadingSessionStats } from '../types';
import { identify, reset, track } from '../lib/analytics';
import { useAccount } from './AccountContext';

interface ReadingHabits {
  averageReadingSpeedWpm: number;
  usualSessionMinutes: number;
  targetDailyPages: number;
  recommendationNote: string;
}

interface ReedContextType {
  mode: ReedMode;
  setMode: (mode: ReedMode) => void;
  wakeUp: (targetMode?: ReedMode) => void;
  putToSleep: () => void;
  sessionStats: ReadingSessionStats;
  startSession: (bookId: string, bookTitle: string, chapterTitle: string, startOrder?: number) => void;
  recordParagraphRead: (order: number) => void;
  habits: ReadingHabits;
}

const defaultSessionStats: ReadingSessionStats = {
  bookId: '',
  bookTitle: '',
  chapterTitle: '',
  startParagraphOrder: 1,
  endParagraphOrder: 1,
  secondsReading: 0,
  startedAt: new Date().toISOString(),
};

const ReedContext = createContext<ReedContextType | undefined>(undefined);

export const ReedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ReedMode>(() => {
    const saved = localStorage.getItem('reed-active-mode') as ReedMode;
    return saved && ['sleeping', 'companion', 'teacher', 'librarian', 'reader'].includes(saved)
      ? saved
      : 'companion';
  });

  const [sessionStats, setSessionStats] = useState<ReadingSessionStats>(defaultSessionStats);

  // Analytics identity: only the Clerk user id (never email or name); reset on sign-out.
  const { user, clerkEnabled } = useAccount();
  const userId = clerkEnabled ? user?.id ?? null : null;
  const identifiedId = useRef<string | null>(null);
  useEffect(() => {
    if (userId === identifiedId.current) return;
    if (userId) identify(userId);
    else reset();
    identifiedId.current = userId;
  }, [userId]);

  const setMode = (newMode: ReedMode) => {
    if (newMode !== mode) track('mode_changed', { from: mode, to: newMode });
    setModeState(newMode);
    localStorage.setItem('reed-active-mode', newMode);
  };

  const wakeUp = (targetMode: ReedMode = 'companion') => {
    setMode(targetMode);
  };

  const putToSleep = () => {
    setMode('sleeping');
  };

  const startSession = (bookId: string, bookTitle: string, chapterTitle: string, startOrder: number = 1) => {
    setSessionStats({
      bookId,
      bookTitle,
      chapterTitle,
      startParagraphOrder: startOrder,
      endParagraphOrder: startOrder,
      secondsReading: 0,
      startedAt: new Date().toISOString(),
    });
  };

  const recordParagraphRead = (order: number) => {
    setSessionStats(prev => ({
      ...prev,
      endParagraphOrder: Math.max(prev.endParagraphOrder, order),
    }));
  };

  // Timer para medir la duración de la sesión activa
  useEffect(() => {
    if (mode === 'sleeping') return;

    const timer = setInterval(() => {
      setSessionStats(prev => ({
        ...prev,
        secondsReading: prev.secondsReading + 1,
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [mode]);

  // Guía de lectura adaptativa basada en hábitos (Slide 03 y Req 4.3)
  const habits: ReadingHabits = {
    averageReadingSpeedWpm: 180,
    usualSessionMinutes: 20,
    targetDailyPages: 12,
    recommendationNote: sessionStats.secondsReading > 900
      ? 'Has mantenido una excelente concentración hoy. Un buen momento para cerrar el capítulo con calma.'
      : 'Tu sesión podría durar unos 20 minutos. Hoy sería ideal continuar hasta terminar este pasaje.',
  };

  return (
    <ReedContext.Provider
      value={{
        mode,
        setMode,
        wakeUp,
        putToSleep,
        sessionStats,
        startSession,
        recordParagraphRead,
        habits,
      }}
    >
      {children}
    </ReedContext.Provider>
  );
};

export const useReed = () => {
  const context = useContext(ReedContext);
  if (!context) {
    throw new Error('useReed must be used within a ReedProvider');
  }
  return context;
};
