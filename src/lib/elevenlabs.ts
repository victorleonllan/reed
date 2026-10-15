// Server-only helpers for the ElevenLabs REST API.
// The API key must never reach the browser, so import this only from route handlers.

const API_BASE = "https://api.elevenlabs.io/v1";

// Keeps a single request (and its credit cost) bounded.
export const MAX_TTS_CHARS = 2500;

export class ElevenLabsConfigError extends Error {}

export class ElevenLabsApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ElevenLabsConfigError(
      `${name} is not set. Add it to .env.local (local) or the Vercel project settings (deployed).`,
    );
  }
  return value;
}

/** fetch against the ElevenLabs API with our key; throws ElevenLabsApiError on non-2xx. */
async function elevenlabs(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("xi-api-key", requireEnv("ELEVENLABS_API_KEY"));
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    throw new ElevenLabsApiError(res.status, `ElevenLabs ${init.method ?? "GET"} ${path} failed (${res.status}): ${await res.text()}`);
  }
  return res;
}

/**
 * Converts text to MP3 speech with the given voice and returns the upstream response (body is the
 * audio stream). The caller picks the voice (see config.readerVoices).
 */
export async function textToSpeech(text: string, voiceId: string): Promise<Response> {
  const apiKey = requireEnv("ELEVENLABS_API_KEY");

  return fetch(`${API_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    // Multilingual model so the companion reads Spanish and English texts.
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
  });
}

/**
 * Returns a short-lived signed URL the browser uses to open a voice session with a private agent.
 * Defaults to the general companion agent; pass a document's agent to talk about that document.
 */
export async function getAgentSignedUrl(agentId = requireEnv("ELEVENLABS_AGENT_ID")): Promise<string> {
  const res = await elevenlabs(`/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`);
  const data = (await res.json()) as { signed_url: string };
  return data.signed_url;
}

/**
 * Adds a document's text to the knowledge base. We send our own extracted text rather than the file
 * because ElevenLabs' PDF extraction drops content, and the agent should see what the reader sees.
 */
export async function uploadKnowledgeText(text: string, name: string): Promise<string> {
  const res = await elevenlabs("/convai/knowledge-base/text", { method: "POST", body: JSON.stringify({ text, name }) });
  const data = (await res.json()) as { id: string };
  return data.id;
}

type AgentConfig = {
  conversation_config: {
    agent: {
      prompt: {
        prompt: string;
        knowledge_base?: { type: string; name: string; id: string; usage_mode: string }[];
        rag?: { enabled: boolean; embedding_model?: string } & Record<string, unknown>;
        tool_ids?: string[];
        tools?: unknown[];
      };
    } & Record<string, unknown>;
  } & Record<string, unknown>;
};

// Multilingual embeddings: the books are mostly Spanish.
const RAG_EMBEDDING_MODEL = "multilingual_e5_large_instruct";

/**
 * Requests the document's search (RAG) index for `model` and waits until it is built. ElevenLabs
 * indexes short texts right away but longer books only on request, and an agent can't be created
 * with RAG on until its document's index is ready (422 rag_index_not_ready). ~10-20 s for a book.
 */
async function ensureRagIndex(knowledgeBaseId: string, model: string): Promise<void> {
  const deadline = Date.now() + 100_000;
  for (;;) {
    const res = await elevenlabs(`/convai/knowledge-base/${encodeURIComponent(knowledgeBaseId)}/rag-index`, {
      method: "POST",
      body: JSON.stringify({ model }),
    });
    const { status } = (await res.json()) as { status: string };
    if (status === "succeeded") return;
    if (status === "failed") throw new ElevenLabsApiError(502, `ElevenLabs could not index the document (${model})`);
    if (Date.now() > deadline) throw new ElevenLabsApiError(504, "ElevenLabs took too long to index the document");
    await new Promise((r) => setTimeout(r, 3000));
  }
}

const KNOWLEDGE_BASE_INSTRUCTIONS = `

You also have the full text of this document in your knowledge base. Use it to answer questions about parts the reader is not currently on (earlier chapters, characters, definitions), and say when something is not in the document.`;

/**
 * Creates a private agent dedicated to one document: a copy of the companion template
 * (prompt, voice, language) whose knowledge base holds only that document.
 * Per-document agents keep users' books separate, since a session can't swap knowledge bases.
 */
export async function createDocumentAgent(knowledgeBaseId: string, title: string): Promise<string> {
  const template = (await (
    await elevenlabs(`/convai/agents/${encodeURIComponent(requireEnv("ELEVENLABS_AGENT_ID"))}`)
  ).json()) as AgentConfig;

  const config = template.conversation_config;
  // GET returns attached tools both as `tool_ids` and expanded `tools`; create accepts only one.
  if (config.agent.prompt.tool_ids?.length) delete config.agent.prompt.tools;
  config.agent.prompt.prompt += KNOWLEDGE_BASE_INSTRUCTIONS;
  config.agent.prompt.knowledge_base = [{ type: "text", name: title, id: knowledgeBaseId, usage_mode: "auto" }];
  config.agent.prompt.rag = { ...config.agent.prompt.rag, enabled: true, embedding_model: RAG_EMBEDDING_MODEL };
  await ensureRagIndex(knowledgeBaseId, RAG_EMBEDDING_MODEL);

  const body = JSON.stringify({
    name: `Reader: ${title}`.slice(0, 100),
    conversation_config: config,
    platform_settings: { auth: { enable_auth: true } },
  });
  // Safety net: the index can take a moment to be visible to agent creation after it reports success.
  let res: Response | undefined;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await elevenlabs("/convai/agents/create", { method: "POST", body });
      break;
    } catch (err) {
      const indexing = err instanceof ElevenLabsApiError && err.status === 422 && err.message.includes("rag_index_not_ready");
      if (!indexing || attempt >= 6) throw err;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  const data = (await res.json()) as { agent_id: string };
  return data.agent_id;
}

export async function deleteAgent(agentId: string): Promise<void> {
  await elevenlabs(`/convai/agents/${encodeURIComponent(agentId)}`, { method: "DELETE" });
}

export async function deleteKnowledgeDoc(knowledgeBaseId: string): Promise<void> {
  // force: also detach it from any agent still referencing it.
  await elevenlabs(`/convai/knowledge-base/${encodeURIComponent(knowledgeBaseId)}?force=true`, { method: "DELETE" });
}
