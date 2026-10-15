import { config, type ReaderVoice } from "@/config";
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

// POST { text, voice? } -> audio/mpeg of the text read aloud by ElevenLabs. `voice` is a key of
// config.readerVoices (default config.defaultReaderVoice). Signed-in users only; counts toward TTS limits.
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
    await consumeUsage(await getUserId(), "tts_chars", input.length);

    const upstream = await textToSpeech(input, voiceIdFor(selected));
    if (!upstream.ok || !upstream.body) {
      console.error("ElevenLabs TTS failed", upstream.status, await upstream.text());
      return jsonError(`ElevenLabs TTS failed (${upstream.status})`, 502);
    }
    return new Response(upstream.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleRouteError(err, "Could not reach ElevenLabs");
  }
}
