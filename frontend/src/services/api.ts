import { Book, Chapter, QuizQuestion } from '../types';
import { getCachedAudio, putCachedAudio } from './audioCache';
import type { ReaderVoice } from './readerVoices';

// Same origin in production (Next serves this app and /api); `npm run dev` proxies /api to the backend.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// ---------- auth ----------

type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter | null = null;

/** Set by the Clerk bridge in ClerkAuthProvider; null means signed out / demo mode (no backend calls). */
export function setAuthTokenGetter(getter: TokenGetter | null) {
  getToken = getter;
}

export const isBackendSession = () => getToken !== null;

export class ApiError extends Error {
  /** `code` is the machine-readable reason some routes add to the error body (e.g. `book_slots_full`). */
  constructor(readonly status: number, message: string, readonly code?: string) {
    super(message);
  }
}

/** /api/tts has no pre-generated audio for this paragraph yet (R-038): read it with the browser voice. */
export class AudioNotGeneratedError extends ApiError {}

/** The user already keeps as many books as their plan allows (R-035): they must delete one first. */
export class BookSlotsFullError extends ApiError {}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken ? await getToken() : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json');
  const res = await fetch(`${BACKEND_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = data?.error || `Error ${res.status}`;
    const code = typeof data?.code === 'string' ? data.code : undefined;
    // Daily limit reached: UpgradeModal (mounted in App) listens and offers Reed Pro calmly.
    if (res.status === 429) window.dispatchEvent(new CustomEvent('reed:limit', { detail: { message } }));
    throw new ApiError(res.status, message, code);
  }
  return res;
}

const postJson = async <T,>(path: string, body: unknown): Promise<T> =>
  (await apiFetch(path, { method: 'POST', body: JSON.stringify(body) })).json();

const REED_LIMIT_MESSAGE = 'Llegamos al límite de respuestas de Reed de este mes.';
const REED_FAILED_MESSAGE = 'Reed no pudo responder en este momento. Inténtalo de nuevo en unos segundos.';

const reedErrorMessage = (err: unknown) =>
  err instanceof ApiError && err.status === 429 ? REED_LIMIT_MESSAGE : REED_FAILED_MESSAGE;

/** True when an explain/summarize result is Reed's error message, so callers don't cache it. */
export const isReedError = (text: string) => text === REED_LIMIT_MESSAGE || text === REED_FAILED_MESSAGE;

// Demo mode (signed out): Reed can't read the book, so it says so instead of making something up.
const DEMO_EXPLAIN = 'En modo demo no puedo leer este libro contigo. Entra con tu cuenta y te lo explico de verdad.';
const DEMO_SUMMARY = 'En modo demo no puedo leer este libro contigo. Entra con tu cuenta y te cuento lo que llevamos.';

// ---------- Reed AI (explain / summarize / quiz) ----------

export async function explainParagraph(paragraphText: string, userQuestion: string): Promise<string> {
  if (isBackendSession()) {
    try {
      const data = await postJson<{ explanation: string }>('/api/ai/explain', { paragraph: paragraphText, question: userQuestion });
      return data.explanation;
    } catch (err) {
      return reedErrorMessage(err);
    }
  }
  return DEMO_EXPLAIN;
}

export async function summarizeChapter(chapterTitle: string, paragraphsText: string): Promise<string> {
  if (isBackendSession()) {
    try {
      const data = await postJson<{ summary: string }>('/api/ai/summarize', { title: chapterTitle, text: paragraphsText });
      return data.summary;
    } catch (err) {
      return reedErrorMessage(err);
    }
  }
  return DEMO_SUMMARY;
}

export async function generateQuiz(chapterTitle: string, paragraphsText: string): Promise<QuizQuestion[]> {
  if (isBackendSession()) {
    try {
      const data = await postJson<{ questions: QuizQuestion[] }>('/api/ai/quiz', { title: chapterTitle, text: paragraphsText });
      return data.questions;
    } catch {
      return []; // QuizModal shows a "could not create the quiz" message for an empty list
    }
  }

  // Demo quiz: about how Reed works, never about a book Reed couldn't read.
  return [
    {
      id: 'demo-q-1',
      question: '¿Qué modo de Reed te lee el libro en voz alta?',
      options: ['Compañero', 'Profesor', 'Lector', 'Bibliotecario'],
      correctIndex: 2,
      explanation: 'El modo Lector lee en voz alta desde el párrafo que elijas, a tu ritmo.',
      type: 'multiple'
    },
    {
      id: 'demo-q-2',
      question: 'Si un pasaje no te queda claro, ¿qué hace el modo Profesor?',
      options: ['Te da la respuesta de inmediato', 'Te da una pista primero y, si quieres, te lo explica', 'Te pone una nota', 'Te cambia de libro'],
      correctIndex: 1,
      explanation: 'Reed empieza con una pista para que llegues tú; si prefieres, te lo explica directo. Aquí no hay notas.',
      type: 'multiple'
    }
  ];
}

// ---------- voice (ElevenLabs text to speech) ----------

/**
 * MP3 of the text in the chosen reader voice, as an object URL. Served from the browser cache when
 * this voice already read this text, so it is generated (and paid) only once. Throws ApiError (429 = limit),
 * or AudioNotGeneratedError when the paragraph has no pre-generated audio yet.
 */
export async function synthesizeSpeech(text: string, voice: ReaderVoice): Promise<string> {
  const clipped = text.slice(0, 2500);
  const cached = await getCachedAudio(voice, clipped);
  if (cached) return cached;
  let res: Response;
  try {
    res = await apiFetch('/api/tts', { method: 'POST', body: JSON.stringify({ text: clipped, voice }) });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404 && err.code === 'audio_not_generated') {
      throw new AudioNotGeneratedError(err.status, err.message, err.code);
    }
    throw err;
  }
  const blob = await res.blob();
  await putCachedAudio(voice, clipped, blob);
  return URL.createObjectURL(blob);
}

// ---------- library ----------

type ApiChapter = { number: number; title: string; paragraphs: string[] };
type ApiDocument = {
  id: string;
  title: string;
  author: string | null;
  status: 'processing' | 'ready' | 'failed';
  chapterCount: number;
  paragraphCount: number;
  createdAt: string;
  /** Catalog book: shared public-domain demo book every user can read (not deletable). */
  isPublic: boolean;
  description: string | null;
  progress?: { position: number; percent: number } | null;
};

/** Library card for a backend document; chapters are loaded when the book is opened. */
function toBook(doc: ApiDocument): Book {
  const position = doc.progress?.position ?? 0;
  const percent = Math.round(doc.progress?.percent ?? 0);
  return {
    id: doc.id,
    documentId: doc.id,
    title: doc.title,
    author: doc.author || 'Autor desconocido',
    currentChapterNumber: 1,
    totalChapters: doc.chapterCount,
    totalParagraphs: doc.paragraphCount,
    progressPosition: position,
    progressPercent: percent,
    whereYouLeftOff: doc.progress
      ? `Vas en el ${percent}% del libro.`
      : doc.description || 'Aún no empiezas este libro.',
    hasAudio: true,
    addedAt: doc.createdAt.slice(0, 10),
    tags: doc.isPublic ? ['Biblioteca Reed', 'Dominio público'] : ['Mi biblioteca'],
    recommendationReason: doc.description || undefined,
    chapters: [],
  };
}

/** Fills a backend book's chapters and opens it at the chapter where the reader left off. */
export async function loadBookContent(book: Book): Promise<Book> {
  if (!book.documentId || book.chapters.length) return book;
  const { content } = await (await apiFetch(`/api/documents/${book.documentId}/content`)).json() as {
    content: { chapters: ApiChapter[] };
  };
  let paragraphIndex = 0;
  let currentChapterNumber = 1;
  const chapters: Chapter[] = content.chapters.map((c) => {
    const startIndex = paragraphIndex;
    paragraphIndex += c.paragraphs.length;
    if ((book.progressPosition ?? 0) >= startIndex) currentChapterNumber = c.number;
    return {
      id: `${book.documentId}-ch-${c.number}`,
      number: c.number,
      title: c.title,
      startIndex,
      paragraphs: c.paragraphs.map((text, i) => ({ id: `${book.documentId}-p-${startIndex + i}`, order: i + 1, text })),
    };
  });
  return { ...book, chapters, currentChapterNumber, totalChapters: chapters.length };
}

export async function listLibrary(): Promise<Book[]> {
  const { documents } = await (await apiFetch('/api/documents')).json() as { documents: ApiDocument[] };
  return documents.filter((d) => d.status === 'ready').map(toBook);
}

/** Throws BookSlotsFullError (with the server's message) when the plan's book slots are full. */
export async function uploadBook(file: File, title: string, author: string): Promise<Book> {
  const form = new FormData();
  form.append('file', file);
  form.append('title', title);
  if (author) form.append('author', author);
  let res: Response;
  try {
    res = await apiFetch('/api/documents', { method: 'POST', body: form });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409 && err.code === 'book_slots_full') {
      throw new BookSlotsFullError(err.status, err.message, err.code);
    }
    throw err;
  }
  const { document } = await res.json() as { document: ApiDocument };
  return loadBookContent(toBook(document));
}

/**
 * State of the whole-book audio in the default voice (R-036): `ready` and `catalog` read with Reed's
 * voice; `queued` (being generated) and `unavailable` (plan without book audio) read with the browser voice.
 */
export type BookAudioStatus = 'ready' | 'catalog' | 'queued' | 'unavailable';

export async function getBookAudioStatus(documentId: string): Promise<BookAudioStatus> {
  const { status } = await (await apiFetch(`/api/documents/${documentId}/audio`)).json() as { status: BookAudioStatus };
  return status;
}

/** Saves where the reader is: `position` is the paragraph index across the whole book. */
export async function saveProgress(documentId: string, position: number, percent: number): Promise<void> {
  await apiFetch(`/api/documents/${documentId}/progress`, {
    method: 'PUT',
    body: JSON.stringify({ position, percent: Math.min(100, Math.max(0, percent)) }),
  });
}
