import {
  IconArrowLeft,
  IconBuildingBank,
  IconBuildingSkyscraper,
  IconCircleCheck,
  IconSchool,
} from "@tabler/icons-react";
import Link from "next/link";
import { ROLE_LABEL, type Role } from "@/lib/auth";
import { cn } from "@/lib/utils";

const SPACE_DETAILS: Record<Role, string> = {
  etudiant:
    "suivi de vos candidatures en temps réel, tracker Kanban, CV & lettres générés par IA",
  entreprise:
    "gestion de vos offres de stage, de vos stagiaires en poste, des présences et des évaluations",
  universite:
    "suivi de cohorte, validation académique des conventions et des évaluations finales",
};

const SPACE_ICONS = {
  etudiant: IconSchool,
  entreprise: IconBuildingSkyscraper,
  universite: IconBuildingBank,
} as const;

/**
 * Écran d'accueil provisoire de chaque espace (étudiant / entreprise / établissement).
 * La redirection du flux d'authentification y aboutit en attendant les dashboards complets.
 */
export function SpacePlaceholder({ role }: { role: Role }) {
  const IconComponent = SPACE_ICONS[role];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full border-[26px] border-brand/10" />
        <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full border-[30px] border-gold/15" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(11,57,60,0.08) 1px, transparent 0)",
            backgroundSize: "26px 26px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 80%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 80%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl shadow-slate-200/60 sm:p-10">
        <img src="/logo-full.png" alt="StageTrack" className="mx-auto h-10 w-auto" />

        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/5 px-3.5 py-1.5 text-xs font-semibold text-brand">
          <IconCircleCheck size={14} className="text-gold" />
          Compte {ROLE_LABEL[role].toLowerCase()} connecté
        </span>

        <h1 className="mt-4 text-balance text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Bienvenue dans votre espace {ROLE_LABEL[role].toLowerCase()} !
        </h1>

        <p className="mx-auto mt-3 max-w-md text-pretty text-[15px] leading-relaxed text-body">
          Votre compte StageTrack est actif. Le tableau de bord complet —{" "}
          <span className="font-medium text-ink">{SPACE_DETAILS[role]}</span> — arrive très
          bientôt sur la plateforme.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className={cn(
              "group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all duration-200 hover:bg-brand-dark sm:w-auto",
            )}
          >
            <IconArrowLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/auth"
            className="inline-flex w-full items-center justify-center rounded-xl border-2 border-brand/20 bg-white px-6 py-3 text-sm font-semibold text-brand transition-all duration-200 hover:border-brand hover:bg-brand/5 sm:w-auto"
          >
            Changer de profil
          </Link>
        </div>
      </div>

      <p className="relative mt-8 text-xs text-slate-400">
        © 2026 StageTrack — Plateforme 100 % gratuite, sans frais cachés.
      </p>
    </div>
  );
}
