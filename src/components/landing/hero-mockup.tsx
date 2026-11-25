"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  IconBuildingSkyscraper,
  IconCalendarCheck,
  IconCheck,
  IconCirclePlus,
  IconClipboardCheck,
  IconDotsVertical,
  IconFileText,
  IconFilter,
  IconSchool,
  IconSearch,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type MockupView = "etudiant" | "entreprise";

/* ---------- Fenêtre de navigateur partagée ---------- */

function WindowChrome({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-brand/15">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {url}
          </span>
        </div>
        <IconDotsVertical size={14} className="text-slate-300" />
      </div>
      {children}
    </div>
  );
}

/* ---------- Maquette 1 : Kanban de candidatures (Étudiant) ---------- */

const kanbanColumns = [
  {
    name: "Candidatures envoyées",
    count: 3,
    dot: "bg-brand/40",
    badge: "bg-brand/10 text-brand",
    cards: [
      {
        initials: "KK",
        color: "bg-brand",
        title: "Développeur Frontend React",
        company: "KKiaPay",
        meta: "Il y a 2 j",
        chip: "CV envoyé",
      },
      {
        initials: "OB",
        color: "bg-gold",
        title: "Analyste Crédit & Conformité",
        company: "Orabank Bénin",
        meta: "Il y a 3 j",
        chip: "CV envoyé",
      },
      {
        initials: "AX",
        color: "bg-gold-dark",
        title: "Backend Python & IA",
        company: "Axazara",
        meta: "Il y a 4 j",
        chip: "Relancée",
        hideOnMobile: true,
      },
    ],
  },
  {
    name: "Entretien planifié",
    count: 2,
    dot: "bg-gold",
    badge: "bg-gold/10 text-gold-dark",
    cards: [
      {
        initials: "WC",
        color: "bg-brand-dark",
        title: "Marketing Digital",
        company: "WaChap",
        meta: "Demain, 10 h",
        chip: "Visio",
      },
      {
        initials: "UB",
        color: "bg-brand",
        title: "Réseaux & Télécoms",
        company: "UBA Bénin",
        meta: "Ven. 14 h",
        chip: "Sur site",
        hideOnMobile: true,
      },
    ],
  },
  {
    name: "Offre reçue",
    count: 1,
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    cards: [
      {
        initials: "WC",
        color: "bg-brand-dark",
        title: "Stage Marketing pré-embauche",
        company: "WaChap",
        meta: "4 mois",
        chip: "À confirmer",
      },
    ],
  },
];

