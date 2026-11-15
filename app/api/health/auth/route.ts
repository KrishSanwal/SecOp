import { NextResponse, type NextRequest } from "next/server";
import { consent, HError, okCrew } from "@/lib/health/google";

export function GET(req: NextRequest) {
  const crew = req.nextUrl.searchParams.get("crew");
  const back = (err: string) => NextResponse.redirect(new URL(`/wearables?${new URLSearchParams({ ...(okCrew(crew) ? { crew } : {}), err })}`, req.nextUrl.origin));
  if (!okCrew(crew)) return back("Pick a crew member first.");
  try {
    const nonce = crypto.randomUUID();
    const redirect = process.env.GOOGLE_HEALTH_REDIRECT?.trim() || `${req.nextUrl.origin}/api/health/callback`;
    const res = NextResponse.redirect(consent(redirect, `${nonce}.${crew}`));
    res.cookies.set("gh_state", nonce, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", path: "/api/health", maxAge: 600 });
    return res;
  } catch (e) {
    return back(e instanceof HError ? e.message : "Could not start the Google sign-in.");
  }
}
