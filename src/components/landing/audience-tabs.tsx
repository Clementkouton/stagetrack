"use client";

import { motion } from "framer-motion";
import {
  IconBook2,
  IconBuildingSkyscraper,
  IconClipboardList,
  IconFileCheck,
  IconLayoutKanban,
  IconLibrary,
  IconMessageForward,
  IconSchool,
  IconSparkles,
  IconTargetArrow,
  IconUsersGroup,
  IconWand,
} from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Reveal, SectionBadge, SectionHeading } from "./shared";

/* ---------- Données des 3 publics ---------- */

interface AudienceTab {
  id: string;
  icon: React.ElementType;
  label: string;
  title: string;
  description: string;
  features: { icon: React.ElementType; text: string }[];
  cta: string;
  visual: React.ReactNode;
}

function StudentVisual() {
  return (
    <div className="space-y-2.5">
      {[
        { title: "Candidature — KKiaPay", meta: "Entretien jeudi · préparation IA prête", tone: "bg-brand" },
        { title: "Candidature — Orabank Bénin", meta: "CV adapté · en attente de réponse", tone: "bg-gold" },
        { title: "Candidature — WaChap", meta: "Offre reçue · à confirmer", tone: "bg-emerald-500" },
      ].map((row) => (
        <div key={row.title} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm">
          <span className={cn("h-8 w-1.5 rounded-full", row.tone)} />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-ink">{row.title}</p>
            <p className="truncate text-[11px] text-slate-400">{row.meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompanyVisual() {
  return (
    <div className="space-y-2.5">
      {[
        { name: "Fatou B.", meta: "Missions 6/8 · présence validée", progress: 75, tone: "bg-brand" },
        { name: "Marc A.", meta: "Missions 4/8 · livrable en relecture", progress: 50, tone: "bg-brand/60" },
        { name: "Yacine K.", meta: "Évaluation finale · à signer", progress: 100, tone: "bg-gold" },
      ].map((row) => (
        <div key={row.name} className="rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-ink">{row.name}</p>
            <span className="text-[10px] font-semibold text-slate-400">{row.progress} %</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">{row.meta}</p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100">
            <div className={cn("h-full rounded-full", row.tone)} style={{ width: `${row.progress}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SchoolVisual() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5">
        <p className="text-[11px] font-bold text-slate-600">Licence 3 Informatique — 2026</p>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[9.5px] font-bold text-brand">128 étudiants</span>
      </div>
      {[
        { name: "Aïcha D.", meta: "Convention signée", status: "En poste", tone: "bg-emerald-50 text-emerald-700" },
        { name: "Kola E.", meta: "Convention à valider", status: "En attente", tone: "bg-gold/10 text-gold-dark" },
        { name: "Sena T.", meta: "Évaluation finale reçue", status: "Terminé", tone: "bg-brand/10 text-brand" },
      ].map((row) => (
        <div key={row.name} className="flex items-center justify-between border-t border-slate-100 px-3.5 py-2.5">
          <div>
            <p className="text-xs font-bold text-ink">{row.name}</p>
            <p className="text-[10.5px] text-slate-400">{row.meta}</p>
          </div>
          <span className={cn("rounded-full px-2 py-1 text-[9.5px] font-bold", row.tone)}>{row.status}</span>
        </div>
      ))}
    </div>
  );
}

const AUDIENCES: AudienceTab[] = [
  {
    id: "etudiants",
    icon: IconSchool,
    label: "Pour les Étudiants",
    title: "Décrochez votre stage, gardez le contrôle",
    description:
      "Un espace pensé pour votre recherche : des offres vérifiées, un tracker de candidatures clair et des outils IA qui mettent votre profil en valeur.",
    features: [
      { icon: IconTargetArrow, text: "Recherche d'offres vérifiées par secteur, ville et entreprise" },
      { icon: IconLayoutKanban, text: "Tracker de candidatures Kanban : envoyées, entretiens, relances" },
      { icon: IconWand, text: "Outils IA : CV et lettres de motivation adaptés à chaque offre" },
      { icon: IconClipboardList, text: "Suivi de mission hebdomadaire avec votre tuteur en entreprise" },
    ],
    cta: "Créer mon compte étudiant",
    visual: <StudentVisual />,
  },
  {
    id: "entreprises",
    icon: IconBuildingSkyscraper,
    label: "Pour les Entreprises & Tuteurs",
    title: "Recrutez et pilotez vos stagiaires sans effort",
    description:
      "Un espace recruteur complet pour diffuser vos offres, sélectionner les meilleurs profils et accompagner vos stagiaires jusqu'au bilan final.",
    features: [
      { icon: IconBuildingSkyscraper, text: "Publication illimitée d'offres de stage, sans aucun frais" },
      { icon: IconUsersGroup, text: "Pipeline de recrutement clair pour gérer vos entretiens" },
      { icon: IconClipboardList, text: "Tableau de bord de gestion des stagiaires intégré" },
      { icon: IconFileCheck, text: "Suivi des livrables, présences et bilans d'évaluation" },
    ],
    cta: "Créer mon espace entreprise",
    visual: <CompanyVisual />,
  },
  {
    id: "ecoles",
    icon: IconLibrary,
    label: "Pour les Écoles & Universités",
    title: "Suivez vos cohortes, garantissez la qualité",
    description:
      "Un espace académique pour valider les conventions, suivre chaque cohorte en temps réel et dialoguer directement avec les tuteurs en entreprise.",
    features: [
      { icon: IconLibrary, text: "Suivi de cohorte : postes, conventions et avancement en un coup d'œil" },
      { icon: IconFileCheck, text: "Validation académique des conventions et des évaluations" },
      { icon: IconMessageForward, text: "Lien direct avec les tuteurs en entreprise" },
      { icon: IconBook2, text: "Rapports pédagogiques exportables pour votre équipe" },
    ],
    cta: "Enregistrer mon établissement",
    visual: <SchoolVisual />,
  },
];

export function AudienceTabs() {
  return (
    <section id="publics" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge={<SectionBadge icon={<IconUsersGroup size={14} />}>Un écosystème connecté</SectionBadge>}
          title={
            <>
              Un espace conçu pour{" "}
              <span className="text-brand">chaque acteur</span>
            </>
          }
          subtitle="Étudiants, entreprises et écoles travaillent sur la même plateforme, chacun avec des outils adaptés à son rôle."
        />

        <Reveal delay={0.12} className="mt-12">
          <Tabs defaultValue={AUDIENCES[0].id} className="w-full">
            <TabsList className="mx-auto flex h-auto w-full max-w-2xl flex-col gap-1 rounded-2xl border border-slate-200/80 bg-slate-50 p-1.5 sm:flex-row sm:gap-0">
              {AUDIENCES.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-11 flex-1 gap-2 rounded-xl px-3 text-[13px] font-semibold data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-sm sm:text-sm"
                >
                  <tab.icon size={16} />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {AUDIENCES.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-8">
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="grid items-center gap-8 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-brand-50/50 p-6 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10"
                >
                  {/* Texte + fonctionnalités */}
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">
                      {tab.title}
                    </h3>
                    <p className="mt-3 text-pretty text-[15px] leading-relaxed text-body">
                      {tab.description}
                    </p>
                    <ul className="mt-6 space-y-3.5">
                      {tab.features.map((feature) => (
                        <li key={feature.text} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                            <feature.icon size={15} />
                          </span>
                          <span className="text-[14.5px] font-medium leading-relaxed text-slate-700">
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <a
                      href="#cta-final"
                      className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand/20 transition-colors hover:bg-brand-dark"
                    >
                      <IconSparkles size={16} />
                      {tab.cta}
                    </a>
                  </div>

                  {/* Visuel */}
                  <div className="rounded-2xl border border-slate-200/60 bg-slate-50/60 p-4 sm:p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold-dark">
                        <tab.icon size={15} />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Aperçu de l&apos;espace
                      </p>
                    </div>
                    {tab.visual}
                  </div>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        </Reveal>
      </div>
    </section>
  );
}
