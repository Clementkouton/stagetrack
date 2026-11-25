"use client";

import { motion } from "framer-motion";
import {
  IconArrowRight,
  IconBriefcase,
  IconCircleCheck,
  IconSchool,
  IconSparkles,
} from "@tabler/icons-react";
import Link from "next/link";
import { Reveal } from "./shared";

const perks = ["Sans frais cachés", "Sans carte bancaire", "Sans engagement"];

export function FinalCta() {
  return (
    <section id="cta-final" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <Reveal className="mx-auto w-full max-w-7xl">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand px-6 py-16 text-center shadow-2xl shadow-brand/30 sm:px-12 sm:py-20">
          {/* Motifs dorés décoratifs */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full border-[26px] border-gold/12" />
            <div className="absolute -bottom-28 -right-16 h-72 w-72 rounded-full border-[30px] border-gold/15" />
            <div className="absolute right-[12%] top-10 h-3 w-3 rounded-full bg-gold/50" />
            <div className="absolute left-[16%] top-16 h-2 w-2 rounded-full bg-gold/40" />
            <div className="absolute bottom-14 left-[10%] h-2.5 w-2.5 rounded-full bg-gold/35" />
            <div className="absolute right-[24%] bottom-16 h-2 w-2 rounded-full bg-gold/45" />
            <svg
              className="absolute inset-x-0 bottom-0 h-24 w-full text-gold/15"
              viewBox="0 0 1200 96"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M0 80 C 200 40, 400 90, 600 60 S 1000 30, 1200 70 L 1200 96 L 0 96 Z"
                fill="currentColor"
              />
            </svg>
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(184,160,46,0.35) 1px, transparent 0)",
                backgroundSize: "30px 30px",
                maskImage: "linear-gradient(to bottom, black 0%, transparent 70%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 70%)",
              }}
            />
          </div>

          {/* Contenu */}
          <div className="relative">
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur sm:text-[13px]"
            >
              <IconSparkles size={15} className="text-gold" />
              Inscription gratuite en moins de 2 minutes
            </motion.span>

            <h2 className="mx-auto mt-6 max-w-3xl text-balance text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.9rem]">
              Rejoignez gratuitement{" "}
              <span className="text-gold">l&apos;écosystème StageTrack</span> dès
              aujourd&apos;hui
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-white/75 sm:text-lg">
              Étudiants, entreprises et écoles : un seul espace pour chercher,
              publier et suivre chaque stage, du premier clic à l&apos;attestation finale.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              {perks.map((perk) => (
                <span
                  key={perk}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85"
                >
                  <IconCircleCheck size={14} className="text-gold" />
                  {perk}
                </span>
              ))}
            </div>

            <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/auth?role=etudiant&mode=inscription"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/20 transition-all duration-200 hover:bg-gold-dark sm:w-auto"
              >
                <IconSchool size={17} />
                Je suis étudiant
                <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/auth?role=entreprise&mode=inscription"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-white/25 bg-white/5 px-7 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:border-white/60 hover:bg-white/10 sm:w-auto"
              >
                <IconBriefcase size={17} />
                Je suis une entreprise
                <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
