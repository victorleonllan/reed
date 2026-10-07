import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import { AppView, Book } from './types';
import { Header } from './components/ui/Header';
import { MobileNav } from './components/ui/MobileNav';
import { LibraryView } from './components/library/LibraryView';
import { CatalogView } from './components/catalog/CatalogView';
import { ProfileView } from './components/profile/ProfileView';
import { ReaderView } from './components/reader/ReaderView';
import { AuthScreen } from './components/auth/AuthScreen';
import { AuthProvider } from './components/auth/ClerkAuthProvider';
import { CheckoutReturn } from './components/billing/CheckoutReturn';
import { UpgradeModal } from './components/billing/UpgradeModal';
import { Onboarding } from './components/reed/Onboarding';
import { AccountProvider, useAccount } from './context/AccountContext';
import { ReedProvider } from './context/ReedContext';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AccountProvider>
        <ReedProvider>
          <AppShell />
        </ReedProvider>
      </AccountProvider>
    </AuthProvider>
  );
};

const AppShell: React.FC = () => {
  const {
    ready,
    user,
    entries,
    catalog,
    isInLibrary,
    addToLibrary,
    addUploadedBook,
    getBook,
    saveProgress,
  } = useAccount();

  const [currentView, setCurrentView] = useState<AppView>('library');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listenOnOpen, setListenOnOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  if (!ready) return <div className="min-h-screen bg-paper" />;
  if (!user) return <AuthScreen />;

  const selected = selectedId ? getBook(selectedId) : undefined;
  const selectedEntry = entries.find((entry) => entry.book.id === selectedId);
  const reedBooks = [...catalog];
  entries.forEach((entry) => {
    if (!reedBooks.some((book) => book.id === entry.book.id)) reedBooks.push(entry.book);
  });

  const openBook = (book: Book, listen = false) => {
    if (!isInLibrary(book.id)) addToLibrary(book.id);
    setListenOnOpen(listen);
    setSelectedId(book.id);
    setCurrentView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigate = (view: AppView) => {
    if (view === 'reader' && !selected) return;
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-paper text-ink transition-colors duration-states font-sans flex flex-col">
      <Header
        currentView={currentView}
        onNavigate={navigate}
        bookTitle={selected?.title}
        chapterTitle={selectedEntry && selectedEntry.record.status !== 'unread' ? selectedEntry.book.whereYouLeftOff : undefined}
      />

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--color-paper-raised)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-line)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-2)',
            fontFamily: '"Atkinson Hyperlegible", system-ui, sans-serif',
            fontSize: '0.875rem',
          },
        }}
      />
      <CheckoutReturn />
      <UpgradeModal />
      <Onboarding />

      {/* Short fade + 6px rise between views; only the fade with reduced motion. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={currentView}
          className={`flex-1 ${currentView === 'reader' ? '' : 'pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0'}`}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {currentView === 'library' && (
            <LibraryView
              entries={entries}
              onSelectBook={(book) => openBook(book)}
              onPlayBookAudio={(book) => openBook(book, true)}
              onAddNewBook={(book) => {
                addUploadedBook(book);
                setListenOnOpen(false);
                setSelectedId(book.id);
                setCurrentView('reader');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenCatalog={() => setCurrentView('catalog')}
            />
          )}
          {currentView === 'catalog' && (
            <CatalogView
              books={catalog}
              isInLibrary={isInLibrary}
              onAdd={(book) => addToLibrary(book.id)}
              onRead={(book) => openBook(book)}
            />
          )}
          {currentView === 'profile' && <ProfileView />}
          {currentView === 'reader' && selected && (
            <ReaderView
              book={selected}
              allBooks={reedBooks}
              initialChapter={selectedEntry?.record.currentChapter ?? 1}
              initialPage={selectedEntry?.record.currentPage ?? 0}
              autoListen={listenOnOpen}
              onProgress={(position) => saveProgress(selected.id, position)}
              onSelectBook={(book) => openBook(book)}
              onBackToLibrary={() => setCurrentView('library')}
            />
          )}
        </motion.main>
      </AnimatePresence>

      <MobileNav currentView={currentView} onNavigate={navigate} />
    </div>
  );
};

export default App;
