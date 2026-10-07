import React from 'react';
import { Book, ReadingStatus } from '../../types';
import { BookCover } from '../ui/BookCover';
import { ProgressBar } from '../ui/ProgressBar';

interface BookCardProps {
  book: Book;
  status: ReadingStatus;
  onSelectBook: (book: Book) => void;
}

/** One book on the shelf: cover, title, author and progress. The whole card opens the book. */
export const BookCard: React.FC<BookCardProps> = ({ book, status, onSelectBook }) => {
  const actionLabel = status === 'unread' ? 'Empezar a leer' : status === 'finished' ? 'Abrir de nuevo' : 'Seguir leyendo';
  const progressLabel = status === 'finished'
    ? 'Terminado'
    : `Capítulo ${book.currentChapterNumber} de ${book.totalChapters}`;

  return (
    <button
      type="button"
      onClick={() => onSelectBook(book)}
      aria-label={`${actionLabel}: ${book.title}`}
      className="group flex h-full w-full flex-col rounded-md p-2 text-left focus-ring transition-shadow duration-states hover:bg-paper-raised hover:shadow-2 focus-visible:bg-paper-raised"
    >
      <BookCover book={book} decorative className="w-full" />
      <div className="mt-3 flex flex-1 flex-col px-1 pb-1">
        <h3 className="font-serif font-semibold text-[17px] leading-snug text-ink line-clamp-2">{book.title}</h3>
        <p className="text-small text-ink-muted mt-0.5 truncate">{book.author}</p>
        <div className="mt-auto pt-3">
          {status === 'unread' ? (
            <p className="text-caption text-ink-muted">Sin empezar</p>
          ) : (
            <ProgressBar label={progressLabel} percent={book.progressPercent} showText={false} />
          )}
        </div>
      </div>
    </button>
  );
};
