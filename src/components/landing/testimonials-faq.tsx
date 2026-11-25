"use client";

import {
  IconCircleCheck,
  IconQuote,
  IconSchool,
  IconStarFilled,
} from "@tabler/icons-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_ITEMS, TESTIMONIALS } from "@/lib/stagetrack-data";
import { cn } from "@/lib/utils";
import { Reveal, SectionBadge, SectionHeading } from "./shared";

/* ---------- Témoignages ---------- */

export function Testimonials() {
  return (
    <section id="temoignages" className="scroll-mt-24 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge={<SectionBadge icon={<IconQuote size={14} />}>Ils utilisent StageTrack</SectionBadge>}
          title={
            <>
              Des histoires réelles,{" "}
              <span className="text-brand">des stages réussis</span>
            </>
          }
          subtitle="Étudiants, tuteurs et responsables pédagogiques racontent leur quotidien sur StageTrack."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 0.1} className="h-full">
              <figure className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(11,57,60,0.25)]">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold-dark">
                    <IconQuote size={19} />
                  </span>
                  <div className="flex gap-0.5" aria-label="Note 5 sur 5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <IconStarFilled key={i} size={13} className="text-gold" />
                    ))}
                  </div>
                </div>

                <blockquote className="mt-5 flex-1 text-pretty text-[14.5px] leading-relaxed text-slate-700">
                  « {testimonial.quote} »
                </blockquote>

                <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white",
                      testimonial.avatarColor
                    )}
                    aria-hidden
                  >
                    {testimonial.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{testimonial.name}</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{testimonial.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        {/* Colonne gauche */}
        <Reveal className="flex flex-col gap-5">
          <div>
            <SectionBadge icon={<IconSchool size={14} />}>Questions fréquentes</SectionBadge>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Tout ce que vous devez savoir{" "}
              <span className="text-brand">avant de vous lancer</span>
            </h2>
            <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-body">
              Gratuité, vérification des offres, gestion des stagiaires : voici les
              réponses aux questions que l&apos;on nous pose le plus souvent.
            </p>
          </div>

          <div className="mt-2 rounded-2xl border border-brand/15 bg-brand-50/70 p-6">
            <p className="text-[15px] font-bold text-ink">
              Une autre question ?
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-body">
              Notre équipe répond en général sous 24 h, du lundi au vendredi.
            </p>
            <a
              href="mailto:contact@stagetrack.bj"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4.5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/20 transition-colors hover:bg-brand-dark"
            >
              <IconCircleCheck size={16} />
              Contacter le support
            </a>
          </div>
        </Reveal>

        {/* Accordéon */}
        <Reveal delay={0.12}>
          <Accordion type="single" collapsible className="w-full space-y-3.5">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`item-${index}`}
                className="rounded-2xl border border-slate-200/80 bg-white px-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors data-[state=open]:border-brand/25 data-[state=open]:bg-brand-50/40"
              >
                <AccordionTrigger className="gap-4 py-5 text-left text-[15px] font-bold text-ink hover:no-underline hover:text-brand data-[state=open]:text-brand [&>svg]:shrink-0 [&>svg]:text-brand">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[14.5px] leading-relaxed text-body">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
