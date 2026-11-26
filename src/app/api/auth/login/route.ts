/**
 * POST /api/auth/login — Connexion StageTrack (scrypt + JWT).
 * Identifiant : email (tous espaces) ou numéro matricule (espace étudiant).
 * Le corps peut préciser `space` ("etudiant" | "entreprise" | "etablissement")
 * pour contrôler la cohérence du rôle et calculer la redirection.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import type { UniversityMemberRoleToken } from "@/lib/jwt";

export const runtime = "nodejs";

const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Identifiant requis."),
  password: z.string().min(1, "Mot de passe requis."),
  space: z.enum(["etudiant", "entreprise", "etablissement"]).optional(),
});

const ROLE_BY_SPACE = {
  etudiant: "STUDENT",
  entreprise: "COMPANY",
  etablissement: "UNIVERSITY",
} as const;

function onboardingRedirect(space: keyof typeof ROLE_BY_SPACE, memberRole?: UniversityMemberRoleToken): string {
  if (space === "etudiant") return "/etudiant/profil?onboarding=1";
  if (space === "entreprise") return "/entreprise/parametres?onboarding=1";
  // Tous les membres université (Admin, Chef, Maître de Mémoire) complètent
  // leur profil via les Paramètres de l'espace établissement.
  void memberRole;
  return "/etablissement/parametres?onboarding=1";
}

function homeRedirect(space: keyof typeof ROLE_BY_SPACE, memberRole?: UniversityMemberRoleToken): string {
  if (space === "etudiant") return "/etudiant/dashboard";
  if (space === "entreprise") return "/entreprise/dashboard";
  return memberRole === "ACADEMIC_SUPERVISOR" ? "/etablissement/encadrement" : "/etablissement/dashboard";
}

interface AuthUserRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  profileCompleted: boolean;
  passwordHash: string;
  universityMember: { role: string } | null;
  teamMember: { role: string } | null;
}

function findUserByEmail(email: string): Promise<AuthUserRow | null> {
  return db.user.findUnique({ where: { email }, select: {
    id: true, email: true, fullName: true, role: true, profileCompleted: true,
    passwordHash: true, universityMember: { select: { role: true } }, teamMember: { select: { role: true } },
  } });
}

function findUserById(id: string): Promise<AuthUserRow | null> {
  return db.user.findUnique({ where: { id }, select: {
    id: true, email: true, fullName: true, role: true, profileCompleted: true,
    passwordHash: true, universityMember: { select: { role: true } }, teamMember: { select: { role: true } },
  } }) as Promise<AuthUserRow | null>;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Requête invalide." },
      { status: 400 },
    );
  }
  const { identifier, password } = parsed.data;
  const space = parsed.data.space ?? "etudiant";

  try {
    // Résolution du compte : matricule étudiant OU email (normalisé).
    let user: AuthUserRow | null = null;
    const normalized = identifier.trim().toLowerCase();
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

    if (!looksLikeEmail && space === "etudiant") {
      const profile = await db.studentProfile.findFirst({
        where: { matricule: { equals: identifier.trim(), mode: "insensitive" } },
        select: { userId: true },
      });
      if (profile) user = await findUserById(profile.userId);
    }
    if (!user) user = await findUserByEmail(normalized);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Aucun compte trouvé avec cet identifiant." },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ ok: false, error: "Mot de passe incorrect." }, { status: 401 });
    }

    // Cohérence rôle ↔ espace demandé.
    const expectedRole = ROLE_BY_SPACE[space];
    if (user.role !== expectedRole) {
      return NextResponse.json(
        {
          ok: false,
          error:
            user.role === "STUDENT"
              ? "Ce compte est un compte étudiant — utilisez l'espace Étudiant."
              : user.role === "COMPANY"
                ? "Ce compte est un compte entreprise — utilisez l'espace Entreprise."
                : "Ce compte est un compte établissement — utilisez l'espace Université.",
        },
        { status: 403 },
      );
    }

    const memberRole: UniversityMemberRoleToken | undefined =
      user.role === "UNIVERSITY" && user.universityMember
        ? (user.universityMember.role as UniversityMemberRoleToken)
        : undefined;

    await setSessionCookie({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      profileCompleted: user.profileCompleted,
      memberRole,
      companyAdmin: user.role === "COMPANY" ? user.teamMember?.role === "ADMIN_RH" : undefined,
    });

    const redirect = !user.profileCompleted
      ? onboardingRedirect(space, memberRole)
      : homeRedirect(space, memberRole);

    return NextResponse.json({ ok: true, redirect, profileCompleted: user.profileCompleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de connexion.";
    return NextResponse.json({ ok: false, error: `Connexion impossible : ${message}` }, { status: 500 });
  }
}
