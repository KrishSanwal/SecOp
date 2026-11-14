import { fail, groq, MODELS } from "@/lib/groq";

const MAX = 200; // Groq Orpheus input limit

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return Response.json({ error: "text required" }, { status: 400 });
    if (text.length > MAX) return Response.json({ error: `text over ${MAX} chars` }, { status: 400 });

    const res = await groq("/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODELS.tts, voice: MODELS.voice, input: text, response_format: "wav" }),
    });
    return new Response(res.body, { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
  } catch (e) {
    return fail(e);
  }
}
