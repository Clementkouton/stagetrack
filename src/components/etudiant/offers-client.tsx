"use client";

/**
 * Module 2 (client) — Offres de stage : recherche + filtres, cartes avec
 * score de compatibilité IA, détail Sheet avec analyse Groq, lettre de
 * motivation générée et candidature en 1 clic.
 */
import { useEffect, useMemo, useState } from "react";
import {
  IconBriefcase,
  IconBuildingSkyscraper,
  IconCheck,
  IconCopy,
  IconFlag,
  IconLoader2,
  IconMapPin,
  IconSearch,
  IconSend,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { createApplication } from "@/app/etudiant/actions";
import { scoreTone } from "@/lib/etudiant-format";
import { formatDateShortFr } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface OfferCardItem {
  id: string;
  title: string;
  sector: string;
  city: string;
  duration: string;
  workMode: string;
  contractType: string;
  gratification: string | null;
  description: string;
  missions: string[];
  skills: string[];
  company: { name: string; city: string; website: string | null };
  score: number;
  applied: boolean;
  postedISO: string;
}

interface StudentInfo {
  fullName: string;
  schoolName: string;
  fieldOfStudy: string;
  level: string;
  skills: string[];
}

const WORK_MODES = [
  { value: "SUR_SITE", label: "Sur site" },
  { value: "HYBRIDE", label: "Hybride" },
  { value: "TELETRAVAIL", label: "Télétravail" },
];

const CONTRACT_LABELS: Record<string, string> = {
  STAGE_ACADEMIQUE: "Stage académique",
  PRE_EMBAUCHE: "Pré-embauche",
};

interface AiAnalysis {
  missing: string[];
  resume: string;
  reco: string[];
  model: string;
  fallback: boolean;
}

export function OffersClient({
  offers,
  initialQuery,
  initialOfferId,
  student,
}: {
  offers: OfferCardItem[];
  initialQuery: string;
  initialOfferId: string | null;
  student: StudentInfo;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState(initialQuery);
  const [company, setCompany] = useState<string>("all");
  const [sector, setSector] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [workMode, setWorkMode] = useState<string>("all");
  const [selected, setSelected] = useState<OfferCardItem | null>(
    initialOfferId ? offers.find((o) => o.id === initialOfferId) ?? null : null,
  );
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [letter, setLetter] = useState("");
  const [letterLoading, setLetterLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(
    () => new Set(offers.filter((o) => o.applied).map((o) => o.id)),
  );

  const companies = useMemo(() => [...new Set(offers.map((o) => o.company.name))].sort(), [offers]);
  const sectors = useMemo(() => [...new Set(offers.map((o) => o.sector))].sort(), [offers]);
  const cities = useMemo(() => [...new Set(offers.map((o) => o.city))].sort(), [offers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offers.filter((offer) => {
      if (q && ![offer.title, offer.company.name, offer.city, offer.sector, offer.skills.join(" ")].join(" ").toLowerCase().includes(q)) return false;
      if (company !== "all" && offer.company.name !== company) return false;
      if (sector !== "all" && offer.sector !== sector) return false;
      if (city !== "all" && offer.city !== city) return false;
      if (workMode !== "all" && offer.workMode !== workMode) return false;
      return true;
    });
  }, [offers, query, company, sector, city, workMode]);

  /* Ouvre automatiquement l'offre ciblée par un lien profond */
  useEffect(() => {
    if (initialOfferId) {
      const target = offers.find((o) => o.id === initialOfferId);
      if (target) setSelected(target);
    }
  }, [initialOfferId, offers]);

  const resetFilters = () => {
    setQuery("");
    setCompany("all");
    setSector("all");
    setCity("all");
    setWorkMode("all");
  };

  const openDetail = (offer: OfferCardItem) => {
    setSelected(offer);
    setAnalysis(null);
  };

  const analyzeWithAi = async (offer: OfferCardItem) => {
    setAnalysisLoading(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/etudiant/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "cv",
          payload: {
            offerTitle: offer.title,
            company: offer.company.name,
            offerSkills: offer.skills.join("\n"),
            studentSkills: student.skills,
            fieldOfStudy: student.fieldOfStudy,
            level: student.level,
            schoolName: student.schoolName,
          },
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        missing?: string[];
        resume?: string;
        reco?: string[];
        model?: string;
        fallback?: boolean;
      };
      if (!res.ok || !data.ok || !data.missing) {
        toast({ title: "Analyse IA indisponible", description: data.error ?? "Réessayez dans un instant.", variant: "destructive" });
        return;
      }
      setAnalysis({
        missing: data.missing,
        resume: data.resume ?? "",
        reco: data.reco ?? [],
        model: data.model ?? "",
        fallback: Boolean(data.fallback),
      });
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible de joindre le service IA.", variant: "destructive" });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const generateLetter = async (offer: OfferCardItem) => {
    setLetterLoading(true);
    try {
      const res = await fetch("/api/etudiant/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "lettre",
          payload: {
            company: offer.company.name,
            position: offer.title,
            city: offer.city,
            studentName: student.fullName,
            schoolName: student.schoolName,
            fieldOfStudy: student.fieldOfStudy,
            level: student.level,
            skills: student.skills,
            offerMissions: offer.missions.join("\n"),
          },
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; letter?: string; model?: string; fallback?: boolean };
      if (!res.ok || !data.ok || !data.letter) {
        toast({ title: "Génération impossible", description: data.error ?? "Réessayez dans un instant.", variant: "destructive" });
        return;
      }
      setLetter(data.letter);
      setApplyOpen(true);
      toast({
        title: data.fallback ? "Lettre générée (mode dégradé local)" : `Lettre générée avec ${data.model}`,
        description: "Relisez et personnalisez-la avant l'envoi.",
      });
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible de joindre le service IA.", variant: "destructive" });
    } finally {
      setLetterLoading(false);
    }
  };

  const openApply = (offer: OfferCardItem) => {
    setSelected(offer);
    if (!letter.trim()) {
      setLetter(
        `Madame, Monsieur,\n\nActuellement ${student.level} en ${student.fieldOfStudy} à ${student.schoolName}, je vous adresse ma candidature pour le stage « ${offer.title} » au sein de ${offer.company.name}.\n\nCompétences clés : ${student.skills.join(", ")}.\n\nJe reste disponible pour un entretien.\n\n${student.fullName}`,
      );
    }
    setApplyOpen(true);
  };

  const submitApplication = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const result = await createApplication({ offerId: selected.id, coverLetter: letter });
      if (result.ok) {
        setAppliedIds((prev) => new Set(prev).add(selected.id));
        setApplyOpen(false);
        setLetter("");
        toast({
          title: "Candidature envoyée",
          description: `Votre dossier pour « ${selected.title} » a été transmis à ${selected.company.name}.`,
        });
      } else {
        toast({ title: "Envoi impossible", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur réseau", description: "Veuillez réessayer.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filtersActive = company !== "all" || sector !== "all" || city !== "all" || workMode !== "all" || query.trim() !== "";

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">Offres de stage</h1>
        <p className="text-sm text-body">
          {filtered.length} offre{filtered.length > 1 ? "s" : ""} publiée{filtered.length > 1 ? "s" : ""} — filtrées par compatibilité avec votre profil ({student.fieldOfStudy})
        </p>
      </div>

      {/* --------------------------- Recherche & filtres --------------------------- */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2">
            <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Poste, compétence, entreprise…"
              aria-label="Rechercher une offre"
              className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:bg-white"
            />
          </div>
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-10 rounded-xl text-sm" aria-label="Filtrer par entreprise">
              <SelectValue placeholder="Entreprise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les entreprises</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-10 rounded-xl text-sm" aria-label="Filtrer par ville">
              <SelectValue placeholder="Ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger className="h-10 rounded-xl text-sm" aria-label="Filtrer par secteur">
                <SelectValue placeholder="Secteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous secteurs</SelectItem>
                {sectors.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={workMode} onValueChange={setWorkMode}>
              <SelectTrigger className="h-10 rounded-xl text-sm" aria-label="Filtrer par mode de travail">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les modes</SelectItem>
                {WORK_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filtersActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 w-fit gap-1 rounded-lg text-xs text-slate-500 hover:text-ink"
            >
              <IconX size={14} /> Réinitialiser les filtres
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* ------------------------------ Cartes ------------------------------ */}
      {filtered.length === 0 ? (
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <IconSearch size={30} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-ink">Aucune offre ne correspond à votre recherche</p>
            <p className="mt-1 text-xs text-body">Élargissez vos filtres ou revenez plus tard — de nouvelles offres arrivent chaque semaine.</p>
            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4 rounded-xl">
              Réinitialiser
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((offer) => {
            const tone = scoreTone(offer.score);
            return (
              <Card key={offer.id} className="flex flex-col border-slate-200/80 shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-body">{offer.company.name}</p>
                      <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-ink">{offer.title}</h3>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 border text-[11px] font-bold", tone.className)}>
                      {offer.score} %
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-body">
                    <span className="flex items-center gap-1"><IconMapPin size={13} /> {offer.city}</span>
                    <span className="flex items-center gap-1"><IconFlag size={13} /> {offer.duration}</span>
                    <span className="flex items-center gap-1"><IconBriefcase size={13} /> {WORK_MODES.find((m) => m.value === offer.workMode)?.label ?? offer.workMode}</span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-body">{offer.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {offer.skills.slice(0, 4).map((skill) => (
                      <Badge key={skill} variant="secondary" className="rounded-md bg-slate-100 text-[10px] text-slate-600">
                        {skill}
                      </Badge>
                    ))}
                    {offer.skills.length > 4 ? (
                      <Badge variant="secondary" className="rounded-md bg-slate-100 text-[10px] text-slate-600">
                        +{offer.skills.length - 4}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] text-slate-400">Publiée le {formatDateShortFr(offer.postedISO)}</p>
                    {offer.applied || appliedIds.has(offer.id) ? (
                      <Badge variant="outline" className="gap-1 border-brand/25 bg-brand-50 text-[11px] text-brand">
                        <IconCheck size={12} /> Postulé
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="h-8 rounded-lg border-brand/25 text-xs text-brand hover:bg-brand-50" onClick={() => openDetail(offer)}>
                        Voir le détail
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ------------------------------ Sheet détail ------------------------------ */}
      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelected(null); setAnalysis(null); } }}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
          {selected ? (
            <>
              <SheetHeader className="border-b border-slate-200/80 bg-brand px-5 py-4 text-white">
                <SheetTitle className="text-left text-base font-bold text-white">{selected.title}</SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-left text-xs text-white/75">
                  <span className="flex items-center gap-1"><IconBuildingSkyscraper size={13} /> {selected.company.name}</span>
                  <span className="flex items-center gap-1"><IconMapPin size={13} /> {selected.city}</span>
                  <span>{selected.duration} · {CONTRACT_LABELS[selected.contractType] ?? selected.contractType}</span>
                </SheetDescription>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className={cn("border text-[11px] font-bold", scoreTone(selected.score).className)}>
                    Score de compatibilité IA : {selected.score} %
                  </Badge>
                  {selected.gratification ? (
                    <Badge variant="outline" className="border-white/25 bg-white/10 text-[11px] text-white">
                      {selected.gratification}
                    </Badge>
                  ) : null}
                </div>
              </SheetHeader>

              <div className="space-y-5 px-5 py-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">À propos du stage</h4>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-body">{selected.description}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Missions</h4>
                  <ul className="mt-2 space-y-1.5">
                    {selected.missions.map((mission) => (
                      <li key={mission} className="flex items-start gap-2 text-sm leading-relaxed text-body">
                        <IconFlag size={14} className="mt-1 shrink-0 text-gold" />
                        {mission}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Compétences attendues</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="rounded-md bg-brand-50 text-[11px] text-brand">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Analyse IA du profil */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Analyse IA de votre profil</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void analyzeWithAi(selected)}
                      disabled={analysisLoading}
                      className="h-8 gap-1.5 rounded-lg border-gold/40 text-xs text-gold-dark hover:bg-gold-50"
                    >
                      {analysisLoading ? <IconLoader2 size={14} className="animate-spin" /> : <IconSparkles size={14} />}
                      Analyser avec Groq IA
                    </Button>
                  </div>
                  {analysis ? (
                    <div className="mt-3 space-y-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                      {analysis.fallback ? (
                        <Badge variant="outline" className="border-gold/40 bg-gold-50 text-[10px] text-gold-dark">
                          Mode dégradé local — ajoutez GROQ_API_KEY pour une analyse complète
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-brand/20 bg-brand-50 text-[10px] text-brand">
                          {analysis.model}
                        </Badge>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-ink">Compétences à renforcer</p>
                        <ul className="mt-1 space-y-1">
                          {analysis.missing.map((m) => (
                            <li key={m} className="text-xs text-body">• {m}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink">Résumé de CV optimisé pour cette offre</p>
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-body">{analysis.resume}</p>
                      </div>
                      {analysis.reco.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-ink">Recommandations</p>
                          <ul className="mt-1 space-y-1">
                            {analysis.reco.map((r) => (
                              <li key={r} className="text-xs text-body">• {r}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-200/80 bg-white p-4 sm:flex-row">
                <Button
                  className="h-10 flex-1 gap-1.5 rounded-xl bg-gold text-xs font-bold text-brand hover:bg-gold-dark"
                  onClick={() => void generateLetter(selected)}
                  disabled={letterLoading}
                >
                  {letterLoading ? <IconLoader2 size={15} className="animate-spin" /> : <IconSparkles size={15} />}
                  Générer ma lettre de motivation avec Groq IA
                </Button>
                {appliedIds.has(selected.id) ? (
                  <Button className="h-10 flex-1 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white" disabled>
                    <IconCheck size={15} /> Candidature envoyée
                  </Button>
                ) : (
                  <Button
                    className="h-10 flex-1 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
                    onClick={() => openApply(selected)}
                  >
                    <IconSend size={15} /> Postuler en 1 clic
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ------------------------------ Dialog candidature ------------------------------ */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-left">Postuler — {selected?.title}</DialogTitle>
            <DialogDescription className="text-left">
              Votre lettre de motivation ci-dessous sera transmise à {selected?.company.name} avec votre profil StageTrack (matricule, école, compétences).
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              rows={10}
              className="resize-none text-sm"
              aria-label="Lettre de motivation"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-2 h-7 gap-1 rounded-lg text-[11px] text-slate-400 hover:text-ink"
              onClick={() => {
                void navigator.clipboard.writeText(letter);
                toast({ title: "Lettre copiée", description: "Collez-la où vous voulez — par exemple dans votre drive." });
              }}
            >
              <IconCopy size={13} /> Copier
            </Button>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApplyOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              onClick={() => void submitApplication()}
              disabled={submitting || letter.trim().length < 30}
              className="gap-1.5 rounded-xl bg-brand text-white hover:bg-brand-dark"
            >
              {submitting ? <IconLoader2 size={15} className="animate-spin" /> : <IconSend size={15} />}
              Envoyer ma candidature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
