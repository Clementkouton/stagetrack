/**
 * Proxy de protection des routes StageTrack (Next.js 16 — ex middleware).
 * ------------------------------------------------------------------------
 * Vérifie le JWT `stagetrack_session` (jose, Edge-compatible) sur les trois
 * espaces privés :
 *  1. Aucun token → redirection vers /auth (avec ?next=…).
 *  2. Rôle ≠ espace (ex. étudiant sur /entreprise) → redirection vers son espace.
 *  3. profileCompleted === false → verrouillage sur la page de mise à jour du
 *     profil (?onboarding=1) jusqu'à l'enregistrement (qui passe le flag à
 *     true en base, re-signe le JWT et redirige vers le dashboard).
 * Aucun accès base ici : tout se fait depuis le payload du token.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken, type SessionTokenPayload } from "@/lib/jwt";

const SPACE_ROLES = {
  etudiant: "STUDENT",
  entreprise: "COMPANY",
  etablissement: "UNIVERSITY",
} as const;

type Space = keyof typeof SPACE_ROLES;

/** Pages d'onboarding autorisées tant que profileCompleted === false. */
const ONBOARDING_PATHS: Record<Space, string> = {
  etudiant: "/etudiant/profil",
  entreprise: "/entreprise/parametres",
  etablissement: "/etablissement/parametres",
};

/** Page d'accueil par rôle (l'université dépend du sous-rôle du membre). */
function homePath(payload: SessionTokenPayload): string {
  if (payload.role === "STUDENT") return "/etudiant/dashboard";
  if (payload.role === "COMPANY") return "/entreprise/dashboard";
  return payload.memberRole === "ACADEMIC_SUPERVISOR"
    ? "/etablissement/encadrement"
    : "/etablissement/dashboard";
}

/**
 * Isolation stricte au sein de chaque espace :
 *  - Chef de Département / Maître de Mémoire : /etablissement/departements réservé
 *    à l'Admin Université (gestion des chefs) ; le Chef a sa page /encadreurs ;
 *  - Tuteur (isAdmin false) : Offres, Candidatures (ATS) et Documents
 *    administratifs masqués — redirigés vers son dashboard.
 */
function subRouteForbidden(payload: SessionTokenPayload, pathname: string): boolean {
  if (payload.role === "UNIVERSITY") {
    const isDepartements =
      pathname === "/etablissement/departements" || pathname.startsWith("/etablissement/departements/");
    if (isDepartements && payload.memberRole !== "ADMIN_SCHOOL") return true;
    // Page « Maîtres de Mémoire » réservée au Chef de Département.
    const isEncadreurs =
      pathname === "/etablissement/encadreurs" || pathname.startsWith("/etablissement/encadreurs/");
    if (isEncadreurs && payload.memberRole !== "HEAD_OF_DEPARTMENT") return true;
    return false;
  }
  if (payload.role === "COMPANY" && payload.companyAdmin === false) {
    const forbidden = ["/entreprise/offres", "/entreprise/candidatures", "/entreprise/documents"];
    if (forbidden.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  }
  return false;
}

function spaceOf(pathname: string): Space | null {
  for (const space of Object.keys(SPACE_ROLES) as Space[]) {
    if (pathname === `/${space}` || pathname.startsWith(`/${space}/`)) return space;
  }
  return null;
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const space = spaceOf(pathname);
  if (!space) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // 1. Non authentifié ou token invalide → /auth (la page cible est mémorisée).
  const payload = token ? await verifySessionToken(token) : null;
  if (!payload) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    const response = NextResponse.redirect(url);
    if (token) response.cookies.delete(SESSION_COOKIE); // token expiré/corrompu
    return response;
  }

  // 2. Un rôle ne peut pas accéder à l'espace d'un autre rôle.
  if (payload.role !== SPACE_ROLES[space]) {
    const url = request.nextUrl.clone();
    url.pathname = homePath(payload);
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 2 bis. Sous-routes interdites au sous-rôle courant (Chef / Maître de
  // Mémoire / Tuteur) : redirection vers l'accueil de l'espace.
  if (subRouteForbidden(payload, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = homePath(payload);
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 3. Onboarding obligatoire tant que le profil n'est pas complété.
  const onboardingPath = ONBOARDING_PATHS[space];
  const isOnboardingPage =
    pathname === onboardingPath || pathname.startsWith(`${onboardingPath}/`);
  if (payload.profileCompleted === false) {
    if (isOnboardingPage) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = onboardingPath;
    url.search = "?onboarding=1";
    return NextResponse.redirect(url);
  }

  // 4. Profil complété : nettoyage du paramètre d'onboarding résiduel.
  if (isOnboardingPage && request.nextUrl.searchParams.get("onboarding") === "1") {
    const url = request.nextUrl.clone();
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/etudiant/:path*", "/entreprise/:path*", "/etablissement/:path*"],
};
