// Voices the reader can use. Keys match `config.readerVoices` on the server (R-025).

export const READER_VOICES = {
  antonio: { label: 'Antonio · suave y pausado' },
  mauricio: { label: 'Mauricio · más estándar' },
} as const;

export type ReaderVoice = keyof typeof READER_VOICES;

const STORAGE_KEY = 'reed.readerVoice';
const DEFAULT_VOICE: ReaderVoice = 'antonio';

const isReaderVoice = (value: unknown): value is ReaderVoice =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(READER_VOICES, value);

/** The voice the reader chose last time, or Antonio. */
export function getReaderVoice(): ReaderVoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isReaderVoice(stored) ? stored : DEFAULT_VOICE;
  } catch {
    return DEFAULT_VOICE;
  }
}

export function setReaderVoice(voice: ReaderVoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, voice);
  } catch {
    // Storage blocked (private mode): the choice lasts only for this page.
  }
}
