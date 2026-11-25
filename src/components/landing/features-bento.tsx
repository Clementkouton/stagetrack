"use client";

import {
  IconArrowRight,
  IconChartHistogram,
  IconClipboardList,
  IconFileCheck,
  IconLayoutKanban,
  IconSparkles,
  IconTargetArrow,
  IconWand,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Reveal, SectionBadge, SectionHeading } from "./shared";

/* ---------- Visuels décoratifs des grandes cartes ---------- */

function MatchingVisual() {
  return (
    <div className="hidden h-full flex-col justify-center gap-2.5 md:flex">
      {[
        { initials: "KK", color: "bg-brand", title: "Développeur Frontend", score: "96 %" },
        { initials: "AX", color: "bg-gold", title: "Backend Python & IA", score: "91 %" },
        { initials: "UB", color: "bg-brand-dark", title: "Réseaux & Télécoms", score: "84 %" },
      ].map((match) => (
        <div
          key={match.title}
          className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-2.5 shadow-sm"
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white",
              match.color
            )}
          >
            {match.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink">{match.title}</p>
            <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gold" style={{ width: match.score }} />
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
            {match.score}
          </span>
        </div>
      ))}
    </div>
  );
}

function KanbanVisual() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2">
      {[
        { label: "Envoyée", cards: ["KKiaPay", "Orabank"], tone: "bg-brand/10 text-brand" },
        { label: "Entretien", cards: ["WaChap"], tone: "bg-gold/10 text-gold-dark" },
      ].map((col) => (
        <div key={col.label} className="space-y-1.5 rounded-lg bg-slate-50 p-2">
          <span className={cn("inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold", col.tone)}>
            {col.label}
          </span>
          {col.cards.map((card) => (
            <div key={card} className="truncate rounded-md border border-slate-200/70 bg-white px-2 py-1.5 text-[9.5px] font-semibold text-slate-600 shadow-sm">
              {card}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CvAiVisual() {
  return (
    <div className="mt-5 space-y-1.5 rounded-lg bg-slate-50 p-3">
      <div className="h-1.5 w-4/5 rounded-full bg-brand/25" />
      <div className="h-1.5 w-full rounded-full bg-slate-200" />
      <div className="h-1.5 w-3/5 rounded-full bg-slate-200" />
      <div className="flex items-center justify-between pt-1">
        <span className="inline-flex items-center gap-1 rounded-md bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold text-gold-dark">
          <IconSparkles size={10} /> Adapté à l&apos;offre
        </span>
        <span className="text-[9px] font-medium text-slate-400">en 12 secondes</span>
      </div>
    </div>
  );
}

function ConventionVisual() {
  return (
    <div className="mt-5 rounded-lg bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
          <IconFileCheck size={14} />
        </span>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-ink">Convention 2026 — KKiaPay</p>
          <p className="text-[9px] text-slate-400">PDF · 3 signataires</p>
        </div>
      </div>
      <svg viewBox="0 0 120 18" className="mt-2 w-full text-gold" aria-hidden>
        <path
          d="M2 12 C 18 2, 30 16, 44 9 S 70 4, 86 11 S 108 6, 118 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function StatsVisual() {
  const bars = [
    { h: 45, label: "Sem. 1", tone: "bg-brand/25" },
    { h: 62, label: "Sem. 2", tone: "bg-brand/40" },
    { h: 58, label: "Sem. 3", tone: "bg-brand/30" },
    { h: 78, label: "Sem. 4", tone: "bg-brand/60" },
    { h: 92, label: "Sem. 5", tone: "bg-brand" },
    { h: 86, label: "Sem. 6", tone: "bg-gold" },
  ];
  return (
    <div className="mt-6 flex items-end justify-between gap-3 rounded-xl bg-slate-50 px-4 pb-3 pt-4 sm:gap-6">
      {bars.map((bar) => (
        <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5">
          <div
            className={cn("w-full max-w-[34px] rounded-t-md transition-all", bar.tone)}
            style={{ height: `${bar.h}px` }}
          />
          <span className="text-[9px] font-medium text-slate-400">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Carte générique ---------- */

function BentoCard({
  icon: Icon,
  tone,
  title,
  description,
  className,
  contentClassName,
  children,
  index,
}: {
  icon: React.ElementType;
  tone: string;
  title: string;
  description: string;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
  index: number;
}) {
  return (
    <Reveal delay={Math.min(index * 0.07, 0.28)} className={cn("h-full", className)}>
      <article className="group relative flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_20px_50px_-20px_rgba(11,57,60,0.25)] sm:p-7">
        <div className={cn("flex flex-1 flex-col", contentClassName)}>
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105",
              tone
            )}
          >
            <Icon size={21} />
          </span>
          <h3 className="mt-4 text-lg font-bold tracking-tight text-ink">{title}</h3>
          <p className="mt-2 text-pretty text-[14.5px] leading-relaxed text-body">{description}</p>
        </div>
        {children}
      </article>
    </Reveal>
  );
}

/* ---------- Section Bento ---------- */

export function FeaturesBento() {
  return (
    <section id="fonctionnalites" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge={<SectionBadge icon={<IconSparkles size={14} />}>Tout le cycle de vie du stage</SectionBadge>}
          title={
            <>
              Une plateforme,{" "}
              <span className="text-brand">chaque étape du stage</span> maîtrisée
            </>
          }
          subtitle="De la publication de l'offre jusqu'au bilan final, StageTrack orchestre l'écosystème complet entre étudiants, entreprises et écoles."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-6">
          <BentoCard
            index={0}
            icon={IconTargetArrow}
            tone="bg-brand/10 text-brand"
            title="Publication d'Offres & Matching Intelligent"
            description="Les entreprises publient leurs offres de stage gratuitement et reçoivent des candidatures qualifiées : chaque profil étudiant est automatiquement comparé aux critères du poste."
            className="lg:col-span-4"
            contentClassName="lg:max-w-[46%]"
          >
            <div className="mt-6 lg:absolute lg:right-6 lg:top-6 lg:mt-0 lg:h-[calc(100%-3rem)] lg:w-[46%] lg:pr-2">
              <MatchingVisual />
            </div>
            <a
              href="#offres"
              className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand lg:mt-auto lg:self-start"
            >
              Voir les offres <IconArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </a>
          </BentoCard>

          <BentoCard
            index={1}
            icon={IconClipboardList}
            tone="bg-gold/10 text-gold-dark"
            title="Portail de Gestion des Stagiaires"
            description="Assignation des tuteurs, suivi des missions hebdomadaires, validation des présences et évaluations de fin de stage : votre pilotage RH complet."
            className="lg:col-span-2"
          />

          <BentoCard
            index={2}
            icon={IconLayoutKanban}
            tone="bg-brand/10 text-brand"
            title="Tracker Kanban des Candidatures"
            description="Fini les tableaux Excel. Suivez chaque candidature, entretien et relance en temps réel."
            className="lg:col-span-2"
          >
            <KanbanVisual />
          </BentoCard>

          <BentoCard
            index={3}
            icon={IconWand}
            tone="bg-gold/10 text-gold-dark"
            title="Générateur de CV & Lettres IA"
            description="Adaptez instantanément votre candidature aux critères précis de chaque offre."
            className="lg:col-span-2"
          >
            <CvAiVisual />
          </BentoCard>

          <BentoCard
            index={4}
            icon={IconFileCheck}
            tone="bg-brand/10 text-brand"
            title="Conventions & Documents Centralisés"
            description="Génération, signature et archivage sécurisé des conventions, attestations et rapports de stage."
            className="lg:col-span-2"
          >
            <ConventionVisual />
          </BentoCard>

          <BentoCard
            index={5}
            icon={IconChartHistogram}
            tone="bg-brand/10 text-brand"
            title="Suivi Pédagogique & Statistiques"
            description="Tableaux de bord clairs pour mesurer l'avancement des objectifs du stage : présences, missions validées, livrables et évaluations — visibles par l'étudiant, le tuteur et l'école."
            className="lg:col-span-6"
          >
            <StatsVisual />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
