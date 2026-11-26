/**
 * GET /api/auth/me — Session courante StageTrack.
 * Retourne l'utilisateur vérifié (JWT) + périmètres de rôle, ou 401.
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        profileCompleted: user.profileCompleted,
        studentProfile: user.studentProfile,
        company: user.teamMember
          ? { id: user.teamMember.companyId, name: user.teamMember.company.name, teamRole: user.teamMember.role }
          : null,
        universityMember: user.universityMember
          ? {
              id: user.universityMember.id,
              role: user.universityMember.role,
              title: user.universityMember.title,
              university: user.universityMember.university,
              department: user.universityMember.department,
            }
          : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de session.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
