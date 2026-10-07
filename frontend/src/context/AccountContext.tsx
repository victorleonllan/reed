import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { Book, ReadingActivity, ReadingPrefs, ReadingStatus, UserBookRecord } from '../types';
import { listLibrary, loadBookContent } from '../services/api';
import { evaluateBadges, isNightHour, localDate } from '../lib/badges';
import { clerkEnabled } from '../lib/clerkEnv';
import {
  SessionUser,
  clearSession,
  defaultPrefs,
  emptyActivity,
  findUserByEmail,
  freshUserBook,
  insertUser,
  loadActivity,
  loadAvatarOverride,
  loadLibrary,
  loadPrefs,
  loadSessionUser,
  loadUploads,
  replacePassword,
  saveActivity,
  saveAvatarOverride,
  saveLibrary,
  savePrefs,
  saveSession,
  saveUploads,
  toSessionUser,
  updateStoredUser,
} from '../lib/accountStore';
import { createPasswordRecord, verifyPassword } from '../lib/password';
import { paginateBook } from '../lib/reading';

export interface LibraryEntry {
  book: Book;
  record: UserBookRecord;
}

interface AccountContextValue {
  ready: boolean;
  user: SessionUser | null;
  clerkEnabled: boolean;
  catalog: Book[];
  uploads: Book[];
  library: UserBookRecord[];
  entries: LibraryEntry[];
  prefs: ReadingPrefs;
  activity: ReadingActivity;
  register: (input: { name: string; email: string; password: string }) => Promise<string | null>;
  login: (email: string, password: string) => Promise<string | null>;
  recover: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  setAvatar: (dataUrl: string | null) => void;
  setPrefs: (prefs: ReadingPrefs) => void;
  isInLibrary: (bookId: string) => boolean;
  addToLibrary: (bookId: string) => boolean;
  addUploadedBook: (book: Book) => void;
  saveProgress: (bookId: string, position: { currentChapter: number; currentPage: number; progress: number; status: ReadingStatus }) => void;
  recordReaderUse: () => void;
  recordQuiz: () => void;
  recordNightSession: () => void;
  addReadingSeconds: (seconds: number) => void;
  getBook: (bookId: string) => Book | undefined;
}

const AccountContext = createContext<AccountContextValue | null>(null);

function decorate(book: Book, record: UserBookRecord): Book {
  const pages = paginateBook(book);
  const page = record.currentPage > 0 ? pages[record.currentPage - 1] : undefined;
  return {
    ...book,
    currentChapterNumber: record.status === 'unread' ? 1 : record.currentChapter,
    totalChapters: book.chapters.length || 1,
    progressPercent: record.progress,
    whereYouLeftOff: record.status === 'unread' || !page ? 'Sin empezar' : page.chapterTitle,
  };
}

function touchToday(activity: ReadingActivity): ReadingActivity {
  const today = localDate();
  if (activity.readDates.includes(today)) return activity;
  return { ...activity, readDates: [...activity.readDates, today] };
}

// Sign-in is Clerk only (the backend only trusts Clerk sessions). Without a Clerk key there is no app.
export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (clerkEnabled) return <ClerkAccount>{children}</ClerkAccount>;
  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-6 text-center font-sans">
      <p className="max-w-md text-sm text-ink-muted">
        Falta configurar el inicio de sesión: agrega <code>VITE_CLERK_PUBLISHABLE_KEY</code> en <code>frontend/.env.local</code>.
      </p>
    </div>
  );
};

const LocalAccount: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(() => loadSessionUser());

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const register = useCallback(async (input: { name: string; email: string; password: string }) => {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) return 'Escribe tu nombre.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Escribe un correo válido.';
    if (input.password.length < 6) return 'La contraseña necesita al menos 6 caracteres.';
    if (findUserByEmail(email)) return 'Ya existe una cuenta con ese correo.';
    const { salt, hash } = await createPasswordRecord(input.password);
    const stored = {
      id: crypto.randomUUID(),
      name,
      email,
      salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    };
    insertUser(stored);
    saveSession(stored.id);
    setUser(toSessionUser(stored));
    return null;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const found = findUserByEmail(email);
    if (!found) return 'No encontramos una cuenta con ese correo.';
    const ok = await verifyPassword(password, found.salt, found.passwordHash);
    if (!ok) return 'La contraseña no coincide.';
    saveSession(found.id);
    setUser(toSessionUser(found));
    return null;
  }, []);

  const recover = useCallback(async (email: string, password: string) => {
    if (!findUserByEmail(email)) return 'No encontramos una cuenta con ese correo.';
    if (password.length < 6) return 'La contraseña necesita al menos 6 caracteres.';
    const { salt, hash } = await createPasswordRecord(password);
    replacePassword(email, salt, hash);
    return null;
  }, []);

  const setAvatar = useCallback((dataUrl: string | null) => {
    setUser((current) => {
      if (!current) return current;
      updateStoredUser(current.id, { avatar: dataUrl || undefined });
      return { ...current, avatarUrl: dataUrl || undefined };
    });
  }, []);

  return (
    <AccountState
      user={user}
      setAvatar={setAvatar}
      logout={logout}
      register={register}
      login={login}
      recover={recover}
    >
      {children}
    </AccountState>
  );
};

