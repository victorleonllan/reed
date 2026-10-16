// Pre-generated audio library (R-029): where a paragraph's audio lives in Vercel Blob.
// The key is derived from the voice and the text, so /api/tts (R-030) and the audio machine
// (R-031) reach the same file without a database. No Next imports: the R-031 script loads
// this through tsx.
import { createHash } from "node:crypto";
import { config, type ReaderVoice } from "../config";

// The only normalization. /api/tts already trims the text this way (R-025), and the reader
// sends the paragraph as BookContent renders it.
export function normalizeForAudio(text: string): string {
  return text.trim();
}

export function audioKey(voice: ReaderVoice, text: string): string {
  const hash = createHash("sha256").update(normalizeForAudio(text)).digest("hex");
  return `audio/${config.localTts.libraryVersion}/${voice}/${hash}.mp3`;
}

// Public URL of the pre-generated file, or null when no library is configured.
export function libraryAudioUrl(voice: ReaderVoice, text: string): string | null {
  const base = process.env.REED_AUDIO_BASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/${audioKey(voice, text)}`;
}

// Whole-book audio for users' own books (R-036). The audio machine uploads this manifest after the
// last paragraph; its presence is what "this book is fully generated" means (no database column).
export type BookManifest = {
  documentId: string;
  voice: ReaderVoice;
  libraryVersion: string;
  paragraphs: number;
  generatedAt: string; // ISO
};

export function bookManifestKey(voice: ReaderVoice, documentId: string): string {
  return `audio/${config.localTts.libraryVersion}/${voice}/books/${documentId}.json`;
}

// Public URL of the book's manifest, or null when no library is configured.
export function bookManifestUrl(voice: ReaderVoice, documentId: string): string | null {
  const base = process.env.REED_AUDIO_BASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/${bookManifestKey(voice, documentId)}`;
}

const MANIFEST_TIMEOUT_MS = 3000;

// True only when the manifest answers 200. No library, a miss, a timeout or a network error all
// count as "not generated yet".
export async function hasBookManifest(voice: ReaderVoice, documentId: string): Promise<boolean> {
  const url = bookManifestUrl(voice, documentId);
  if (!url) return false;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS) });
    if (res.status !== 200 && res.status !== 404) console.warn("Book manifest check failed", res.status, url);
    return res.status === 200;
  } catch (err) {
    console.warn("Audio library unreachable", url, err);
    return false;
  }
}
