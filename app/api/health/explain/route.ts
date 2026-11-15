import { fail, groq, MODELS } from "@/lib/groq";

const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const rows = Array.isArray(body?.digest) ? body.digest.slice(0, 14) : [];
    if (!rows.length) return Response.json({ error: "digest required" }, { status: 400 });
    const lines = rows.map((r: Record<string, unknown>) => `${str(r.t, 40)}: ${str(r.v, 24)}, usual ${r.usual ? str(r.usual, 24) : "not known yet"}`);
    const fl = (Array.isArray(body?.flags) ? body.flags : []).slice(0, 8).map((f: unknown) => str(f, 120)).filter(Boolean);

    const res = await groq("/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELS.llm,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You write a short daily note for an astronaut from their wrist band readings, compared with their own usual. Plain words, no jargon, no emoji, no diagnosis. At most 60 words in 2 or 3 sentences. Say what stands out and one thing to do today. Mention the flight surgeon only if a flag is listed.",
          },
          { role: "user", content: `Readings:\n${lines.join("\n")}\nFlags: ${fl.length ? fl.join(" ") : "none"}` },
        ],
      }),
    });
    const data = await res.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return Response.json({ error: "empty summary" }, { status: 502 });
    return Response.json({ text: text.trim().slice(0, 600) });
  } catch (e) {
    return fail(e);
  }
}
