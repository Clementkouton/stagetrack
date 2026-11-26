/**
 * Jetons de session StageTrack — JWT signé HS256 via `jose` (Edge-compatible).
 * ----------------------------------------------------------------------------
 * Le cookie `stagetrack_session` porte un JWT vérifié :
 *  - côté proxy (src/proxy.ts) pour la protection des routes ;
 *  - côté serveur (src/lib/session.ts) pour le filtrage par rôle des actions.
 * Le secret provient de AUTH_SECRET (.env) avec une valeur de développement
 * documentée pour que le projet démarre sans configuration supplémentaire.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "stagetrack_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export type SessionRole = "STUDENT" | "COMPANY" | "UNIVERSITY" | "ADMIN";
/** Sous-rôle du membre université (uniquement quand role === "UNIVERSITY"). */
export type UniversityMemberRoleToken = "ADMIN_SCHOOL" | "HEAD_OF_DEPARTMENT" | "ACADEMIC_SUPERVISOR";

export interface SessionTokenPayload extends JWTPayload {
  sub: string; // User.id
  email: string;
  name: string;
  role: SessionRole;
  profileCompleted: boolean;
  memberRole?: UniversityMemberRoleToken; // role === "UNIVERSITY" uniquement
  /** role === "COMPANY" : true si le membre est ADMIN_RH (false pour un Tuteur). */
  companyAdmin?: boolean;
}

const secretString =
  process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16
    ? process.env.AUTH_SECRET
    : "stagetrack-dev-secret-2026-change-me";

const secretKey = new TextEncoder().encode(secretString);

/** Signe un JWT de session (7 jours, HS256). */
export async function signSessionToken(
  payload: Omit<SessionTokenPayload, "iat" | "exp">,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("stagetrack")
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey);
}

/** Vérifie un JWT de session. Retourne null si invalide / expiré. */
export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, { issuer: "stagetrack" });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return payload as SessionTokenPayload;
  } catch {
    return null;
  }
}
