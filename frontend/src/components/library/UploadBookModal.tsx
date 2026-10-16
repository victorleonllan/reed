import React, { useState } from 'react';
import { Book } from '../../types';
import { Button } from '../ui/Button';
import { X, Upload, AlertCircle, FileText } from 'lucide-react';
import { extractPdfChapters, isPdfFile, withTimeout } from '../../lib/pdf';
import { buildUploadedBook, chaptersFromPlainText } from '../../lib/reading';
import { ApiError, BookSlotsFullError, isBackendSession, uploadBook } from '../../services/api';

// Same limits as the backend (README.md → API: POST /api/documents).
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const BACKEND_EXTENSIONS = ['.epub', '.pdf', '.txt', '.md', '.html', '.htm'];
// Without a session the book is prepared in the browser, which only reads PDF and plain text.
const LOCAL_EXTENSIONS = ['.pdf', '.txt', '.md'];

const TOO_BIG_MESSAGE = 'Ese archivo pasa de 4 MB. Prueba con uno más liviano.';

interface UploadBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookUploaded: (newBook: Book) => void;
}

type Phase = 'idle' | 'uploading' | 'preparing' | 'ready';

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const UploadBookModal: React.FC<UploadBookModalProps> = ({
  isOpen,
  onClose,
  onBookUploaded,
}) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Plan's book slots are full: the message stays in the modal with a way back to the library.
  const [slotsFull, setSlotsFull] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const backend = isBackendSession();
  const extensions = backend ? BACKEND_EXTENSIONS : LOCAL_EXTENSIONS;
  const formatsLabel = backend ? 'EPUB, PDF, TXT, MD o HTML' : 'PDF, TXT o MD';
  const unsupportedMessage = `Ese formato no lo leo todavía. Prueba con ${formatsLabel}.`;
  const busy = phase === 'uploading' || phase === 'preparing';

  const acceptFile = (selected: File) => {
    const name = selected.name.toLowerCase();
    if (!extensions.some((extension) => name.endsWith(extension))) {
      setError(unsupportedMessage);
      setFile(null);
      return;
    }
    if (selected.size > MAX_UPLOAD_BYTES) {
      setError(TOO_BIG_MESSAGE);
      setFile(null);
      return;
    }
    setError(null);
    setSlotsFull(false);
    setFile(selected);
    if (!title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (selected) acceptFile(selected);
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (busy) return;
    event.dataTransfer.dropEffect = 'copy';
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLElement>) => {
    // Ignore leaves into the zone's own children.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (busy) return;
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) acceptFile(dropped);
  };

  const resetAndClose = () => {
    setPhase('idle');
    setFile(null);
    setTitle('');
    setAuthor('');
    setError(null);
    setSlotsFull(false);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Elige un archivo para continuar.');
      return;
    }
    if (!title.trim()) {
      setError('Escribe el título del libro.');
      return;
    }

    setError(null);
    setSlotsFull(false);
    setPhase('uploading');

    if (backend) {
      try {
        const book = await uploadBook(file, title.trim(), author.trim());
        setPhase('ready');
        onBookUploaded(book);
        resetAndClose();
      } catch (caught) {
        if (caught instanceof BookSlotsFullError) {
          setError(caught.message);
          setSlotsFull(true);
          setPhase('idle');
          return;
        }
        const status = caught instanceof ApiError ? caught.status : 0;
        setError(
          status === 413 ? TOO_BIG_MESSAGE
          : status === 415 ? unsupportedMessage
          : status === 429 ? (caught as ApiError).message
          : status === 422 ? 'No pude leer el texto de este archivo. Si es un PDF escaneado, prueba con un EPUB.'
          : 'No pude subir el libro. Inténtalo de nuevo en un momento.',
        );
        setPhase('idle');
      }
      return;
    }

    try {
      const name = file.name.toLowerCase();
      let chapters;
      if (name.endsWith('.pdf') || file.type === 'application/pdf') {
        const valid = await isPdfFile(file);
        if (!valid) {
          setError('Este archivo no parece un PDF válido. Prueba abrirlo y guardarlo de nuevo.');
          setPhase('idle');
          return;
        }
        setPhase('preparing');
        chapters = await withTimeout(
          extractPdfChapters(file),
          25000,
          'La preparación tardó demasiado. Prueba con un PDF más corto.',
        );
        if (!chapters.length) {
          setError('No pude sacar el texto de este PDF. Si es escaneado, prueba con otro archivo.');
          setPhase('idle');
          return;
        }
      } else {
        setPhase('preparing');
        const raw = await file.text();
        chapters = chaptersFromPlainText(raw);
        if (!chapters.length) {
          setError('No encontré texto para leer en este archivo.');
          setPhase('idle');
          return;
        }
      }

      const book = buildUploadedBook(title, author, chapters);
      setPhase('ready');
      window.setTimeout(() => {
        onBookUploaded(book);
        resetAndClose();
      }, 500);
    } catch (caught) {
      const message = caught instanceof Error && caught.message.startsWith('La preparación')
        ? caught.message
        : 'No pude sacar el texto de este PDF. Si es escaneado, prueba con otro archivo.';
      setError(message);
      setPhase('idle');
    }
  };

  const phaseLabel = phase === 'uploading'
    ? 'Subiendo tu libro…'
    : phase === 'preparing'
      ? 'Preparando tu libro…'
      : phase === 'ready'
        ? 'Listo para leer.'
        : null;

  const zoneState = busy || phase === 'ready' ? 'working' : isDragging ? 'dragging' : error ? 'error' : 'idle';
  const zoneStyles = {
    idle: 'border-line-strong hover:bg-paper-sunk cursor-pointer',
    dragging: 'border-reed bg-reed-soft cursor-copy',
    working: 'border-line bg-paper-sunk cursor-progress',
    error: 'border-danger hover:bg-paper-sunk cursor-pointer',
  }[zoneState];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-book-title"
        className="surface-raised shadow-3 w-full max-w-lg p-6 relative max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute top-4 right-4 p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-paper-sunk transition-colors focus-ring disabled:opacity-50"
          aria-label="Cerrar ventana"
        >
          <X size={20} strokeWidth={1.75} />
        </button>

        <h3 id="upload-book-title" className="font-serif text-heading text-ink mb-1">Subir un libro</h3>
        <p className="text-small text-ink-muted mb-5">
          Lo convierto en texto para que lo leas con calma, como en un libro.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label
            className={`group block border-2 border-dashed rounded-md p-6 text-center transition-colors duration-states focus-within:border-focus ${zoneStyles}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept={`${extensions.join(',')},application/pdf,text/plain,text/markdown${backend ? ',application/epub+zip,text/html' : ''}`}
              className="sr-only"
              onChange={handleFileChange}
              disabled={busy}
            />
            {zoneState === 'working' ? (
              <span className="flex flex-col items-center gap-3" role="status">
                <span className="text-small text-ink">{phaseLabel}</span>
                <span aria-hidden="true" className="block h-[3px] w-40 rounded-pill bg-reed animate-pulse motion-reduce:animate-none" />
              </span>
            ) : file ? (
              <span className="flex flex-col items-center">
                <FileText size={28} strokeWidth={1.75} className="text-reed mb-2" />
                <span className="text-small font-bold text-ink break-all">{file.name}</span>
                <span className="text-caption text-ink-muted mt-1">{formatSize(file.size)} · Toca para cambiarlo</span>
              </span>
            ) : (
              <span className="flex flex-col items-center">
                <Upload size={28} strokeWidth={1.75} className={isDragging ? 'text-reed-strong mb-2' : 'text-reed mb-2'} />
                <span className="text-small font-bold text-ink">
                  {isDragging ? 'Suéltalo aquí' : 'Arrastra tu archivo o toca para elegirlo'}
                </span>
                <span className="text-caption text-ink-muted mt-1">{formatsLabel}, hasta 4 MB</span>
              </span>
            )}
          </label>

          {error && (
            <p className="text-small text-danger flex items-start gap-2" role="alert">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </p>
          )}

          {slotsFull && (
            <Button type="button" variant="secondary" className="w-full" onClick={resetAndClose}>
              Ver mis libros
            </Button>
          )}

          <label className="block">
            <span className="block text-caption font-bold text-ink uppercase tracking-wider mb-1.5">Título del libro</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. La sombra del viento"
              className="w-full px-3.5 py-2.5 rounded-md bg-paper border border-line-strong text-ink placeholder:text-ink-muted text-small"
            />
          </label>

          <label className="block">
            <span className="block text-caption font-bold text-ink uppercase tracking-wider mb-1.5">Autor</span>
            <input
              type="text"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Ej. Carlos Ruiz Zafón"
              className="w-full px-3.5 py-2.5 rounded-md bg-paper border border-line-strong text-ink placeholder:text-ink-muted text-small"
            />
          </label>

          <Button type="submit" variant="primary" className="w-full" loading={busy} disabled={phase === 'ready'}>
            {phase === 'idle' ? 'Preparar libro' : phaseLabel}
          </Button>
        </form>
      </div>
    </div>
  );
};
