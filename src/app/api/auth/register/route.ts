/**
 * POST /api/auth/register — Inscription StageTrack (3 espaces).
 * Crée le compte User (mot de passe scrypt) + le profil métier lié, avec
 * profileCompleted = false : la première connexion force l'onboarding
 * (mise à jour du profil) avant d'accéder au dashboard, via src/proxy.ts.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { INSTITUTIONS } from "@/lib/auth";
import {
  companySignupSchema,
  studentSignupSchema,
  universitySignupSchema,
} from "@/lib/auth-schemas";

export const runtime = "nodejs";

const registerSchema = z.discriminatedUnion("space", [
  studentSignupSchema.extend({ space: z.literal("etudiant") }),
  companySignupSchema.extend({ space: z.literal("entreprise") }),
  universitySignupSchema.extend({ space: z.literal("universite") }),
]);

const ONBOARDING_BY_SPACE = {
  etudiant: "/etudiant/profil?onboarding=1",
  entreprise: "/entreprise/parametres?onboarding=1",
  universite: "/etablissement/parametres?onboarding=1",
} as const;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const email = data.email.trim().toLowerCase();
    const emailTaken = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (emailTaken) {
      return NextResponse.json(
        { ok: false, error: "Un compte existe déjà avec cet email — connectez-vous." },
        { status: 409 },
      );
    }

    if (data.space === "etudiant") {
      const matricule = data.matricule.trim().toUpperCase();
      const matriculeTaken = await db.studentProfile.findUnique({ where: { matricule }, select: { id: true } });
      if (matriculeTaken) {
        return NextResponse.json(
          { ok: false, error: "Ce numéro matricule est déjà enregistré — connectez-vous." },
          { status: 409 },
        );
      }
      const institution =
        INSTITUTIONS.find((i) => i.id === data.institution)?.name ?? data.institution;

      const user = await db.user.create({
        data: {
          email,
          passwordHash: await hashPassword(data.password),
          fullName: data.fullName.trim(),
          role: "STUDENT",
          profileCompleted: false,
        },
        select: { id: true, email: true, fullName: true, role: true, profileCompleted: true },
      });
      await db.studentProfile.create({
        data: { userId: user.id, matricule, schoolName: institution },
        select: { id: true },
      });
      await setSessionCookie({ ...user, role: "STUDENT" });
      return NextResponse.json({ ok: true, redirect: ONBOARDING_BY_SPACE.etudiant });
    }

    if (data.space === "entreprise") {
      const companyName = data.companyName.trim();
      const companyTaken = await db.company.findUnique({ where: { name: companyName }, select: { id: true } });
      if (companyTaken) {
        return NextResponse.json(
          { ok: false, error: "Votre entreprise est déjà inscrite — connectez-vous avec votre compte." },
          { status: 409 },
        );
      }
      const user = await db.user.create({
        data: {
          email,
          passwordHash: await hashPassword(data.password),
          fullName: data.contactName.trim(),
          role: "COMPANY",
          profileCompleted: false,
        },
        select: { id: true, email: true, fullName: true, role: true, profileCompleted: true },
      });
      const company = await db.company.create({
        data: {
          name: companyName,
          sector: data.sector,
          city: data.city,
          description: `Entreprise ${data.sector} à ${data.city}, partenaire StageTrack.`,
        },
        select: { id: true },
      });
      await db.teamMember.create({
        data: {
          companyId: company.id,
          userId: user.id,
          name: data.contactName.trim(),
          email,
          role: "ADMIN_RH",
        },
        select: { id: true },
      });
      await setSessionCookie({ ...user, role: "COMPANY" });
      return NextResponse.json({ ok: true, redirect: ONBOARDING_BY_SPACE.entreprise });
    }

    // Espace université
    const acronym = data.acronym.trim().toUpperCase();
    const acronymTaken = await db.universityProfile.findUnique({ where: { acronym }, select: { id: true } });
    if (acronymTaken) {
      return NextResponse.json(
        { ok: false, error: `Le sigle « ${acronym} » est déjà utilisé par un établissement inscrit.` },
        { status: 409 },
      );
    }
    const user = await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(data.password),
        fullName: data.institutionName.trim(),
        role: "UNIVERSITY",
        profileCompleted: false,
      },
      select: { id: true, email: true, fullName: true, role: true, profileCompleted: true },
    });
    const university = await db.universityProfile.create({
      data: { userId: user.id, name: data.institutionName.trim(), acronym, city: null },
      select: { id: true },
    });
    await db.universityMember.create({
      data: {
        userId: user.id,
        universityId: university.id,
        role: "ADMIN_SCHOOL",
        title: data.referentRole,
      },
      select: { id: true },
    });
    await setSessionCookie({ ...user, role: "UNIVERSITY", memberRole: "ADMIN_SCHOOL" });
    return NextResponse.json({ ok: true, redirect: ONBOARDING_BY_SPACE.universite });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur d'inscription.";
    return NextResponse.json({ ok: false, error: `Inscription impossible : ${message}` }, { status: 500 });
  }
}
