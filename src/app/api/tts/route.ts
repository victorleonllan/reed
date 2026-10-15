import { config, type ReaderVoice } from "@/config";
import { libraryAudioUrl } from "@/lib/audio-library";
import { getUserId } from "@/lib/auth";
import { MAX_TTS_CHARS, textToSpeech } from "@/lib/elevenlabs";
import { handleRouteError, jsonError } from "@/lib/http";
import { consumeUsage } from "@/lib/usage";

function isReaderVoice(value: string): value is ReaderVoice {
  return Object.hasOwn(config.readerVoices, value);
}

// ELEVENLABS_VOICE_ID, when set, overrides only the default voice so existing deployments keep their voice.
function voiceIdFor(voice: ReaderVoice): string {
  const override = voice === config.defaultReaderVoice ? process.env.ELEVENLABS_VOICE_ID : undefined;
  return override || config.readerVoices[voice].voiceId;
}

const LIBRARY_TIMEOUT_MS = 3000;

// Pre-generated audio for this voice and text (R-029/R-030), or null to fall back to ElevenLabs.
// A miss (404) is expected; any other status or a network error is logged and also falls back.
async function fetchLibraryAudio(voice: ReaderVoice, text: string): Promise<Response | null> {
  const url = libraryAudioUrl(voice, text);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(LIBRARY_TIMEOUT_MS) });
    if (res.status === 200 && res.body) return res;
    if (res.status !== 404) console.warn("Audio library fetch failed", res.status, url);
    await res.body?.cancel();
  } catch (err) {
    console.warn("Audio library unreachable", url, err);
  }
  return null;
}

// POST { text, voice? } -> audio/mpeg of the text read aloud by ElevenLabs. `voice` is a key of
// config.readerVoices (default config.defaultReaderVoice). Signed-in users only. Serves the
// pre-generated library first (no usage counted); otherwise ElevenLabs, which counts toward TTS limits.
export async function POST(request: Request) {
  let text: unknown;
  let voice: unknown;
  try {
    ({ text, voice } = await request.json());
  } catch {
    return jsonError("Body must be JSON: { text, voice? }", 400);
  }

  if (typeof text !== "string" || !text.trim()) return jsonError("`text` is required", 400);
  if (text.length > MAX_TTS_CHARS) {
    return jsonError(`Text is too long (${text.length} chars, max ${MAX_TTS_CHARS}). Read a shorter passage.`, 413);
  }

  const selected = voice ?? config.defaultReaderVoice;
  if (typeof selected !== "string" || !isReaderVoice(selected)) {
    return jsonError(`Unknown voice. Use one of: ${Object.keys(config.readerVoices).join(", ")}`, 400);
  }

  try {
    const input = text.trim();
    const userId = await getUserId();

    const library = await fetchLibraryAudio(selected, input);
    if (library) {
      return new Response(library.body, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Reed-Audio": "library" },
      });
    }

    await consumeUsage(userId, "tts_chars", input.length);

    const upstream = await textToSpeech(input, voiceIdFor(selected));
    if (!upstream.ok || !upstream.body) {
      console.error("ElevenLabs TTS failed", upstream.status, await upstream.text());
      return jsonError(`ElevenLabs TTS failed (${upstream.status})`, 502);
    }
    return new Response(upstream.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Reed-Audio": "elevenlabs" },
    });
  } catch (err) {
    return handleRouteError(err, "Could not reach ElevenLabs");
  }
}
