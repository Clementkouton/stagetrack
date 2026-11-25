"use client";

import {
  IconBuildingSkyscraper,
  IconGift,
  IconLibrary,
  IconSchool,
} from "@tabler/icons-react";
import { CountUp, Reveal } from "./shared";

const STATS = [
  {
    icon: IconGift,
    value: 100,
    suffix: " %",
    label: "Gratuit & Sans frais cachés",
    sub: "Pour les étudiants, les entreprises et les écoles",
    tone: "bg-gold/10 text-gold-dark",
    ring: "ring-gold/25",
  },
  {
    icon: IconSchool,
    value: 15000,
    suffix: "",
    prefix: "+",
    label: "Étudiants accompagnés",
    sub: "De la candidature à l'attestation finale",
    tone: "bg-brand/10 text-brand",
    ring: "ring-brand/25",
  },
  {
    icon: IconBuildingSkyscraper,
    value: 2400,
    suffix: "",
    prefix: "+",
    label: "Entreprises actives",
    sub: "Qui publient et gèrent leurs stagiaires",
    tone: "bg-brand/10 text-brand",
    ring: "ring-brand/25",
  },
  {
    icon: IconLibrary,
    value: 450,
    suffix: "",
    prefix: "+",
    label: "Écoles partenaires",
    sub: "Qui suivent leurs cohortes en temps réel",
    tone: "bg-gold/10 text-gold-dark",
    ring: "ring-gold/25",
  },
];

function StatItem({
  stat,
  index,
}: {
  stat: (typeof STATS)[number] & { prefix?: string };
  index: number;
}) {
  return (
    <Reveal
      delay={index * 0.08}
      className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left"
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${stat.tone} ${stat.ring}`}
      >
        <stat.icon size={20} />
      </span>
      <p className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {"prefix" in stat && stat.prefix ? stat.prefix : ""}
        <CountUp to={stat.value} suffix={stat.suffix} />
      </p>
      <div>
        <p className="text-sm font-bold text-ink sm:text-[15px]">{stat.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-[13px]">{stat.sub}</p>
      </div>
    </Reveal>
  );
}

export function SocialProof() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-brand-50/60 px-6 py-12 sm:grid-cols-2 sm:px-10 lg:grid-cols-4 lg:gap-8">
          {STATS.map((stat, index) => (
            <StatItem key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
