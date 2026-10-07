import React, { useState } from 'react';
import { Book } from '../../../types';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Shuffle, Search } from 'lucide-react';

interface LibrarianModeProps {
  book: Book;
  allBooks: Book[];
  onSelectBook: (book: Book) => void;
  onClose: () => void;
}

export const LibrarianMode: React.FC<LibrarianModeProps> = ({
  book,
  allBooks,
  onSelectBook,
  onClose,
}) => {
  // Estado para el modo bibliotecario
  const [libraryQuery, setLibraryQuery] = useState('');
  const [randomPick, setRandomPick] = useState<Book | null>(null);

  return (
    <div className="space-y-4">
      {/* 5.3 Recomendación aleatoria */}
      <div className="p-3.5 rounded-md bg-paper border border-line flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-ink block">
            ¿No sabes qué leer?
          </span>
          <span className="text-xs text-ink-muted">
            Reed elegirá algo afín a tu gusto.
          </span>
        </div>
        <Button
          variant="voice"
          size="sm"
          onClick={() => {
            const otherBooks = allBooks.filter(b => b.id !== book.id);
            const pick = otherBooks[Math.floor(Math.random() * otherBooks.length)] || book;
            setRandomPick(pick);
          }}
          className="flex items-center gap-1.5"
        >
          <Shuffle size={14} />
          <span>🎲 Recomiéndame algo</span>
        </Button>
      </div>

      {/* Resultado de recomendación aleatoria */}
      {randomPick && (
        <div className="p-3.5 rounded-md bg-reed-soft/50 border border-reed space-y-2 animate-fadeIn">
          <span className="text-[11px] font-bold text-reed uppercase tracking-wider block">
            Recomendado para hoy
          </span>
          <h5 className="font-serif font-bold text-base text-ink">
            {randomPick.title}
          </h5>
          <p className="text-xs text-ink-muted">
            {randomPick.author} · {randomPick.genre} ({randomPick.publishedYear})
          </p>
          <p className="text-xs text-ink font-serif italic">
            «{randomPick.recommendationReason || 'Un libro cautivador para tu biblioteca.'}»
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onSelectBook(randomPick);
              onClose();
            }}
            className="w-full text-xs mt-2"
          >
            Abrir este libro
          </Button>
        </div>
      )}

      {/* 5.4 Consultar mi biblioteca sin IA arbitraria */}
      <div className="space-y-2">
        <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider">
          CONSULTAS RÁPIDAS EN TU BIBLIOTECA
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            'Gabriel García Márquez',
            'Fábulas y clásicos',
            'Antes del año 2000',
            'Pendientes',
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => setLibraryQuery(chip)}
              className="text-[11px] px-2.5 py-1 rounded-pill bg-paper border border-line hover:border-line-strong text-ink transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-ink-muted" />
          <input
            type="text"
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
            placeholder="Ej. libros de García Márquez, antes de 2000..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-md bg-paper border border-line-strong text-ink placeholder:text-ink-muted focus:border-focus"
          />
        </div>

        {/* Resultados filtrados */}
        <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
          {allBooks
            .filter((b) => {
              if (!libraryQuery) return true;
              const q = libraryQuery.toLowerCase();
              if (q.includes('antes') && q.includes('2000')) {
                return (b.publishedYear || 2026) < 2000;
              }
              if (q.includes('pendiente')) {
                return b.progressPercent < 100;
              }
              return (
                b.title.toLowerCase().includes(q) ||
                b.author.toLowerCase().includes(q) ||
                (b.genre && b.genre.toLowerCase().includes(q))
              );
            })
            .map((b) => (
              <div
                key={b.id}
                onClick={() => {
                  onSelectBook(b);
                  onClose();
                }}
                className="p-2.5 rounded-md bg-paper border border-line hover:border-reed cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-serif font-semibold text-xs text-ink truncate">
                    {b.title}
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">
                    {b.author} · {b.genre} ({b.publishedYear})
                  </p>
                </div>
                <Badge variant={b.progressPercent === 100 ? 'reed' : 'neutral'}>
                  {b.progressPercent}%
                </Badge>
              </div>
            ))}
        </div>
      </div>

      {/* 5.1 & 5.2 Libros similares */}
      <div className="pt-2 border-t border-line space-y-2">
        <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider">
          SIMILARES A ESTE LIBRO
        </span>
        {allBooks
          .filter(b => b.id !== book.id)
          .slice(0, 2)
          .map(similar => (
            <div key={similar.id} className="p-2.5 rounded-md bg-paper border border-line">
              <p className="font-serif font-bold text-xs text-ink">{similar.title}</p>
              <p className="text-[11px] text-ink-muted mb-1">{similar.author}</p>
              <p className="text-[11px] text-ink font-serif italic">
                «{similar.recommendationReason || 'Comparte temas y estilo de lectura afines.'}»
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};
