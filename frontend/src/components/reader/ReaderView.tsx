import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Book, Paragraph, ReadingStatus } from '../../types';
import { useReed } from '../../context/ReedContext';
import { useAccount } from '../../context/AccountContext';
import { ReadingPage } from './ReadingParagraph';
import { formatListenTime, ListenBar, useParagraphVoice } from './ListenBar';
import { getReaderVoice } from '../../services/readerVoices';
import { READING_THEMES, ReadingSettings, readingTextStyle, useIdleChrome } from './ReadingSettings';
import { ChapterDrawer, ReadingProgressRail } from './ReadingProgressRail';
import { WhereYouLeftOff } from './WhereYouLeftOff';
import { ReedBubble } from '../reed/ReedBubble';
import { ReedModePanel } from '../reed/ReedModePanel';
import { chapterStarts, pageIndexForPosition, paginateBook, progressForPage } from '../../lib/reading';

interface ReaderViewProps {
  book: Book;
  allBooks: Book[];
  initialChapter: number;
  initialPage: number;
  autoListen?: boolean;
  onProgress: (position: { currentChapter: number; currentPage: number; progress: number; status: ReadingStatus }) => void;
  onSelectBook: (book: Book) => void;
  onBackToLibrary: () => void;
}

const PLAYBACK_RATES = [0.8, 1, 1.25, 1.5];

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  allBooks,
  initialChapter,
  initialPage,
  autoListen = false,
  onProgress,
  onSelectBook,
  onBackToLibrary,
}) => {
  const pages = useMemo(() => paginateBook(book), [book]);
  const chapters = useMemo(() => chapterStarts(pages), [pages]);
  const [pageIndex, setPageIndex] = useState(() => pageIndexForPosition(pages, initialChapter, initialPage));
  const page = pages[pageIndex];
  // "Quedaste en …": only when the book opens past its first page; never on a new book.
  const [leftOffPage, setLeftOffPage] = useState<number | null>(() => (pageIndex > 0 ? pageIndex : null));
  const dismissLeftOff = useCallback(() => setLeftOffPage(null), []);

  // Infinite scroll: pages [renderRange.from, renderRange.to] are stacked; the one in view is pageIndex.
  const [renderRange, setRenderRange] = useState(() => {
    const start = pageIndexForPosition(pages, initialChapter, initialPage);
    return { from: start, to: Math.min(pages.length - 1, start + 2) };
  });
  const pageRefs = useRef(new Map<number, HTMLElement>());
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<number | null>(null);
  // Page being read aloud (independent of scrolling while listening).
  const speakingPageRef = useRef(pageIndex);
  const [speakingPage, setSpeakingPage] = useState(pageIndex);
  const { mode, setMode, startSession, recordParagraphRead } = useReed();
  const { prefs, setPrefs, recordReaderUse, recordQuiz, recordNightSession, addReadingSeconds } = useAccount();
  const [selectedParagraph, setSelectedParagraph] = useState<Paragraph | null>(null);
  const [activeReadingIndex, setActiveReadingIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isReedPanelOpen, setIsReedPanelOpen] = useState(false);
  const [reedMenuOpen, setReedMenuOpen] = useState(false);
  const showChrome = useIdleChrome();
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pageIndexRef = useRef(pageIndex);
  const pagesRef = useRef(pages);
  const rateRef = useRef(playbackRate);
  const onProgressRef = useRef(onProgress);
  const addSecondsRef = useRef(addReadingSeconds);
  pageIndexRef.current = pageIndex;
  pagesRef.current = pages;
  rateRef.current = playbackRate;

  const ensureRendered = (index: number) =>
    setRenderRange((range) => ({
      from: Math.min(range.from, index),
      to: Math.max(range.to, Math.min(pagesRef.current.length - 1, index + 2)),
    }));

  const scrollToPage = (index: number) => {
    pendingScrollRef.current = index;
    ensureRendered(index);
  };

  const setSpeaking = (index: number) => {
    speakingPageRef.current = index;
    setSpeakingPage(index);
  };

  // Voz de ElevenLabs (con sesión) o del navegador: ver useParagraphVoice.
  const voice = useParagraphVoice();
  const stopSpeech = voice.stop;
  onProgressRef.current = onProgress;
  addSecondsRef.current = addReadingSeconds;

  useEffect(() => {
    const nextPages = paginateBook(book);
    const start = pageIndexForPosition(nextPages, initialChapter, initialPage);
    setPageIndex(start);
    setLeftOffPage(start > 0 ? start : null);
    setRenderRange({ from: start, to: Math.min(nextPages.length - 1, start + 2) });
    setSpeaking(start);
    pageRefs.current.clear();
    setSelectedParagraph(null);
    setActiveReadingIndex(-1);
    setIsPlaying(false);
    stopSpeech();
  }, [book.id]);

  useEffect(() => {
    if (!page) return;
    startSession(book.id, book.title, page.chapterTitle, page.paragraphs[0]?.order ?? 1);
    onProgressRef.current({
      currentChapter: page.chapterNumber,
      currentPage: pageIndex + 1,
      progress: progressForPage(pageIndex, pages.length),
      status: pageIndex >= pages.length - 1 ? 'finished' : 'reading',
    });
  }, [book.id, pageIndex, page?.chapterTitle, pages.length]);

  useEffect(() => { recordNightSession(); }, [book.id]);
  useEffect(() => { if (mode === 'reader') recordReaderUse(); }, [mode, book.id]);

  useEffect(() => {
    const timer = window.setInterval(() => addSecondsRef.current(15), 15000);
    return () => window.clearInterval(timer);
  }, [book.id]);

  useEffect(() => {
    if (mode !== 'reader' && isPlaying) {
      stopSpeech();
      setIsPlaying(false);
    }
  }, [mode]);

  useEffect(() => {
    let interval: number | undefined;
    if (isPlaying && mode === 'reader') {
      interval = window.setInterval(() => setSecondsElapsed((value) => value + 1), 1000 / playbackRate);
    }
    return () => window.clearInterval(interval);
  }, [isPlaying, playbackRate, mode]);

  // The page crossing the upper part of the screen is the current page (header, progress).
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.page));
        if (visible.length) setPageIndex(Math.min(...visible));
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    pageRefs.current.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [renderRange.from, renderRange.to, book.id]);

  // Load more pages before the reader reaches the end of what is rendered.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRenderRange((range) => ({ ...range, to: Math.min(pagesRef.current.length - 1, range.to + 3) }));
        }
      },
      { rootMargin: '1200px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [renderRange.to, book.id]);

  // Jumps (table of contents, keyboard, voice moving on) scroll once the page is rendered.
  useEffect(() => {
    const target = pendingScrollRef.current;
    if (target === null) return;
    const element = pageRefs.current.get(target);
    if (element) {
      pendingScrollRef.current = null;
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  const goToPage = (index: number) => {
    stopSpeech();
    setIsPlaying(false);
    setActiveReadingIndex(-1);
    const next = Math.min(pages.length - 1, Math.max(0, index));
    setPageIndex(next);
    setSpeaking(next);
    setSelectedParagraph(null);
    scrollToPage(next);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToPage(pageIndexRef.current + 1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPage(pageIndexRef.current - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pages.length]);

  const speakParagraph = (index: number) => {
    const current = pagesRef.current[speakingPageRef.current];
    if (!current) return;
    stopSpeech();
    if (index >= current.paragraphs.length) {
      const nextPage = speakingPageRef.current + 1;
      if (nextPage < pagesRef.current.length) {
        setSpeaking(nextPage);
        scrollToPage(nextPage);
        speakParagraph(0);
        return;
      }
      setIsPlaying(false);
      setActiveReadingIndex(-1);
      return;
    }

    const paragraph = current.paragraphs[index];
    recordParagraphRead(paragraph.order);
    setActiveReadingIndex(index);
    voice.speak(paragraph, {
      voice: getReaderVoice(),
      rate: rateRef.current,
      following: current.paragraphs[index + 1],
      onEnd: () => speakParagraph(index + 1),
      onError: () => setIsPlaying(false),
    });
  };

  const playFromActive = () => {
    setIsPlaying(true);
    if (activeReadingIndex < 0) setSpeaking(pageIndexRef.current);
    const target = activeReadingIndex >= 0 ? activeReadingIndex : 0;
    setActiveReadingIndex(target);
    speakParagraph(target);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopSpeech();
      setIsPlaying(false);
      return;
    }
    setMode('reader');
    playFromActive();
  };

  useEffect(() => {
    if (!autoListen) return;
    setMode('reader');
    setIsPlaying(true);
    setSpeaking(pageIndexRef.current);
    setActiveReadingIndex(0);
    speakParagraph(0);
  }, [book.id, autoListen]);

  const handleListenFrom = (paragraph: Paragraph) => {
    const pageOf = pages.findIndex((item) => item.paragraphs.some((p) => p.id === paragraph.id));
    if (pageOf < 0) return;
    const index = pages[pageOf].paragraphs.findIndex((item) => item.id === paragraph.id);
    setSpeaking(pageOf);
    setMode('reader');
    setIsPlaying(true);
    setActiveReadingIndex(index);
    speakParagraph(index);
  };

  if (!page) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <p className="font-serif text-xl">Este libro no tiene texto para mostrar.</p>
        <button type="button" onClick={onBackToLibrary} className="mt-4 text-sm text-ink-muted">Volver a la biblioteca</button>
      </div>
    );
  }

  const theme = READING_THEMES[prefs.theme];
  const textStyle = readingTextStyle(prefs);
  const leftOff = leftOffPage !== null ? pages[leftOffPage] : undefined;
  const leftOffChapter = leftOff && book.chapters.find((chapter) => chapter.number === leftOff.chapterNumber);
  const nextPage = pages[pageIndex + 1];
  const chapterCompleted = !nextPage || nextPage.chapterNumber !== page.chapterNumber;
  const chapterPosition = chapters.findIndex((item) => item.chapterNumber === page.chapterNumber);
  const showReedMenu = (open: boolean) => {
    setReedMenuOpen(open);
    if (open) setIsReedPanelOpen(false);
  };
  const showReedPanel = (open: boolean) => {
    setIsReedPanelOpen(open);
    if (open) setReedMenuOpen(false);
  };
  const chrome = showChrome || tocOpen || settingsOpen || isReedPanelOpen || reedMenuOpen;
  const startReading = (index: number) => {
    setActiveReadingIndex(index);
    if (isPlaying) speakParagraph(index);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] transition-colors duration-states" style={{ background: theme.bg, color: theme.fg }}>
      <ReadingProgressRail
        progress={progressForPage(pageIndex, pages.length)}
        totalPages={pages.length}
        chapters={chapters}
        currentChapter={page.chapterNumber}
        onJump={goToPage}
        trackColor={theme.muted}
      />
      <div className="max-w-3xl mx-auto px-6 sm:px-10 pt-6 pb-32 reading-column">
        <div className={`flex items-center justify-between gap-3 mb-8 text-sm transition-opacity duration-states ${chrome ? 'opacity-100' : 'opacity-0 focus-within:opacity-100'}`}>
          <button type="button" onClick={onBackToLibrary} className="focus-ring rounded-sm hover:opacity-70" style={{ color: theme.muted }}>Biblioteca</button>
          <div className="flex items-center gap-1">
            <ChapterDrawer
              open={tocOpen}
              onOpenChange={(open) => { setTocOpen(open); if (open) setSettingsOpen(false); }}
              chapters={chapters}
              currentChapter={page.chapterNumber}
              onJump={goToPage}
              color={theme.muted}
            />
            <ReadingSettings
              prefs={prefs}
              onChange={setPrefs}
              open={settingsOpen}
              onOpenChange={(open) => { setSettingsOpen(open); if (open) setTocOpen(false); }}
              color={theme.fg}
            />
          </div>
        </div>

        <header className="text-center mb-10">
          <p className="text-xs tracking-[0.18em] uppercase mb-3" style={{ color: theme.muted }}>{book.author}</p>
          <h1 className="font-serif text-3xl sm:text-4xl mb-4">{book.title}</h1>
          <p className="font-serif text-lg" style={{ color: theme.muted }}>{page.chapterTitle}</p>
          <p className="text-xs mt-3" style={{ color: theme.muted }}>
            Capítulo {chapterPosition + 1} de {chapters.length}<span className="mx-2">·</span>Página {pageIndex + 1} de {pages.length}
          </p>
        </header>

        <WhereYouLeftOff
          open={!!leftOff}
          chapterTitle={leftOff?.chapterTitle ?? ''}
          summary={leftOffChapter?.whereYouLeftOffSummary}
          onContinue={() => { if (leftOffPage !== null) goToPage(leftOffPage); dismissLeftOff(); }}
          onDismiss={dismissLeftOff}
        />

        <article className="mx-auto max-w-[65ch]">
          {renderRange.from > 0 && (
            <button type="button" onClick={() => ensureRendered(Math.max(0, renderRange.from - 3))} className="focus-ring block mx-auto mb-10 rounded-sm text-sm hover:opacity-70" style={{ color: theme.muted }}>
              ↑ Ver páginas anteriores
            </button>
          )}
          {pages.slice(renderRange.from, renderRange.to + 1).map((pg) => (
            <ReadingPage
              key={pg.index}
              page={pg}
              chapterHeading={pg.index > renderRange.from && pages[pg.index - 1]?.chapterNumber !== pg.chapterNumber}
              readingIndex={mode === 'reader' && speakingPage === pg.index ? activeReadingIndex : -1}
              selectedId={selectedParagraph?.id}
              textStyle={textStyle}
              mutedColor={theme.muted}
              pageRef={(element) => { if (element) pageRefs.current.set(pg.index, element); else pageRefs.current.delete(pg.index); }}
              onSelect={(item) => {
                setSelectedParagraph(selectedParagraph?.id === item.id ? null : item);
                recordParagraphRead(item.order);
              }}
              onAskAbout={(item) => {
                setSelectedParagraph(item);
                if (mode !== 'sleeping') setMode('teacher');
                showReedPanel(true);
              }}
              onListenFrom={handleListenFrom}
            />
          ))}
          {renderRange.to < pages.length - 1 ? (
            <div ref={sentinelRef} className="h-10" aria-hidden="true" />
          ) : (
            <p className="text-center font-serif mt-6 pb-10" style={{ color: theme.muted }}>Fin del libro</p>
          )}
        </article>
      </div>

      {mode === 'reader' ? (
        <ListenBar
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          chapterTitle={page.chapterTitle}
          currentTimeFormatted={formatListenTime(secondsElapsed)}
          playbackRate={playbackRate}
          onChangePlaybackRate={() => {
            const next = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length];
            setPlaybackRate(next);
            rateRef.current = next;
            if (!voice.setRate(next) && isPlaying) speakParagraph(activeReadingIndex >= 0 ? activeReadingIndex : 0);
          }}
          onPrevParagraph={() => startReading(Math.max(0, activeReadingIndex - 1))}
          onNextParagraph={() => startReading(Math.min((pages[speakingPageRef.current]?.paragraphs.length || 1) - 1, activeReadingIndex + 1))}
          menuOpen={reedMenuOpen}
          onMenuOpenChange={showReedMenu}
          onOpenReedAction={() => showReedPanel(true)}
          onClose={() => { stopSpeech(); setIsPlaying(false); setMode('companion'); }}
        />
      ) : (
        <div className="fixed bottom-6 right-6 z-40">
          <ReedBubble
            menuOpen={reedMenuOpen}
            onMenuOpenChange={showReedMenu}
            onOpenModeAction={(modeKey) => {
              if (modeKey === 'reader') playFromActive();
              else if (modeKey !== 'sleeping') showReedPanel(true);
            }}
          />
        </div>
      )}

      <AnimatePresence>
        {isReedPanelOpen && (
          <ReedModePanel
            key="reed-panel"
            book={book}
            allBooks={allBooks}
            currentParagraph={selectedParagraph || page.paragraphs[activeReadingIndex >= 0 ? activeReadingIndex : 0]}
            chapterTitle={page.chapterTitle}
            progressPercent={progressForPage(pageIndex, pages.length)}
            chapterCompleted={chapterCompleted}
            onQuizComplete={recordQuiz}
            onSelectBook={onSelectBook}
            onClose={() => showReedPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
