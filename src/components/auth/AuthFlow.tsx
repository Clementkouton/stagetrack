"use client";

/**
 * Flux d'authentification StageTrack :
 * 1. Sélecteur de profil (« Qui êtes-vous ? ») — 3 cartes interactives.
 * 2. Écrans Connexion / Inscription adaptés au rôle choisi.
 * 3. Overlay animé de succès puis redirection vers l'espace correspondant.
 *
 * Réutilisable dans <RoleSelectorModal /> (modale) ou sur la page /auth.
 */

import {
  IconArrowLeft,
  IconArrowRight,
  IconBuildingBank,
  IconBuildingSkyscraper,
  IconCheck,
  IconChevronRight,
  IconLoader2,
  IconSchool,
  IconSparkles,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { Icon } from "@tabler/icons-react";
import {
  ROLE_LABEL,
  ROLE_REDIRECT,
  ROLE_SUBTITLE,
  isAuthMode,
  isRole,
  type AuthMode,
  type Role,
} from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  CompanyLoginForm,
  CompanySignupForm,
  StudentLoginForm,
  StudentSignupForm,
  UniversityLoginForm,
  UniversitySignupForm,
  type AuthFormProps,
} from "./forms";

const EASE = [0.22, 1, 0.36, 1] as const;

interface RoleCard {
  role: Role;
  icon: Icon;
  title: string;
  description: string;
}

const ROLE_CARDS: RoleCard[] = [
  {
    role: "etudiant",
    icon: IconSchool,
    title: "Étudiant",
    description: "Rechercher un stage, suivre mes candidatures et mon parcours.",
  },
  {
    role: "entreprise",
    icon: IconBuildingSkyscraper,
    title: "Entreprise",
    description: "Publier des offres de stage et gérer mes stagiaires.",
  },
  {
    role: "universite",
    icon: IconBuildingBank,
    title: "Université / Entité",
    description: "Suivre mes étudiants en stage et valider les conventions.",
  },
];

const ROLE_FORMS: Record<Role, Record<AuthMode, (props: AuthFormProps) => React.ReactElement>> = {
  etudiant: { connexion: StudentLoginForm, inscription: StudentSignupForm },
  entreprise: { connexion: CompanyLoginForm, inscription: CompanySignupForm },
  universite: { connexion: UniversityLoginForm, inscription: UniversitySignupForm },
};

export interface AuthFlowProps {
  /** "page" : carte avec ombre ; "modal" : contenu nu pour la Dialog. */
  variant?: "page" | "modal";
  /** Pré-sélection via l'URL : /auth?role=etudiant&mode=inscription */
  initialRole?: string | null;
  initialMode?: string | null;
  /** Appelé juste avant la redirection (ex. fermer la modale). */
  onComplete?: () => void;
}

