// Browser cache of generated paragraph audio, so the same text in the same voice is never paid twice.
// Uses Cache Storage; without it (private mode, old browsers) every call is a miss and nothing breaks.
import type { ReaderVoice } from './readerVoices';

const CACHE_NAME = 'reed-audio-v1';
const MAX_ENTRIES = 300;

const hasCacheStorage = () => typeof caches !== 'undefined' && typeof crypto !== 'undefined' && !!crypto.subtle;

async function keyFor(voice: ReaderVoice, text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `https://reed.local/audio/${voice}/${hex}`;
}

/** Object URL of the cached audio for this voice and text, or null. */
export async function getCachedAudio(voice: ReaderVoice, text: string): Promise<string | null> {
  if (!hasCacheStorage()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(await keyFor(voice, text));
    return hit ? URL.createObjectURL(await hit.blob()) : null;
  } catch {
    return null;
  }
}

/** Stores the audio and trims the cache to the newest MAX_ENTRIES (insertion order of `keys()`). */
export async function putCachedAudio(voice: ReaderVoice, text: string, blob: Blob): Promise<void> {
  if (!hasCacheStorage()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(await keyFor(voice, text), new Response(blob, { headers: { 'Content-Type': blob.type || 'audio/mpeg' } }));
    const keys = await cache.keys();
    const excess = keys.length - MAX_ENTRIES;
    for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
  } catch {
    // Quota exceeded or storage blocked: playback works, it just won't be reused.
  }
}