const ClerkAccount: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);

  useEffect(() => {
    if (!clerkUser) {
      setAvatarOverride(null);
      return;
    }
    setAvatarOverride(loadAvatarOverride(clerkUser.id));
  }, [clerkUser?.id]);

  const user = useMemo<SessionUser | null>(() => {
    if (!isLoaded || !clerkUser) return null;
    return {
      id: clerkUser.id,
      name: clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress || 'Lector',
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      avatarUrl: avatarOverride || clerkUser.imageUrl,
    };
  }, [isLoaded, clerkUser, avatarOverride]);

  const setAvatar = useCallback((dataUrl: string | null) => {
    if (!clerkUser) return;
    saveAvatarOverride(clerkUser.id, dataUrl);
    setAvatarOverride(dataUrl);
  }, [clerkUser]);

  const logout = useCallback(() => {
    void signOut();
  }, [signOut]);

  const unavailable = async () => 'Inicia sesión con tu cuenta para continuar.';

  if (!isLoaded) {
    return <div className="min-h-screen bg-paper" />;
  }

  return (
    <AccountState
      user={user}
      setAvatar={setAvatar}
      logout={logout}
      register={unavailable}
      login={unavailable}
      recover={unavailable}
    >
      {children}
    </AccountState>
  );
};

