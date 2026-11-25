"use client";

/**
 * Évaluations — grille de notation interactive sur 5 points et appréciation
 * globale du tuteur, avec rédaction assistée par Groq.
 */
import { useState, useTransition } from "react";
import { IconDeviceFloppy, IconLoader2, IconSparkles, IconStar, IconStarFilled, IconUserStar } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { saveEvaluation } from "@/app/entreprise/actions";
import { formatDateFr } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface EvaluableIntern {
  id: string;
  name: string;
  matricule: string;
  university: string;
  position: string;
  status: string;
  endDate: string;
  technique: number;
  ponctualite: number;
  autonomie: number;
  espritEquipe: number;
  appreciation: string;
  finalized: boolean;
}

const CRITERIA = [
  { key: "technique", label: "Compétences techniques" },
  { key: "ponctualite", label: "Ponctualité" },
  { key: "autonomie", label: "Autonomie" },
  { key: "espritEquipe", label: "Esprit d'équipe" },
] as const;

type CriterionKey = (typeof CRITERIA)[number]["key"];

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={`Note sur 5 : ${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sur 5`}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          {n <= value ? (
            <IconStarFilled size={22} className="text-gold" />
          ) : (
            <IconStar size={22} className="text-slate-300" />
          )}
        </button>
      ))}
      <span className="ml-2 text-sm font-bold text-ink">{value}/5</span>
    </div>
  );
}

function EvaluationCard({ intern }: { intern: EvaluableIntern }) {
  const { toast } = useToast();
  const [ratings, setRatings] = useState<Record<CriterionKey, number>>({
    technique: intern.technique,
    ponctualite: intern.ponctualite,
    autonomie: intern.autonomie,
    espritEquipe: intern.espritEquipe,
  });
  const [appreciation, setAppreciation] = useState(intern.appreciation);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const average = Math.round(
    ((ratings.technique + ratings.ponctualite + ratings.autonomie + ratings.espritEquipe) / 4) * 10,
  ) / 10;

  const draftWithAi = async () => {
    setAiLoading(true);
    setAiNote(null);
    try {
      const res = await fetch("/api/entreprise/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "appreciation",
          payload: {
            internName: intern.name,
            position: intern.position,
            university: intern.university,
            technique: ratings.technique,
            ponctualite: ratings.ponctualite,
            autonomie: ratings.autonomie,
            espritEquipe: ratings.espritEquipe,
          },
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; appreciation?: string; fallback?: boolean; model?: string };
      if (!res.ok || !data.ok || !data.appreciation) {
        toast({ title: "Rédaction IA impossible", description: data.error ?? "Erreur du service IA.", variant: "destructive" });
        return;
      }
      setAppreciation(data.appreciation);
      setAiNote(data.fallback ? "Texte rédigé en mode dégradé local (GROQ_API_KEY absente) — relisez et personnalisez." : `Pré-rempli par ${data.model} — relisez avant validation officielle.`);
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible de contacter l'API IA.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const save = (finalized: boolean) => {
    startTransition(async () => {
      const result = await saveEvaluation({
        internId: intern.id,
        technique: ratings.technique,
        ponctualite: ratings.ponctualite,
        autonomie: ratings.autonomie,
        espritEquipe: ratings.espritEquipe,
        appreciation,
        finalized,
      });
      if (result.ok) {
        toast({
          title: finalized ? "Évaluation finalisée" : "Évaluation enregistrée",
          description: finalized
            ? `L'évaluation de ${intern.name} est officialisée.`
            : `Le brouillon d'évaluation de ${intern.name} est sauvegardé.`,
        });
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <Card className={cn("rounded-xl bg-white", intern.finalized ? "border-emerald-700/30" : "border-slate-200/80")}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-bold text-ink">{intern.name}</p>
            <p className="text-xs text-body">
              {intern.position} · {intern.university}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {intern.matricule} · fin du stage : {formatDateFr(intern.endDate)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {intern.status === "TERMINE" ? (
              <Badge variant="outline" className="border-slate-300 bg-slate-100 text-[10px] font-bold text-slate-600">
                Stage terminé
              </Badge>
            ) : (
              <Badge variant="outline" className="border-brand/25 bg-brand-50 text-[10px] font-bold text-brand">
                En cours
              </Badge>
            )}
            {intern.finalized ? (
              <Badge variant="outline" className="border-emerald-700/30 bg-emerald-700/10 text-[10px] font-bold text-emerald-800">
                Évaluation finalisée
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gold/40 bg-gold-50 text-[10px] font-bold text-gold-dark">
                Brouillon
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CRITERIA.map((criterion) => (
            <div key={criterion.key} className="rounded-xl border border-slate-200/80 px-3.5 py-3">
              <p className="text-xs font-semibold text-ink">{criterion.label}</p>
              <div className="mt-1.5">
                <StarRating
                  value={ratings[criterion.key]}
                  onChange={(v) => setRatings((prev) => ({ ...prev, [criterion.key]: v }))}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor={`appr-${intern.id}`}>
              Appréciation globale du tuteur
            </Label>
            <span className="text-xs font-bold text-brand">Moyenne générale : {average}/5</span>
          </div>
          <Textarea
            id={`appr-${intern.id}`}
            value={appreciation}
            onChange={(e) => setAppreciation(e.target.value)}
            rows={4}
            placeholder="Appréciation officielle figurant dans le dossier de stage…"
            className="mt-1.5 text-sm"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              type="button"
              onClick={() => void draftWithAi()}
              disabled={aiLoading}
              className="h-8 gap-1.5 rounded-lg bg-gold px-3 text-xs font-bold text-brand hover:bg-gold-dark"
            >
              {aiLoading ? <IconLoader2 size={13} className="animate-spin" /> : <IconSparkles size={13} />}
              Rédiger l&apos;appréciation officielle (IA)
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => save(false)}
              disabled={pending}
              className="h-8 gap-1.5 rounded-lg text-xs"
            >
              <IconDeviceFloppy size={14} />
              Enregistrer le brouillon
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={() => save(true)}
              disabled={pending || appreciation.trim().length < 30}
              className="h-8 gap-1.5 rounded-lg bg-brand text-xs hover:bg-brand-dark"
            >
              <IconUserStar size={14} />
              Finaliser l&apos;évaluation
            </Button>
          </div>
          {aiNote ? <p className="mt-2 text-[11px] text-gold-dark">{aiNote}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function EvaluationsClient({ interns }: { interns: EvaluableIntern[] }) {
  const [filter, setFilter] = useState<"TERMINE" | "ACTIF" | "TOUS">("TOUS");
  const filtered = filter === "TOUS" ? interns : interns.filter((i) => i.status === filter);
  const finalizedCount = interns.filter((i) => i.finalized).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Évaluations de fin de stage</h1>
          <p className="mt-1 text-sm text-body">
            {finalizedCount} évaluation(s) finalisée(s) sur {interns.length} stagiaire(s) — grille de notation sur 5 points.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white p-1">
          {(
            [
              { key: "TOUS", label: "Tous" },
              { key: "TERMINE", label: "Terminés" },
              { key: "ACTIF", label: "En poste" },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant="ghost"
              onClick={() => setFilter(tab.key)}
              className={cn("h-7 px-3 text-xs", filter === tab.key ? "bg-brand-50 text-brand hover:bg-brand-50" : "text-body")}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-white">
            <CardContent className="py-12 text-center text-sm text-body">Aucun stagiaire dans cette catégorie.</CardContent>
          </Card>
        ) : (
          filtered.map((intern) => <EvaluationCard key={intern.id} intern={intern} />)
        )}
      </div>
    </div>
  );
}