function StudentKanbanMockup() {
  return (
    <WindowChrome url="app.stagetrack.bj/etudiant/candidatures">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[13px] font-bold text-ink sm:text-sm">Mes candidatures</p>
          <p className="text-[10px] text-slate-400 sm:text-[11px]">6 offres suivies en temps réel</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-[10px] font-medium text-slate-500 sm:inline-flex">
            <IconSearch size={11} /> Rechercher
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-[10px] font-medium text-slate-500">
            <IconFilter size={11} /> Filtres
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
            NA
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 px-4 pb-4 sm:grid-cols-3 sm:px-5">
        {kanbanColumns.map((col) => (
          <div key={col.name} className="space-y-2 rounded-xl bg-slate-50 p-2.5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 sm:text-[11px]">
                <span className={cn("h-1.5 w-1.5 rounded-full", col.dot)} />
                {col.name}
              </p>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                  col.badge
                )}
              >
                {col.count}
              </span>
            </div>
            {col.cards.map((card) => (
              <div
                key={`${col.name}-${card.company}-${card.title}`}
                className={cn(
                  "rounded-lg border border-slate-200/70 bg-white p-2.5 shadow-sm",
                  card.hideOnMobile && "hidden sm:block"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[8px] font-bold text-white",
                      card.color
                    )}
                  >
                    {card.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold text-ink sm:text-[11px]">
                      {card.title}
                    </p>
                    <p className="truncate text-[9px] text-slate-400">{card.company}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-medium text-slate-500">
                    {card.chip}
                  </span>
                  <span className="text-[8.5px] text-slate-400">{card.meta}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 bg-brand-50/60 px-4 py-2.5 sm:px-5">
        <IconSparkles size={13} className="shrink-0 text-gold" />
        <p className="text-[10px] font-medium text-brand sm:text-[11px]">
          IA — Lettre de motivation adaptée à l&apos;offre KKiaPay, prête à relire.
        </p>
      </div>
    </WindowChrome>
  );
}

/* ---------- Maquette 2 : Dashboard de suivi (Entreprise) ---------- */

const companyStats = [
  { icon: IconUsers, label: "Stagiaires actifs", value: "4", trend: "+1 ce mois", tone: "bg-brand/10 text-brand" },
  { icon: IconCalendarCheck, label: "Présence du jour", value: "94 %", trend: "3/4 pointés", tone: "bg-emerald-50 text-emerald-600" },
  { icon: IconClipboardCheck, label: "Évaluations à faire", value: "1", trend: "Avant le 30", tone: "bg-gold/10 text-gold-dark" },
];

const companyInterns = [
  {
    name: "Fatou Balde",
    role: "Développeuse Frontend",
    missions: "Missions validées : 6/8",
    progress: 75,
    status: "Présent",
    statusTone: "bg-emerald-50 text-emerald-700",
  },
  {
    name: "Marc Amoussou",
    role: "Data Analyst",
    missions: "Missions validées : 4/8",
    progress: 50,
    status: "Présent",
    statusTone: "bg-emerald-50 text-emerald-700",
  },
  {
    name: "Yacine Kora",
    role: "Chargée de communication",
    missions: "Missions validées : 8/8",
    progress: 100,
    status: "Évaluation",
    statusTone: "bg-gold/10 text-gold-dark",
  },
];

function CompanyDashboardMockup() {
  return (
    <WindowChrome url="app.stagetrack.bj/entreprise/stagiaires">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[13px] font-bold text-ink sm:text-sm">Suivi des stagiaires</p>
          <p className="text-[10px] text-slate-400 sm:text-[11px]">KKiaPay — Espace tuteur</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm">
          <IconCirclePlus size={12} /> Nouveau stagiaire
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 sm:px-5">
        {companyStats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200/70 bg-white p-2.5 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-md", stat.tone)}>
                <stat.icon size={11} />
              </span>
              <p className="hidden truncate text-[9px] font-medium text-slate-400 sm:block">
                {stat.label}
              </p>
            </div>
            <p className="mt-1.5 text-base font-bold text-ink sm:text-lg">{stat.value}</p>
            <p className="truncate text-[9px] text-slate-400">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 px-4 py-3 sm:px-5">
        {companyInterns.map((intern) => (
          <div
            key={intern.name}
            className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-white p-2.5 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="flex flex-1 items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand">
                {intern.name.split(" ").map((p) => p[0]).join("")}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-ink">{intern.name}</p>
                <p className="truncate text-[9px] text-slate-400">{intern.role}</p>
              </div>
            </div>
            <div className="w-full sm:w-40">
              <p className="mb-1 text-[8.5px] font-medium text-slate-400">{intern.missions}</p>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full",
                    intern.progress === 100 ? "bg-gold" : "bg-brand"
                  )}
                  style={{ width: `${intern.progress}%` }}
                />
              </div>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-full px-2 py-1 text-[9px] font-bold",
                intern.statusTone
              )}
            >
              {intern.status}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 sm:px-5">
        <IconFileText size={13} className="shrink-0 text-brand" />
        <p className="text-[10px] font-medium text-slate-500 sm:text-[11px]">
          Bilan d&apos;évaluation de <span className="font-bold text-brand">Yacine K.</span> prêt à être signé.
        </p>
      </div>
    </WindowChrome>
  );
}

/* ---------- Commutateur : Vue Étudiant / Vue Entreprise ---------- */

export function HeroMockup() {
  const [view, setView] = useState<MockupView>("etudiant");

  const tabs: { id: MockupView; label: string; icon: React.ElementType }[] = [
    { id: "etudiant", label: "Vue Étudiant", icon: IconSchool },
    { id: "entreprise", label: "Vue Entreprise", icon: IconBuildingSkyscraper },
  ];

  return (
    <div className="relative">
      {/* Halo décoratif derrière la maquette */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-brand/10 via-transparent to-gold/20 blur-2xl"
      />

      {/* Commutateur */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 p-1 shadow-md shadow-brand/5 backdrop-blur">
          {tabs.map((tab) => {
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                aria-pressed={active}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-200 sm:px-5 sm:text-[13px]",
                  active ? "text-white" : "text-slate-500 hover:text-brand"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mockup-switch-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-brand shadow-md shadow-brand/30"
                  />
                )}
                <tab.icon size={15} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Maquette */}
      <div className="relative min-h-[440px] sm:min-h-[420px]">
        {/* Badges flottants (ancrés à la fenêtre) */}
        <motion.div
          aria-hidden
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-3 -top-5 z-10 hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-xl shadow-brand/10 md:flex"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10 text-gold-dark">
            <IconCheck size={14} />
          </span>
          <div>
            <p className="text-[11px] font-bold text-ink">Conventions signées</p>
            <p className="text-[9.5px] text-slate-400">électroniquement, en 1 clic</p>
          </div>
        </motion.div>
        <motion.div
          aria-hidden
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          className="absolute -left-3 -top-5 z-10 hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-xl shadow-brand/10 md:flex"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <IconUsers size={14} />
          </span>
          <div>
            <p className="text-[11px] font-bold text-ink">+15 000 étudiants</p>
            <p className="text-[9.5px] text-slate-400">accompagnés chaque année</p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.985 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === "etudiant" ? <StudentKanbanMockup /> : <CompanyDashboardMockup />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
