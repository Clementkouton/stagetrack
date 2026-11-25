import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IconArrowLeft, IconCircleCheck } from "@tabler/icons-react";
import { AuthFlowFromQuery } from "@/components/auth/auth-page-client";

export const metadata: Metadata = {
  title: "Connexion & Inscription — StageTrack",
  description:
    "Connectez-vous ou créez gratuitement votre espace étudiant, entreprise ou établissement. StageTrack : la plateforme 100 % gratuite pour les stages.",
  icons: {
    icon: "/logo-icon.png",
  },
};

const benefits = [
  "100 % gratuit pour tous les profils, sans frais cachés",
  "Offres de stage vérifiées et entreprises partenaires",
  "Suivi en temps réel, du premier clic à l'attestation finale",
];

const stats = [
  { value: "+15 000", label: "Étudiants accompagnés" },
  { value: "+2 400", label: "Entreprises actives" },
  { value: "+450", label: "Écoles partenaires" },
];

function AuthFallback() {
  return (
    <div
      aria-hidden
      className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50"
    >
      <div className="h-8 w-44 animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-7 space-y-3">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-200/80" />
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Panneau de marque — desktop uniquement */}
      <aside className="relative hidden w-[44%] max-w-2xl flex-col justify-between overflow-hidden bg-brand p-10 lg:flex xl:p-14">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[26px] border-gold/15" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-[30px] border-gold/10" />
          <div className="absolute right-[18%] top-[38%] h-2.5 w-2.5 rounded-full bg-gold/50" />
          <div className="absolute bottom-[24%] left-[22%] h-2 w-2 rounded-full bg-gold/40" />
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(184,160,46,0.35) 1px, transparent 0)",
              backgroundSize: "30px 30px",
              maskImage: "linear-gradient(to bottom, black 0%, transparent 75%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 75%)",
            }}
          />
        </div>

        <Link
          href="/"
          className="relative inline-flex w-fit items-center rounded-2xl bg-white px-4 py-2.5 shadow-xl shadow-black/20 transition-transform duration-200 hover:scale-[1.02]"
        >
          <img src="/logo-full.png" alt="StageTrack — Accueil" className="h-8 w-auto" />
        </Link>

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold sm:text-[13px]">
            100 % Gratuit — sans frais cachés
          </span>
          <h2 className="mt-6 text-balance text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
            Un seul compte.
            <br />
            <span className="text-gold">Tout votre parcours stage.</span>
          </h2>
          <p className="mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-white/70">
            Candidatures, conventions, missions hebdomadaires, évaluations finales : votre
            espace StageTrack centralise chaque étape entre étudiants, entreprises et écoles.
          </p>
          <ul className="mt-7 space-y-3">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2.5 text-[14px] leading-snug text-white/80"
              >
                <IconCircleCheck size={18} stroke={1.8} className="mt-0.5 shrink-0 text-gold" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex gap-8 border-t border-white/10 pt-6">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-xl font-extrabold text-gold">{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-white/55">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </aside>

      {/* Flux d'authentification */}
      <main className="relative flex flex-1 flex-col px-4 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-7 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand"
            >
              <IconArrowLeft size={16} />
              Retour à l&apos;accueil
            </Link>
            <img
              src="/logo-full.png"
              alt="StageTrack"
              className="h-8 w-auto lg:hidden"
            />
          </div>

          <Suspense fallback={<AuthFallback />}>
            <AuthFlowFromQuery />
          </Suspense>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            En continuant, vous acceptez les{" "}
            <Link
              href="#"
              className="font-semibold text-slate-500 underline underline-offset-2 transition-colors hover:text-brand"
            >
              Conditions générales d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link
              href="#"
              className="font-semibold text-slate-500 underline underline-offset-2 transition-colors hover:text-brand"
            >
              Politique de confidentialité
            </Link>{" "}
            de StageTrack.
          </p>
        </div>
      </main>
    </div>
  );
}
