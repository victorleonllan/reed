import React, { useMemo, useState } from 'react';
import { Book, ReadingStatus } from '../../types';
import { LibraryEntry } from '../../context/AccountContext';
import { BookCard } from './BookCard';
import { UploadBookModal } from './UploadBookModal';
import { Button } from '../ui/Button';
import { BookCover } from '../ui/BookCover';
import { ProgressBar } from '../ui/ProgressBar';
import { Surface } from '../ui/Surface';
import { ReedCharacter } from '../reed/ReedCharacter';
import { Play, Plus } from 'lucide-react';

interface LibraryViewProps {
  entries: LibraryEntry[];
  onSelectBook: (book: Book) => void;
  onPlayBookAudio: (book: Book) => void;
  onAddNewBook: (book: Book) => void;
  onOpenCatalog: () => void;
}

type Filter = 'all' | ReadingStatus;

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'reading', label: 'Leyendo' },
  { id: 'unread', label: 'Sin empezar' },
  { id: 'finished', label: 'Terminados' },
];

// Filters only earn their space once the shelf has more than a handful of books.
const FILTER_THRESHOLD = 4;

export const LibraryView: React.FC<LibraryViewProps> = ({
  entries,
  onSelectBook,
  onPlayBookAudio,
  onAddNewBook,
  onOpenCatalog,
}) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [author, setAuthor] = useState('all');

  const showFilters = entries.length > FILTER_THRESHOLD;
  const activeFilter: Filter = showFilters ? filter : 'all';
  const activeAuthor = showFilters ? author : 'all';

  const authors = useMemo(
    () => [...new Set(entries.map((entry) => entry.book.author))].sort(),
    [entries],
  );

  const visible = entries.filter((entry) => {
    if (activeFilter !== 'all' && entry.record.status !== activeFilter) return false;
    if (activeAuthor !== 'all' && entry.book.author !== activeAuthor) return false;
    return true;
  });

  const continueEntry = [...entries]
    .filter((entry) => entry.record.status === 'reading' && entry.record.lastReadAt)
    .sort((a, b) => (b.record.lastReadAt || '').localeCompare(a.record.lastReadAt || ''))[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-line pb-6">
        <div>
          <span className="text-caption font-bold text-ink-muted uppercase tracking-widest block mb-1">
            Tu espacio
          </span>
          <h1 className="font-serif text-title text-ink">Tu biblioteca</h1>
          <p className="text-ink-muted text-small sm:text-base mt-1.5 max-w-xl">
            Los libros que elegiste, con el punto exacto en el que los dejaste.
          </p>
        </div>

        {entries.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => setIsUploadOpen(true)}
            icon={<Plus size={18} strokeWidth={2} />}
            className="whitespace-nowrap self-start sm:self-auto"
          >
            Subir libro
          </Button>
        )}
      </div>

      {continueEntry && (
        <Surface as="section" elevation={2} padding="md" className="mb-10 sm:p-6" aria-labelledby="continue-reading-title">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-7">
            <BookCover book={continueEntry.book} size="lg" decorative className="self-center sm:self-start" />
            <div className="flex flex-1 min-w-0 flex-col">
              <span className="text-caption font-bold uppercase tracking-widest text-ink-muted">Sigue leyendo</span>
              <h2 id="continue-reading-title" className="font-serif text-heading sm:text-title text-ink mt-1">
                {continueEntry.book.title}
              </h2>
              <p className="text-small text-ink-muted mt-0.5">{continueEntry.book.author}</p>
              {continueEntry.book.whereYouLeftOff && (
                <p className="font-serif text-body text-ink mt-4 leading-relaxed line-clamp-3">
                  {continueEntry.book.whereYouLeftOff}
                </p>
              )}
              <ProgressBar
                className="mt-5"
                label={`Capítulo ${continueEntry.book.currentChapterNumber} de ${continueEntry.book.totalChapters}`}
                percent={continueEntry.book.progressPercent}
              />
              <div className="flex flex-wrap items-center gap-3 mt-6">
                <Button variant="primary" onClick={() => onSelectBook(continueEntry.book)}>
                  Seguir leyendo
                </Button>
                {continueEntry.book.hasAudio && (
                  <Button
                    variant="voice"
                    onClick={() => onPlayBookAudio(continueEntry.book)}
                    icon={<Play size={16} strokeWidth={2} />}
                    title="Escuchar desde donde quedaste"
                  >
                    Escuchar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Surface>
      )}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center text-center py-10 sm:py-14">
          <ReedCharacter mode="librarian" size="lg" />
          <p className="font-serif text-heading text-ink mt-6 max-w-md">
            Tu estantería está vacía. Sube un libro o elige uno del almacén.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Button variant="primary" onClick={() => setIsUploadOpen(true)} icon={<Plus size={18} strokeWidth={2} />}>
              Subir un libro
            </Button>
            <Button variant="secondary" onClick={onOpenCatalog}>Ir al almacén</Button>
          </div>
        </div>
      ) : (
        <>
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div role="group" aria-label="Filtrar por estado" className="inline-flex flex-wrap gap-1 rounded-pill bg-paper-sunk p-1">
                {filters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={activeFilter === item.id}
                    onClick={() => setFilter(item.id)}
                    className={`px-3.5 py-1.5 text-small rounded-pill focus-ring transition-colors duration-states ${
                      activeFilter === item.id ? 'bg-paper-raised text-ink font-bold shadow-1' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {authors.length > 1 && (
                <select
                  value={activeAuthor}
                  onChange={(event) => setAuthor(event.target.value)}
                  className="sm:ml-auto text-small bg-paper border border-line rounded-md px-2 py-1.5 text-ink"
                  aria-label="Filtrar por autor"
                >
                  <option value="all">Todos los autores</option>
                  {authors.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {visible.length === 0 ? (
            <p className="text-small text-ink-muted">Ningún libro coincide con este filtro.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 sm:gap-x-6">
              {visible.map((entry) => (
                <BookCard
                  key={entry.book.id}
                  book={entry.book}
                  status={entry.record.status}
                  onSelectBook={onSelectBook}
                />
              ))}
            </div>
          )}
        </>
      )}

      <UploadBookModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onBookUploaded={onAddNewBook}
      />
    </div>
  );
};
