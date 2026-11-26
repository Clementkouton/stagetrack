/**
 * Vue 7 — Paramètres & Profil :
 *  - ADMIN_SCHOOL : édition du nom, du sigle et de la ville de l'établissement ;
 *  - HEAD_OF_DEPARTMENT / ACADEMIC_SUPERVISOR : « Mon profil » — onboarding en
 *    3 étapes à la première connexion (photo/avatar, fonction, mot de passe)
 *    (profileCompleted = false → ?onboarding=1).
 */
import { db } from "@/lib/db";
import { getEtablissementContext } from "@/lib/etablissement-data";
import {
  ParametresClient,
  MemberProfileClient,
  type ParametresPayload,
  type MemberProfilePayload,
} from "@/components/etablissement/parametres-client";
import { EtabDbError } from "@/components/etablissement/shell";

export const dynamic = "force-dynamic";

export default async function EtablissementParametresPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const ctx = await getEtablissementContext();
  if (!ctx) return <EtabDbError message="Base de données inaccessible." />;

  const { onboarding } = await searchParams;
  const isOnboarding = onboarding === "1";

  if (ctx.role === "ADMIN_SCHOOL") {
    const payload: ParametresPayload = {
      name: ctx.universityName,
      acronym: ctx.universityAcronym,
      city: ctx.universityCity ?? "",
      memberName: ctx.memberName,
      memberEmail: ctx.memberEmail,
      isOnboarding,
    };
    return <ParametresClient payload={payload} />;
  }

  // Avatar du membre de session (rattaché au compte réel, pas à la prévisualisation).
  const sessionUser = await db.user.findUnique({
    where: { id: ctx.sessionUserId },
    select: { avatarUrl: true },
  });

  const payload: MemberProfilePayload = {
    memberName: ctx.memberName,
    memberEmail: ctx.memberEmail,
    memberTitle: ctx.memberTitle,
    memberAvatarUrl: sessionUser?.avatarUrl ?? null,
    role: ctx.role,
    departmentName: ctx.departmentName,
    universityName: ctx.universityName,
    universityAcronym: ctx.universityAcronym,
    isOnboarding,
  };
  return <MemberProfileClient payload={payload} />;
}
