"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  IconAdjustmentsHorizontal,
  IconArrowRight,
  IconBookmark,
  IconBookmarkFilled,
  IconBriefcase,
  IconClock,
  IconCheck,
  IconMapPin,
  IconRotate,
  IconSearch,
  IconSearchOff,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  CITIES,
  COMPANIES,
  OFFERS,
  SECTORS,
  type InternshipOffer,
} from "@/lib/stagetrack-data";
import { cn } from "@/lib/utils";
import { Reveal, SectionBadge, SectionHeading } from "./shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ---------- Carte d'offre ---------- */

function OfferCard({ offer, index }: { offer: InternshipOffer; index: number }) {
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-[0_16px_40px_-16px_rgba(11,57,60,0.25)]"
    >
      {/* En-tête : logo + infos */}
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-sm",
            offer.avatarColor
          )}
          aria-hidden
        >
          {offer.initials}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-pretty text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-brand">
            {offer.title}
          </h3>
          <p className="mt-0.5 truncate text-[13px] font-medium text-slate-500">
            {offer.company}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSaved((v) => !v)}
          aria-pressed={saved}
          aria-label={saved ? `Retirer « ${offer.title} » des favoris` : `Sauvegarder « ${offer.title} »`}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
            saved
              ? "border-gold/40 bg-gold/10 text-gold-dark"
              : "border-slate-200/80 text-slate-400 hover:border-gold/40 hover:bg-gold/5 hover:text-gold-dark"
          )}
        >
          {saved ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
        </button>
      </div>

      {/* Badge secteur */}
      <div className="mt-4">
        <span className="inline-flex items-center rounded-full border border-brand/10 bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
          {offer.sector}
        </span>
      </div>

      {/* Métadonnées */}
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[13px]">
        <div className="flex items-center gap-1.5 text-slate-500">
          <IconMapPin size={15} className="shrink-0 text-brand/70" />
          <dd className="truncate font-medium">{offer.city}</dd>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <IconClock size={15} className="shrink-0 text-brand/70" />
          <dd className="font-medium">{offer.duration}</dd>
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-slate-500">
          <IconBriefcase size={15} className="shrink-0 text-brand/70" />
          <dd className="font-medium">{offer.type}</dd>
        </div>
      </dl>

      {/* Compétences */}
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {offer.skills.slice(0, 3).map((skill) => (
          <span
            key={skill}
            className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Pied de carte */}
      <div className="mt-5 flex items-center gap-2.5 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => setApplied(true)}
          disabled={applied}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200",
            applied
              ? "cursor-default bg-emerald-50 text-emerald-700"
              : "bg-brand text-white shadow-md shadow-brand/20 hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/30"
          )}
        >
          {applied ? (
            <>
              <IconCheck size={15} stroke={2.4} /> Candidature envoyée
            </>
          ) : (
            "Postuler maintenant"
          )}
        </button>
        <span className="shrink-0 text-[11px] text-slate-400">{offer.publishedLabel}</span>
      </div>
    </motion.article>
  );
}

/* ---------- Section offres ---------- */

