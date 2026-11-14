import { fail, groq, MODELS } from "@/lib/groq";

const MAX = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    const audio = form?.get("audio");
    if (!(audio instanceof Blob) || audio.size === 0) {
      return Response.json({ error: "audio file required (field 'audio')" }, { status: 400 });
    }
    if (audio.size > MAX) return Response.json({ error: "audio over 10 MB" }, { status: 400 });

    const out = new FormData();
    out.append("file", audio, "clip.webm");
    out.append("model", MODELS.stt);
    out.append("language", "en");
    out.append("response_format", "json");

    const res = await groq("/audio/transcriptions", { method: "POST", body: out });
    const data = await res.json().catch(() => null);
    if (typeof data?.text !== "string") return Response.json({ error: "bad STT response" }, { status: 502 });
    return Response.json({ text: data.text.trim() });
  } catch (e) {
    return fail(e);
  }
}