export function AuthFlow({
  variant = "page",
  initialRole,
  initialMode,
  onComplete,
}: AuthFlowProps) {
  const router = useRouter();
  const toggleLayoutId = useId();
  const [role, setRole] = useState<Role | null>(() =>
    isRole(initialRole) ? initialRole : null,
  );
  const [mode, setMode] = useState<AuthMode>(() =>
    isAuthMode(initialMode) ? initialMode : "connexion",
  );
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const selectRole = (nextRole: Role) => {
    setRole(nextRole);
    setStatus("idle");
  };

  const backToRoles = () => {
    setRole(null);
    setStatus("idle");
  };

  const handleAuthSuccess = (nextRole: Role, redirect?: string) => {
    setStatus("success");
    window.setTimeout(() => {
      onComplete?.();
      // Redirection calculée par l'API (onboarding profileCompleted=false,
      // Maître de Mémoire → encadrement, sinon dashboard du rôle).
      router.push(redirect ?? ROLE_REDIRECT[nextRole]);
    }, 1800);
  };

  return (
    <div
      className={cn(
        "relative w-full",
        variant === "page"
          ? "rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8"
          : "px-5 pb-7 pt-6 sm:px-7",
      )}
    >
      {variant === "modal" ? (
        <img src="/logo-full.png" alt="StageTrack" className="mx-auto mb-5 h-9 w-auto" />
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {role ? (
          <motion.div
            key={`screen-${role}`}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <AuthScreen
              role={role}
              mode={mode}
              onModeChange={setMode}
              layoutId={toggleLayoutId}
              onBack={backToRoles}
              onSuccess={handleAuthSuccess}
            />
          </motion.div>
        ) : (
          <motion.div
            key="role-selector"
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <RoleSelector variant={variant} onSelect={selectRole} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay animé de succès (écran de chargement → redirection) */}
      <AnimatePresence>
        {status === "success" && role ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="status"
            aria-live="polite"
            className={cn(
              "absolute inset-0 z-20 flex items-center justify-center bg-white/95 backdrop-blur-sm",
              variant === "page" ? "rounded-3xl" : "rounded-3xl",
            )}
          >
            <div className="flex flex-col items-center px-6 text-center">
              <motion.span
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-2xl shadow-brand/40"
              >
                <IconCheck size={30} stroke={2.6} />
                <motion.span
                  aria-hidden
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="absolute -inset-2.5 rounded-full border-2 border-gold/50"
                />
              </motion.span>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.3 }}
                className="mt-5 text-lg font-extrabold tracking-tight text-ink"
              >
                {mode === "inscription" ? "Compte créé avec succès !" : "Connexion réussie !"}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.28, duration: 0.3 }}
                className="mt-1.5 text-sm text-body"
              >
                Redirection vers votre espace {ROLE_LABEL[role].toLowerCase()}…
              </motion.p>
              <IconLoader2 size={18} className="mt-4 animate-spin text-brand" />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Étape 1 : Sélecteur de profil                                      */
/* ------------------------------------------------------------------ */

function RoleSelector({
  variant,
  onSelect,
}: {
  variant: "page" | "modal";
  onSelect: (role: Role) => void;
}) {
  const isModal = variant === "modal";

  return (
    <div>
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold text-gold-dark">
          <IconSparkles size={14} className="text-gold" />
          100 % Gratuit — sans frais cachés
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          Qui êtes-vous ?
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-body">
          Sélectionnez votre espace StageTrack pour continuer.
        </p>
      </div>

      <div className={cn("mt-7 grid gap-3", !isModal && "sm:grid-cols-3")}>
        {ROLE_CARDS.map((card, index) => (
          <motion.button
            key={card.role}
            type="button"
            onClick={() => onSelect(card.role)}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 + index * 0.07, ease: EASE }}
            whileHover={{ y: isModal ? 2 : -6 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative w-full overflow-hidden rounded-2xl border-2 border-slate-200/80 bg-white text-left transition-colors duration-200 outline-none hover:border-gold hover:bg-brand focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/40",
              isModal ? "flex items-center gap-4 p-4" : "flex flex-col items-start gap-3 p-5 sm:p-6",
            )}
            aria-label={`Continuer en tant que ${card.title}`}
          >
            {/* Halo doré au survol */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gold/0 transition-colors duration-300 group-hover:bg-gold/15"
            />

            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold transition-colors duration-200 group-hover:bg-white/10">
              <card.icon size={24} stroke={1.8} />
            </span>

            <span className={cn(isModal && "min-w-0 flex-1")}>
              <span className="block text-[15px] font-bold text-ink transition-colors duration-200 group-hover:text-white">
                {card.title}
              </span>
              <span
                className={cn(
                  "block text-[13px] leading-snug text-body transition-colors duration-200 group-hover:text-white/70",
                  isModal ? "mt-0.5" : "mt-1",
                )}
              >
                {card.description}
              </span>
            </span>

            {isModal ? (
              <IconChevronRight
                size={18}
                className="shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-gold"
              />
            ) : (
              <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[13px] font-semibold text-brand opacity-0 transition-all duration-200 group-hover:text-gold group-hover:opacity-100">
                Continuer
                <IconArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
        Un seul compte pour l&apos;ensemble de la plateforme.
        <br className="sm:hidden" /> Aucune carte bancaire requise.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Étape 2 : Écrans Connexion / Inscription du rôle sélectionné       */
/* ------------------------------------------------------------------ */

function ModeToggle({
  mode,
  onChange,
  layoutId,
}: {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
  layoutId: string;
}) {
  const options: { value: AuthMode; label: string }[] = [
    { value: "connexion", label: "Connexion" },
    { value: "inscription", label: "Inscription" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Choisir entre connexion et inscription"
      className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
    >
      {options.map((option) => {
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-lg py-2.5 text-sm font-semibold transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
              active ? "text-white" : "text-slate-500 hover:text-brand",
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-brand shadow-md shadow-brand/25"
                aria-hidden
              />
            ) : null}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function AuthScreen({
  role,
  mode,
  onModeChange,
  layoutId,
  onBack,
  onSuccess,
}: {
  role: Role;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  layoutId: string;
  onBack: () => void;
  onSuccess: (role: Role, redirect?: string) => void;
}) {
  const card = ROLE_CARDS.find((c) => c.role === role) ?? ROLE_CARDS[0];
  const ActiveForm = ROLE_FORMS[role][mode];

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="group inline-flex items-center gap-1.5 rounded-lg text-[13px] font-semibold text-slate-500 transition-colors outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-gold/50"
      >
        <IconArrowLeft
          size={15}
          className="transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        Changer de profil
      </button>

      <div className="mt-5 flex items-center gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/8 text-brand">
          <card.icon size={24} stroke={1.8} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">
            Espace {ROLE_LABEL[role]}
          </h2>
          <p className="mt-0.5 text-[13px] leading-snug text-body">{ROLE_SUBTITLE[role]}</p>
        </div>
      </div>

      <ModeToggle mode={mode} onChange={onModeChange} layoutId={layoutId} />

      <div className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${role}-${mode}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <ActiveForm onSuccess={(redirect?: string) => onSuccess(role, redirect)} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
