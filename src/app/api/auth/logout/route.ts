/**
 * POST /api/auth/logout — Déconnexion StageTrack : efface le JWT de session
 * et le cookie de session démo établissement.
 */
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true, redirect: "/auth" });
}
