import { Book } from '../types';
import { ApiError, apiFetch } from './api';

export const VOICE_LIMIT_MESSAGE = 'Por hoy llegamos al límite de conversaciones. Mañana seguimos.';
export const VOICE_PREPARING_MESSAGE = 'Este libro todavía se está preparando. Prueba en un minuto.';
export const VOICE_FAILED_MESSAGE = 'No pude despertar a Reed en este momento. Inténtalo de nuevo en unos segundos.';
export const VOICE_MIC_MESSAGE = 'Necesito tu micrófono para conversar. Puedes darme permiso en la barra del navegador.';

const voiceErrorMessage = (err: unknown) => {
  if (err instanceof ApiError && err.status === 429) return VOICE_LIMIT_MESSAGE;
  if (err instanceof ApiError && err.status === 409) return VOICE_PREPARING_MESSAGE;
  return VOICE_FAILED_MESSAGE;
};

/**
 * Signed URL for a live voice session: the book's own agent when it lives in the backend,
 * the general companion agent otherwise (sample books). Throws an Error whose message is ready to show.
 */
export async function getVoiceSignedUrl(book: Book): Promise<string> {
  const path = book.documentId
    ? `/api/documents/${encodeURIComponent(book.documentId)}/signed-url`
    : '/api/companion/signed-url';
  try {
    const data: { signedUrl?: string } = await (await apiFetch(path)).json();
    if (!data.signedUrl) throw new Error('Missing signedUrl');
    return data.signedUrl;
  } catch (err) {
    throw new Error(voiceErrorMessage(err));
  }
}

/** True when the browser refused or has no microphone (permission denied, no device, insecure page). */
export function isMicrophoneError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    ['NotAllowedError', 'NotFoundError', 'NotReadableError', 'SecurityError', 'OverconstrainedError'].includes(err.name)
  );
}

export const canUseMicrophone = () =>
  typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';
