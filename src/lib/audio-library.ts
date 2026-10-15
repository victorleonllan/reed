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
