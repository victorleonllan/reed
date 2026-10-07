import React, { useMemo, useState } from 'react';
import { Book } from '../../types';
import { Button } from '../ui/Button';
import { BookCover } from '../ui/BookCover';

interface CatalogViewProps {
  books: Book[];
  isInLibrary: (bookId: string) => boolean;
  onAdd: (book: Book) => void;
  onRead: (book: Book) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ books, isInLibrary, onAdd, onRead }) => {
  const categories = useMemo(
    () => ['Todas', ...new Set(books.map((book) => book.genre).filter(Boolean) as string[])],
    [books],
  );
  const [category, setCategory] = useState('Todas');
  const visible = category === 'Todas' ? books : books.filter((book) => book.genre === category);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 border-b border-line pb-6">
        <span className="text-caption font-bold text-ink-muted uppercase tracking-widest block mb-1">Catálogo</span>
        <h1 className="font-serif text-title text-ink">Almacén</h1>
        <p className="text-ink-muted text-small sm:text-base mt-1.5 max-w-xl">
          Libros de dominio público para empezar. Reed ya los leyó.
        </p>
      </div>

      {categories.length > 2 && (
        <div role="group" aria-label="Filtrar por género" className="inline-flex flex-wrap gap-1 rounded-pill bg-paper-sunk p-1 mb-6">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={`px-3.5 py-1.5 text-small rounded-pill focus-ring transition-colors duration-states ${
                category === item ? 'bg-paper-raised text-ink font-bold shadow-1' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
        {visible.map((book) => {
          const owned = isInLibrary(book.id);
          return (
            <article key={book.id} className="flex flex-col rounded-md p-2 transition-shadow duration-states hover:bg-paper-raised hover:shadow-2 focus-within:bg-paper-raised focus-within:shadow-2">
              <BookCover book={book} decorative className="w-full" />
              <div className="mt-3 flex flex-1 flex-col px-1">
                {book.genre && (
                  <p className="text-caption font-bold uppercase tracking-wider text-ink-muted mb-0.5">{book.genre}</p>
                )}
                <h2 className="font-serif font-semibold text-[17px] leading-snug text-ink line-clamp-2">{book.title}</h2>
                <p className="text-small text-ink-muted mt-0.5 truncate">{book.author}</p>
                {book.recommendationReason && (
                  <p className="text-caption text-ink-muted mt-2 leading-relaxed line-clamp-3">{book.recommendationReason}</p>
                )}
                <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
                  {owned ? (
                    <span className="text-small font-bold text-reed flex-1 whitespace-nowrap">En tu biblioteca ✓</span>
                  ) : (
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => onAdd(book)} aria-label={`Agregar ${book.title} a tu biblioteca`}>
                      Agregar
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => onRead(book)} aria-label={`Leer ${book.title}`}>
                    Leer
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
