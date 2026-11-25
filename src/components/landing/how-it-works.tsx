"use client";

import {
  IconArrowRight,
  IconBriefcase,
  IconBuildingStore,
  IconClipboardCheck,
  IconSchool,
  IconTrophy,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { Reveal, SectionBadge, SectionHeading } from "./shared";

/* ---------- Carte d'étape réutilisable ---------- */

function StepCard({
  step,
  icon: Icon,
  title,
  description,
  variant,
  index,
}: {
  step: string;
  icon: React.ElementType;
  title: string;
  description: string;
  variant: "student" | "company";
  index: number;
}) {
  const isStudent = variant === "student";
  return (
    <Reveal delay={index * 0.12} className="h-full">
      <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(11,57,60,0.3)]">
        {/* Numéro en filigrane */}
        <span
          aria-hidden
          className={`pointer-events-none absolute -right-1 -top-4 select-none text-[64px] font-extrabold leading-none tracking-tighter ${
            isStudent ? "text-brand/8" : "text-gold/12"
          }`}
        >
          {step}
        </span>

        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${
            isStudent ? "bg-brand text-white shadow-md shadow-brand/25" : "bg-gold text-white shadow-md shadow-gold/25"
          }`}
        >
          <Icon size={20} />
        </span>

        <p
          className={`mt-4 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
            isStudent ? "bg-brand/8 text-brand" : "bg-gold/10 text-gold-dark"
          }`}
        >
          Étape {step}
        </p>
        <h3 className="mt-2.5 text-lg font-bold tracking-tight text-ink sm:text-xl">{title}</h3>
        <p className="mt-2.5 text-pretty text-[14.5px] leading-relaxed text-body">{description}</p>
      </article>
    </Reveal>
  );
}

/* ---------- Côté Étudiant ---------- */

export function HowItWorksStudent() {
  const steps = [
    {
      icon: IconUserPlus,
      title: "Créez votre profil & optimisez votre CV",
      description:
        "Inscrivez-vous gratuitement en 2 minutes, importez votre parcours et laissez l'IA adapter votre CV et vos lettres de motivation aux offres visées.",
    },
    {
      icon: IconSchool,
      title: "Postulez et suivez vos candidatures en temps réel",
      description:
        "Parcourez les offres vérifiées, candidatez en un clic et pilotez vos entretiens et relances depuis votre tableau Kanban intelligent.",
    },
    {
      icon: IconTrophy,
      title: "Réussissez votre stage de A à Z",
      description:
        "Centralisez votre convention, suivez vos missions hebdomadaires avec votre tuteur et récupérez votre attestation et évaluation finale.",
    },
  ];

  return (
    <section id="parcours-etudiant" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge={
            <SectionBadge icon={<IconSchool size={14} />}>Parcours Étudiant</SectionBadge>
          }
          title={
            <>
              Comment ça marche —{" "}
              <span className="text-brand">Côté Étudiant</span>
            </>
          }
          subtitle="Trois étapes simples pour décrocher et réussir votre stage, sans jamais perdre le fil."
        />

        <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
          {/* Ligne de connexion (desktop) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-14 hidden border-t-2 border-dashed border-brand/15 lg:block"
          />
          {steps.map((step, index) => (
            <StepCard
              key={step.title}
              step={`0${index + 1}`}
              icon={step.icon}
              title={step.title}
              description={step.description}
              variant="student"
              index={index}
            />
          ))}
        </div>

        <Reveal delay={0.2} className="mt-10 flex justify-center">
          <a
            href="#offres"
            className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all duration-200 hover:bg-brand-dark"
          >
            Créer mon profil étudiant — Gratuit
            <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Côté Entreprise ---------- */

export function HowItWorksCompany() {
  const steps = [
    {
      icon: IconBuildingStore,
      title: "Créez votre espace entreprise gratuitement",
      description:
        "Renseignez votre structure et invitez vos responsables RH ou tuteurs de stage sans aucun abonnement ni frais caché.",
    },
    {
      icon: IconBriefcase,
      title: "Publiez vos offres et sélectionnez vos talents",
      description:
        "Diffusez vos besoins de stages en quelques clics, recevez des profils ciblés et gérez vos entretiens depuis un pipeline clair.",
    },
    {
      icon: IconClipboardCheck,
      title: "Pilotez et gérez vos stagiaires en poste",
      description:
        "Intégrez vos stagiaires recrutés sur la plateforme : assignez leurs tâches, suivez leurs présences, validez leurs livrables et générez leurs bilans d'évaluation.",
    },
  ];

  return (
    <section id="parcours-entreprise" className="scroll-mt-24 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge={
            <SectionBadge variant="gold" icon={<IconUsers size={14} />}>
              Espace Recruteur & Tuteur
            </SectionBadge>
          }
          title={
            <>
              Comment ça marche —{" "}
              <span className="text-gold-dark">Côté Entreprise</span>
            </>
          }
          subtitle="Un espace dédié pour recruter, intégrer et suivre vos stagiaires, du premier échange au bilan final."
        />

        <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-14 hidden border-t-2 border-dashed border-gold/25 lg:block"
          />
          {steps.map((step, index) => (
            <StepCard
              key={step.title}
              step={`0${index + 1}`}
              icon={step.icon}
              title={step.title}
              description={step.description}
              variant="company"
              index={index}
            />
          ))}
        </div>

        <Reveal delay={0.2} className="mt-10 flex justify-center">
          <a
            href="#offres"
            className="group inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gold/30 transition-all duration-200 hover:bg-gold-dark"
          >
            Créer mon espace entreprise — Gratuit
            <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