export function OffersSection() {
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState<string>(COMPANIES[0]);
  const [sector, setSector] = useState<string>(SECTORS[0]);
  const [city, setCity] = useState<string>(CITIES[0]);

  const hasActiveFilters =
    query.trim() !== "" ||
    company !== COMPANIES[0] ||
    sector !== SECTORS[0] ||
    city !== CITIES[0];

  const resetFilters = () => {
    setQuery("");
    setCompany(COMPANIES[0]);
    setSector(SECTORS[0]);
    setCity(CITIES[0]);
  };

  const filteredOffers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OFFERS.filter((offer) => {
      const matchesQuery =
        q === "" ||
        offer.title.toLowerCase().includes(q) ||
        offer.company.toLowerCase().includes(q) ||
        offer.skills.some((skill) => skill.toLowerCase().includes(q));
      const matchesCompany = company === COMPANIES[0] || offer.company === company;
      const matchesSector = sector === SECTORS[0] || offer.sector === sector;
      const matchesCity = city === CITIES[0] || offer.city === city;
      return matchesQuery && matchesCompany && matchesSector && matchesCity;
    });
  }, [query, company, sector, city]);

  return (
    <section id="offres" className="scroll-mt-24 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge={
            <SectionBadge icon={<IconBriefcase size={14} />}>
              Offres de stage vérifiées
            </SectionBadge>
          }
          title={
            <>
              Explorez les dernières{" "}
              <span className="text-brand">offres de stage vérifiées</span>
            </>
          }
          subtitle="Filtrez par entreprise, secteur d'activité ou ville et postulez gratuitement en un clic."
        />

        {/* Barre de recherche et filtres */}
        <Reveal delay={0.1} className="mt-10">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
              {/* Recherche libre */}
              <label className="relative block">
                <span className="sr-only">Rechercher un stage par mot-clé</span>
                <IconSearch
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Titre du poste, compétence, entreprise…"
                  className="h-11 w-full rounded-xl border border-slate-200/80 bg-slate-50/60 pl-10 pr-3 text-sm text-ink placeholder:text-slate-400 transition-colors focus:border-brand/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </label>

              {/* Filtre Entreprise */}
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger
                  className="h-11 w-full rounded-xl border-slate-200/80 bg-slate-50/60 text-sm text-ink focus-visible:ring-brand/20"
                  aria-label="Filtrer par entreprise"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPANIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtre Secteur */}
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger
                  className="h-11 w-full rounded-xl border-slate-200/80 bg-slate-50/60 text-sm text-ink focus-visible:ring-brand/20"
                  aria-label="Filtrer par secteur"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtre Ville */}
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger
                  className="h-11 w-full rounded-xl border-slate-200/80 bg-slate-50/60 text-sm text-ink focus-visible:ring-brand/20"
                  aria-label="Filtrer par ville"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Réinitialisation */}
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-all duration-200",
                  hasActiveFilters
                    ? "bg-brand/5 text-brand hover:bg-brand/10"
                    : "cursor-not-allowed bg-slate-50 text-slate-300"
                )}
              >
                <IconRotate size={15} />
                Réinitialiser
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 px-1">
              <IconAdjustmentsHorizontal size={14} className="text-slate-400" />
              <p className="text-xs text-slate-500">
                <span className="font-bold text-brand">{filteredOffers.length}</span>{" "}
                offre{filteredOffers.length > 1 ? "s" : ""} correspond
                {filteredOffers.length > 1 ? "ent" : ""} à votre recherche
              </p>
            </div>
          </div>
        </Reveal>

        {/* Grille d'offres */}
        {filteredOffers.length > 0 ? (
          <motion.div layout className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredOffers.map((offer, index) => (
                <OfferCard key={offer.id} offer={offer} index={index} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/5 text-brand">
              <IconSearchOff size={26} />
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink">Aucune offre ne correspond</h3>
            <p className="mt-1.5 max-w-sm text-sm text-body">
              Essayez d&apos;élargir votre recherche : changez de mot-clé ou réinitialisez
              les filtres actifs pour voir les {OFFERS.length} offres disponibles.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/20 transition-colors hover:bg-brand-dark"
            >
              <IconRotate size={15} />
              Réinitialiser les filtres
            </button>
          </div>
        )}

        {/* Bouton voir toutes les offres */}
        <Reveal delay={0.15} className="mt-10 flex justify-center">
          <a
            href="#offres"
            className="group inline-flex items-center gap-2 rounded-xl border-2 border-brand/20 bg-white px-6 py-3 text-sm font-semibold text-brand transition-all duration-200 hover:border-brand hover:bg-brand/5"
          >
            Voir toutes les offres de stage
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
              {filteredOffers.length} affichée{filteredOffers.length > 1 ? "s" : ""}
            </span>
            <IconArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
