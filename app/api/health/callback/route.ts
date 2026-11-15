import { NextResponse, type NextRequest } from "next/server";
import { exchange, HError, okCrew } from "@/lib/health/google";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const [nonce, crew] = (q.get("state") ?? "").split(".");
  const back = (params: Record<string, string>) => {
    const res = NextResponse.redirect(new URL(`/wearables?${new URLSearchParams({ ...(okCrew(crew ?? null) ? { crew } : {}), ...params })}`, req.nextUrl.origin));
    res.cookies.delete({ name: "gh_state", path: "/api/health" });
    return res;
  };
  if (q.get("error")) return back({ err: q.get("error") === "access_denied" ? "Access was not granted." : "Google sign-in failed." });
  if (!okCrew(crew ?? null) || !nonce || nonce !== req.cookies.get("gh_state")?.value) return back({ err: "Sign-in expired. Try connecting again." });
  const code = q.get("code");
  if (!code) return back({ err: "Google sent no code." });
  try {
    const redirect = process.env.GOOGLE_HEALTH_REDIRECT?.trim() || `${req.nextUrl.origin}/api/health/callback`;
    const { refresh } = await exchange(code, redirect);
    const res = back({ linked: "1" });
    res.cookies.set(`gh_${crew}`, refresh, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", path: "/api/health", maxAge: 60 * 60 * 24 * 180 });
    return res;
  } catch (e) {
    return back({ err: e instanceof HError ? e.message : "Could not finish the Google sign-in." });
  }
}
