import type { NextRequest } from "next/server";
import { hfail, HError, okCrew, pull, refresh } from "@/lib/health/google";

export async function GET(req: NextRequest) {
  try {
    const crew = req.nextUrl.searchParams.get("crew");
    if (!okCrew(crew)) throw new HError(400, "crew required");
    const rt = req.cookies.get(`gh_${crew}`)?.value;
    if (!rt) throw new HError(401, "Actiwatch not connected.");
    const n = Number(req.nextUrl.searchParams.get("days"));
    const days = Number.isInteger(n) && n >= 7 && n <= 60 ? n : 30;
    try {
      return Response.json(await pull(await refresh(rt), days));
    } catch (e) {
      const res = hfail(e);
      if (e instanceof HError && e.status === 401) res.headers.append("Set-Cookie", `gh_${crew}=; Path=/api/health; Max-Age=0; HttpOnly; SameSite=Lax`);
      return res;
    }
  } catch (e) {
    return hfail(e);
  }
}

export function DELETE(req: NextRequest) {
  const crew = req.nextUrl.searchParams.get("crew");
  if (!okCrew(crew)) return Response.json({ error: "crew required" }, { status: 400 });
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", `gh_${crew}=; Path=/api/health; Max-Age=0; HttpOnly; SameSite=Lax`);
  return res;
}
