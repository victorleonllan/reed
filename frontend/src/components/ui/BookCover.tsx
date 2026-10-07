import React from 'react';
import { Book } from '../../types';

type BookCoverSize = 'sm' | 'md' | 'lg';

interface BookCoverProps {
  book: Pick<Book, 'id' | 'title' | 'author' | 'coverAccent'>;
  size?: BookCoverSize;
  /** Hide the cover from screen readers when the title is already shown next to it. */
  decorative?: boolean;
  className?: string;
}

// Six brand tones: sage, clay, amber, ink, reed, dark paper. Covers are objects on the shelf,
// so they keep their colour in both themes.
const palette: { background: string; text: string }[] = [
  { background: '#8fae97', text: '#1f2a22' },
  { background: '#b8693f', text: '#fbf8f0' },
  { background: '#d9893b', text: '#1f2a22' },
  { background: '#1f2a22', text: '#ece6d8' },
  { background: '#2f5d46', text: '#fbf8f0' },
  { background: '#d8c9a8', text: '#1f2a22' },
];

const sizeStyles: Record<BookCoverSize, { box: string; title: string; author: string; pad: string; spine: string }> = {
  sm: { box: 'w-12 rounded-sm', title: 'text-[8px] leading-[10px] line-clamp-3', author: 'hidden', pad: 'pl-3.5 pr-1.5 py-1.5', spine: 'left-1.5' },
  md: { box: 'w-28 rounded-md', title: 'text-[13px] leading-[17px] line-clamp-4', author: 'text-[10px] leading-[13px] line-clamp-2', pad: 'pl-5 pr-3 py-3', spine: 'left-2.5' },
  lg: { box: 'w-36 sm:w-44 rounded-md', title: 'text-[17px] leading-[22px] line-clamp-5', author: 'text-[12px] leading-[16px] line-clamp-2', pad: 'pl-7 pr-4 py-4', spine: 'left-3.5' },
};

// djb2: same id, same tone on every load.
const hashString = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

// Picks dark or light text for an arbitrary accent; non-hex accents fall back to light text.
const textFor = (color: string) => {
  const hex = color.trim().replace('#', '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return '#fbf8f0';
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? '#1f2a22' : '#fbf8f0';
};

export const coverColors = (book: Pick<Book, 'id' | 'coverAccent'>) =>
  book.coverAccent
    ? { background: book.coverAccent, text: textFor(book.coverAccent) }
    : palette[hashString(book.id) % palette.length];

/** Generated 2:3 cover for books that don't bring an image: tone, title, author and the reed as spine. */
export const BookCover: React.FC<BookCoverProps> = ({ book, size = 'md', decorative = false, className = '' }) => {
  const colors = coverColors(book);
  const styles = sizeStyles[size];

  return (
    <div
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : `Portada de ${book.title}`}
      aria-hidden={decorative || undefined}
      className={`relative aspect-[2/3] flex-shrink-0 overflow-hidden select-none shadow-1 ${styles.box} ${className}`}
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      <span
        className={`reed-line absolute inset-y-0 h-full opacity-60 ${styles.spine}`}
        style={{ backgroundColor: colors.text }}
      />
      <div className={`relative flex h-full flex-col justify-between ${styles.pad}`}>
        <p className={`font-serif font-semibold break-words ${styles.title}`}>{book.title}</p>
        {book.author && <p className={`font-sans opacity-80 ${styles.author}`}>{book.author}</p>}
      </div>
    </div>
  );
};
