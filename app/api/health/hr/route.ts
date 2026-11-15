import type { NextRequest } from "next/server";
import { beats, hfail, HError, okCrew, refresh } from "@/lib/health/google";

const MAX = 30 * 60_000;

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const crew = q.get("crew");
    if (!okCrew(crew)) throw new HError(400, "crew required");
    const a = Number(q.get("from")), b = Number(q.get("to")), now = Date.now();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a || b - a > MAX || a < now - 86_400_000 || b > now + 60_000) throw new HError(400, "Bad time range.");
    const rt = req.cookies.get(`gh_${crew}`)?.value;
    if (!rt) throw new HError(401, "The Bio-Monitor is not connected on this phone.");
    return Response.json({ pts: await beats(await refresh(rt), a, b) });
  } catch (e) {
    return hfail(e);
  }
}