const AccountState: React.FC<{
  user: SessionUser | null;
  children: React.ReactNode;
  setAvatar: (dataUrl: string | null) => void;
  logout: () => void;
  register: AccountContextValue['register'];
  login: AccountContextValue['login'];
  recover: AccountContextValue['recover'];
}> = ({ user, children, setAvatar, logout, register, login, recover }) => {
  const [library, setLibrary] = useState<UserBookRecord[]>([]);
  const [uploads, setUploads] = useState<Book[]>([]);
  const [activity, setActivity] = useState<ReadingActivity>(emptyActivity());
  const [prefs, setPrefsState] = useState<ReadingPrefs>(defaultPrefs());
  const [ready, setReady] = useState(false);
  const libraryRef = useRef(library);
  const activityRef = useRef(activity);
  libraryRef.current = library;
  activityRef.current = activity;

  useEffect(() => {
    if (!user) {
      setLibrary([]);
      setUploads([]);
      setActivity(emptyActivity());
      setPrefsState(defaultPrefs());
      setReady(true);
      return;
    }
    setLibrary(loadLibrary(user.id));
    setUploads(loadUploads(user.id));
    setActivity(loadActivity(user.id));
    setPrefsState(loadPrefs(user.id));
    setReady(true);
  }, [user?.id]);

  const commit = useCallback((nextLibrary: UserBookRecord[], nextActivity: ReadingActivity) => {
    if (!user) return;
    const evaluated = evaluateBadges(nextLibrary, nextActivity);
    libraryRef.current = nextLibrary;
    activityRef.current = evaluated.activity;
    saveLibrary(user.id, nextLibrary);
    saveActivity(user.id, evaluated.activity);
    setLibrary(nextLibrary);
    setActivity(evaluated.activity);
    if (evaluated.unlockedNow.length) {
      const names = evaluated.unlockedNow.map((badge) => badge.name).join(', ');
      toast.success(`Nuevo logro desbloqueado · ${names}`);
    }
  }, [user]);

  // Books come from the backend (the shared public-domain catalog + the user's uploads), with their
  // chapters loaded up front so the reader can open them directly. Nothing loads while signed out.
  const [catalog, setCatalog] = useState<Book[]>([]);
  useEffect(() => {
    if (!user) {
      setCatalog([]);
      return;
    }
    let cancelled = false;
    listLibrary()
      .then((books) => Promise.all(books.map((book) => loadBookContent(book).catch(() => null))))
      .then((books) => {
        if (!cancelled) setCatalog(books.filter((book): book is Book => Boolean(book && book.chapters.length)));
      })
      .catch(() => {
        if (!cancelled) toast.error('No pude cargar tus libros. Recarga la página.');
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // New users start with every backend book already in their library.
  useEffect(() => {
    if (!user || !catalog.length) return;
    const missing = catalog.filter((book) => !libraryRef.current.some((record) => record.bookId === book.id));
    if (missing.length) commit([...libraryRef.current, ...missing.map((book) => freshUserBook(book.id))], activityRef.current);
  }, [catalog, user?.id]);

  const getBook = useCallback((bookId: string) => {
    return uploads.find((book) => book.id === bookId) || catalog.find((book) => book.id === bookId);
  }, [uploads, catalog]);

  const entries = useMemo<LibraryEntry[]>(() => {
    return library.flatMap((record) => {
      const book = uploads.find((item) => item.id === record.bookId) || catalog.find((item) => item.id === record.bookId);
      if (!book) return [];
      return [{ book: decorate(book, record), record }];
    });
  }, [library, uploads, catalog]);

  const isInLibrary = useCallback((bookId: string) => libraryRef.current.some((record) => record.bookId === bookId), []);

  const addToLibrary = useCallback((bookId: string) => {
    if (!user || libraryRef.current.some((record) => record.bookId === bookId)) return false;
    commit([...libraryRef.current, freshUserBook(bookId)], activityRef.current);
    return true;
  }, [user, commit]);

  const addUploadedBook = useCallback((book: Book) => {
    if (!user) return;
    const nextUploads = [book, ...uploads];
    setUploads(nextUploads);
    saveUploads(user.id, nextUploads);
    if (!libraryRef.current.some((record) => record.bookId === book.id)) {
      commit([freshUserBook(book.id), ...libraryRef.current], activityRef.current);
    }
  }, [user, uploads, commit]);

  const saveProgress = useCallback((bookId: string, position: { currentChapter: number; currentPage: number; progress: number; status: ReadingStatus }) => {
    if (!user) return;
    const currentLibrary = libraryRef.current;
    const existing = currentLibrary.find((record) => record.bookId === bookId) ?? freshUserBook(bookId);
    const nextRecord: UserBookRecord = {
      ...existing,
      ...position,
      lastReadAt: new Date().toISOString(),
    };
    const nextLibrary = currentLibrary.some((record) => record.bookId === bookId)
      ? currentLibrary.map((record) => (record.bookId === bookId ? nextRecord : record))
      : [nextRecord, ...currentLibrary];
    commit(nextLibrary, touchToday(activityRef.current));
  }, [user, commit]);

  const recordReaderUse = useCallback(() => {
    if (!user) return;
    const markedAt = Number(sessionStorage.getItem('reed.readerMark') || 0);
    if (Date.now() - markedAt < 2000) return;
    sessionStorage.setItem('reed.readerMark', String(Date.now()));
    const activityNow = activityRef.current;
    commit(libraryRef.current, touchToday({ ...activityNow, readerModeUses: activityNow.readerModeUses + 1 }));
  }, [user, commit]);

  const recordQuiz = useCallback(() => {
    if (!user) return;
    const markedAt = Number(sessionStorage.getItem('reed.quizMark') || 0);
    if (Date.now() - markedAt < 2000) return;
    sessionStorage.setItem('reed.quizMark', String(Date.now()));
    const activityNow = activityRef.current;
    commit(libraryRef.current, touchToday({ ...activityNow, quizzesCompleted: activityNow.quizzesCompleted + 1 }));
  }, [user, commit]);

  const recordNightSession = useCallback(() => {
    if (!user || !isNightHour()) return;
    const markedAt = Number(sessionStorage.getItem('reed.nightMark') || 0);
    if (Date.now() - markedAt < 60_000) return;
    sessionStorage.setItem('reed.nightMark', String(Date.now()));
    const activityNow = activityRef.current;
    commit(libraryRef.current, touchToday({ ...activityNow, nightSessions: activityNow.nightSessions + 1 }));
  }, [user, commit]);

  const addReadingSeconds = useCallback((seconds: number) => {
    if (!user || seconds <= 0) return;
    const activityNow = activityRef.current;
    commit(libraryRef.current, touchToday({ ...activityNow, readingSeconds: activityNow.readingSeconds + seconds }));
  }, [user, commit]);

  const setPrefs = useCallback((next: ReadingPrefs) => {
    if (!user) return;
    setPrefsState(next);
    savePrefs(user.id, next);
  }, [user]);

  const value = useMemo<AccountContextValue>(() => ({
    ready,
    user,
    clerkEnabled,
    catalog,
    uploads,
    library,
    entries,
    prefs,
    activity,
    register,
    login,
    recover,
    logout,
    setAvatar,
    setPrefs,
    isInLibrary,
    addToLibrary,
    addUploadedBook,
    saveProgress,
    recordReaderUse,
    recordQuiz,
    recordNightSession,
    addReadingSeconds,
    getBook,
  }), [
    ready, user, catalog, uploads, library, entries, prefs, activity,
    register, login, recover, logout, setAvatar, setPrefs, isInLibrary, addToLibrary,
    addUploadedBook, saveProgress, recordReaderUse, recordQuiz, recordNightSession,
    addReadingSeconds, getBook,
  ]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) throw new Error('useAccount must be used within AccountProvider');
  return context;
}
