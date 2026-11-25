"use client";

import { motion } from "framer-motion";
import {
  IconArrowRight,
  IconBriefcase,
  IconSearch,
  IconSparkles,
  IconStarFilled,
} from "@tabler/icons-react";
import { HeroMockup } from "./hero-mockup";

const EASE = [0.22, 1, 0.36, 1] as const;

const avatarStack = [
  { initials: "NA", color: "bg-brand" },
  { initials: "RK", color: "bg-gold" },
  { initials: "MA", color: "bg-brand-dark" },
  { initials: "YK", color: "bg-gold-dark" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-16 sm:pt-32 lg:pt-40 lg:pb-24">
      {/* Décor : halos et trame pointillée */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -left-40 top-40 h-[460px] w-[460px] rounded-full bg-brand/8 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(11,57,60,0.08) 1px, transparent 0)",
            backgroundSize: "26px 26px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 65%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:px-8">
        {/* Colonne texte */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="flex justify-center lg:justify-start"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold-dark sm:text-[13px]">
              <IconSparkles size={15} className="text-gold" />
              100 % Gratuit — La plateforme tout-en-un pour les stages
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
            className="mt-6 text-balance text-4xl font-extrabold leading-[1.12] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]"
          >
            De la{" "}
            <span className="relative inline-block text-gold">
              recherche de stage
              <svg
                aria-hidden
                viewBox="0 0 220 12"
                className="absolute -bottom-1.5 left-0 w-full text-gold/40"
                preserveAspectRatio="none"
              >
                <path
                  d="M3 9 Q 60 3 110 7 T 217 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            jusqu&apos;au{" "}
            <span className="text-brand">suivi en entreprise</span>, tout est
            centralisé.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: EASE }}
            className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-body sm:text-lg lg:mx-0"
          >
            Étudiants, décrochez et pilotez votre stage facilement. Entreprises,
            publiez vos offres et gérez vos stagiaires au quotidien depuis un
            espace dédié — <span className="font-semibold text-brand">sans aucun frais</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: EASE }}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <a
              href="#offres"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-all duration-200 hover:bg-brand-dark hover:shadow-xl hover:shadow-brand/35 sm:w-auto"
            >
              <IconSearch size={17} stroke={2.2} />
              Je cherche un stage
              <IconArrowRight
                size={16}
                stroke={2.2}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </a>
            <a
              href="#parcours-entreprise"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand/25 bg-white px-6 py-3.5 text-sm font-semibold text-brand transition-all duration-200 hover:border-brand hover:bg-brand/5 sm:w-auto"
            >
              <IconBriefcase size={17} stroke={2.2} />
              Je recrute / gère des stagiaires
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32, ease: EASE }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-4 lg:justify-start"
          >
            <div className="flex -space-x-2.5">
              {avatarStack.map((avatar) => (
                <span
                  key={avatar.initials}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-white ${avatar.color} text-[11px] font-bold text-white`}
                >
                  {avatar.initials}
                </span>
              ))}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[9.5px] font-bold text-slate-500 ring-2 ring-white">
                +15K
              </span>
            </div>
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center gap-0.5 lg:justify-start" aria-label="Note 4,9 sur 5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <IconStarFilled key={i} size={14} className="text-gold" />
                ))}
                <span className="ml-1.5 text-xs font-bold text-ink">4,9/5</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Rejoints par <span className="font-semibold text-brand">+15 000 étudiants</span> et{" "}
                <span className="font-semibold text-brand">+2 400 entreprises</span>
              </p>
            </div>
          </motion.div>
        </div>

        {/* Colonne maquette interactive */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
        >
          <HeroMockup />
        </motion.div>
      </div>
    </section>
  );
}
