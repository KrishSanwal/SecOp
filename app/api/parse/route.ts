import { fail, groq, MODELS } from "@/lib/groq";

type Check = (v: unknown) => boolean;
const num = (lo: number, hi: number): Check => (v) => typeof v === "number" && v >= lo && v <= hi;
const one = (...xs: string[]): Check => (v) => typeof v === "string" && xs.includes(v);

const FIELDS: Record<string, { ask: string; ok: Check }> = {
  sleep: { ask: "hours slept last night, number 0-24 (e.g. 'six and a half' -> 6.5)", ok: num(0, 24) },
  mood: { ask: "mood as integer 1-5, 1 worst, 5 best", ok: (v) => num(1, 5)(v) && Number.isInteger(v) },
  count: { ask: "heartbeats counted in 15 seconds, integer 5-60", ok: (v) => num(5, 60)(v) && Number.isInteger(v) },
  pupil: { ask: 'pupil reaction: one of "brisk", "sluggish", "unequal"', ok: one("brisk", "sluggish", "unequal") },
  sway: { ask: 'balance sway: one of "none", "mild", "marked", "out" (out = stepped out / lost balance)', ok: one("none", "mild", "marked", "out") },
  note: { ask: "a short plain summary of what is bothering them, max 120 chars, or empty string", ok: (v) => typeof v === "string" && v.length <= 200 },
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const field = typeof body?.field === "string" ? body.field : "";
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : "";
    const spec = FIELDS[field];
    if (!spec) return Response.json({ error: `field must be one of ${Object.keys(FIELDS).join(", ")}` }, { status: 400 });
    if (!text) return Response.json({ error: "text required" }, { status: 400 });

    const res = await groq("/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELS.llm,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Extract one value from a spoken answer during a crew health exam. Value: ${spec.ask}. Reply only JSON: {"value": <value>} or {"value": null} if the answer does not contain it.`,
          },
          { role: "user", content: text },
        ],
      }),
    });

    const data = await res.json().catch(() => null);
    const raw = data?.choices?.[0]?.message?.content;
    let value: unknown = null;
    try {
      value = JSON.parse(typeof raw === "string" ? raw : "{}").value ?? null;
    } catch {
      return Response.json({ error: "bad LLM JSON" }, { status: 502 });
    }
    if (value !== null && !spec.ok(value)) value = null;
    return Response.json({ field, value, heard: text });
  } catch (e) {
    return fail(e);
  }
}
