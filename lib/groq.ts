const API = "https://api.groq.com/openai/v1";

export const MODELS = {
  stt: process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo",
  llm: process.env.GROQ_LLM_MODEL || "openai/gpt-oss-20b",
  tts: process.env.GROQ_TTS_MODEL || "canopylabs/orpheus-v1-english",
  voice: process.env.GROQ_TTS_VOICE || "hannah",
};

export class GroqError extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

function key() {
  const k = process.env.GROQ_API_KEY?.trim();
  if (!k) throw new GroqError(500, "GROQ_API_KEY not set. Add it to .env.local or Vercel env.");
  return k;
}

export async function groq(path: string, init: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key()}`, ...init.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GroqError(res.status === 429 ? 429 : 502, `Groq ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

export function fail(e: unknown) {
  const status = e instanceof GroqError ? e.status : 500;
  const msg = e instanceof Error ? e.message : "unknown error";
  return Response.json({ error: msg }, { status });
}
