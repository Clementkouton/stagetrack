"use client";

/**
 * Module 3 (client) — Mes candidatures : vue Kanban (6 colonnes de
 * statut) ou vue liste, fiche détail complète, notes personnelles
 * (locale) et génération d'email de relance par Groq IA.
 */
import { useMemo, useState } from "react";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconClipboardList,
  IconCopy,
  IconLayoutKanban,
  IconLoader2,
  IconMail,
  IconSparkles,
  IconTarget,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDateFr, formatDateTimeFr, initialsOf, colorFor } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface CandidatureItem {
  id: string;
  offerId: string | null;
  offerTitle: string;
  offerCity: string;
  offerDuration: string | null;
  offerWorkMode: string | null;
  company: string;
  status: CandidatureStatus;
  interviewAtISO: string | null;
  aiScore: number | null;
  aiSummary: string | null;
  aiQuestions: string[];
  coverLetter: string | null;
  sentISO: string;
  updatedISO: string;
}

export type CandidatureStatus =
  | "NOUVELLE"
  | "PRESELECTIONNEE"
  | "ENTRETIEN_PLANIFIE"
  | "OFFRE_ENVOYEE"
  | "ACCEPTEE"
  | "REFUSEE";

const KANBAN_COLUMNS: Array<{ status: CandidatureStatus; label: string; accent: string }> = [
  { status: "NOUVELLE", label: "Nouvelles", accent: "bg-slate-400" },
  { status: "PRESELECTIONNEE", label: "Présélectionnées", accent: "bg-gold" },
  { status: "ENTRETIEN_PLANIFIE", label: "Entretien planifié", accent: "bg-brand" },
  { status: "OFFRE_ENVOYEE", label: "Offre reçue", accent: "bg-emerald-500" },
  { status: "ACCEPTEE", label: "Acceptées", accent: "bg-emerald-600" },
  { status: "REFUSEE", label: "Refusées", accent: "bg-red-400" },
];

const STATUS_BADGES: Record<CandidatureStatus, string> = {
  NOUVELLE: "border-slate-300 bg-slate-100 text-slate-600",
  PRESELECTIONNEE: "border-gold/40 bg-gold-50 text-gold-dark",
  ENTRETIEN_PLANIFIE: "border-brand/25 bg-brand-50 text-brand",
  OFFRE_ENVOYEE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ACCEPTEE: "border-emerald-300 bg-emerald-100 text-emerald-800",
  REFUSEE: "border-red-200 bg-red-50 text-red-600",
};

interface RelanceEmail {
  subject: string;
  body: string;
  model: string;
  fallback: boolean;
}

export function CandidaturesClient({ items, studentName }: { items: CandidatureItem[]; studentName: string }) {
  const { toast } = useToast();
  const [kanbanView, setKanbanView] = useState(true);
  const [selected, setSelected] = useState<CandidatureItem | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [relance, setRelance] = useState<RelanceEmail | null>(null);
  const [relanceLoading, setRelanceLoading] = useState(false);

  const loadNote = (id: string) => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(`stagetrack-note-${id}`) ?? "";
  };

  const openDetail = (item: CandidatureItem) => {
    setSelected(item);
    setRelance(null);
    setNotes((prev) => ({ ...prev, [item.id]: loadNote(item.id) }));
  };

  const saveNote = (id: string, value: string) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
    if (typeof window !== "undefined") window.localStorage.setItem(`stagetrack-note-${id}`, value);
  };

  const daysSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));

  const generateRelance = async (item: CandidatureItem) => {
    setRelanceLoading(true);
    setRelance(null);
    try {
      const res = await fetch("/api/etudiant/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "relance",
          payload: {
            company: item.company,
            position: item.offerTitle,
            statusLabel: KANBAN_COLUMNS.find((c) => c.status === item.status)?.label ?? "Nouvelle",
            daysSince: daysSince(item.sentISO),
            studentName,
          },
        }),
      });
      const data = (await res.json()) as {
        ok: boolean; error?: string; subject?: string; body?: string; model?: string; fallback?: boolean;
      };
      if (!res.ok || !data.ok || !data.body) {
        toast({ title: "Génération impossible", description: data.error ?? "Réessayez dans un instant.", variant: "destructive" });
        return;
      }
      setRelance({ subject: data.subject ?? "", body: data.body, model: data.model ?? "", fallback: Boolean(data.fallback) });
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible de joindre le service IA.", variant: "destructive" });
    } finally {
      setRelanceLoading(false);
    }
  };

  const stats = useMemo(() => {
    const entretiens = items.filter((i) => i.status === "ENTRETIEN_PLANIFIE" || i.status === "OFFRE_ENVOYEE").length;
    const acceptees = items.filter((i) => i.status === "ACCEPTEE").length;
    const enCours = items.filter((i) => i.status !== "ACCEPTEE" && i.status !== "REFUSEE").length;
    return { total: items.length, entretiens, acceptees, enCours };
  }, [items]);

  const copyEmail = async () => {
    if (!relance) return;
    void navigator.clipboard.writeText(`${relance.subject}\n\n${relance.body}`);
    toast({ title: "Email copié", description: "Collez-le dans votre messagerie habituelle." });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Mes candidatures</h1>
          <p className="text-sm text-body">
            {stats.total} envoyée{stats.total > 1 ? "s" : ""} · {stats.enCours} en cours · {stats.entretiens} entretien{stats.entretiens > 1 ? "s" : ""} · {stats.acceptees} acceptée{stats.acceptees > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm">
          {kanbanView ? (
            <>
              <IconLayoutKanban size={16} className="text-brand" />
              <Label htmlFor="view-switch" className="cursor-pointer text-xs font-medium text-body">Vue Kanban</Label>
            </>
          ) : (
            <>
              <IconClipboardList size={16} className="text-brand" />
              <Label htmlFor="view-switch" className="cursor-pointer text-xs font-medium text-body">Vue Liste</Label>
            </>
          )}
          <Switch id="view-switch" checked={kanbanView} onCheckedChange={setKanbanView} aria-label="Basculer entre vue Kanban et vue liste" />
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <IconTarget size={30} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-ink">Aucune candidature pour le moment</p>
            <p className="mt-1 text-xs text-body">Explorez les offres et postulez — votre score de compatibilité IA vous guide.</p>
          </CardContent>
        </Card>
      ) : kanbanView ? (
        /* ------------------------------ Kanban ------------------------------ */
        <div className="w-full overflow-x-auto pb-2">
          <div className="grid min-w-[900px] grid-cols-6 gap-3">
            {KANBAN_COLUMNS.map((column) => {
              const columnItems = items.filter((i) => i.status === column.status);
              return (
                <div key={column.status} className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-center justify-between gap-1 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 shadow-sm">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", column.accent)} />
                      <span className="truncate text-xs font-bold text-ink">{column.label}</span>
                    </span>
                    <span className="rounded-md bg-slate-100 px-1.5 text-[11px] font-bold text-slate-500">{columnItems.length}</span>
                  </div>
                  <div className="space-y-2">
                    {columnItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                        Vide
                      </div>
                    ) : (
                      columnItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openDetail(item)}
                          className="w-full rounded-xl border border-slate-200/80 bg-white p-3 text-left shadow-sm transition-all hover:border-brand/40 hover:shadow-md"
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white", colorFor(item.company))}>
                              {initialsOf(item.company)}
                            </span>
                            <p className="min-w-0 flex-1 truncate text-xs font-bold text-ink">{item.company}</p>
                            {item.aiScore !== null ? (
                              <span className="shrink-0 rounded-md bg-brand-50 px-1.5 text-[10px] font-bold text-brand">{item.aiScore}</span>
                            ) : null}
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-body">{item.offerTitle}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{daysSince(item.sentISO)} j · {formatDateFr(item.sentISO)}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ------------------------------ Liste ------------------------------ */
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="divide-y divide-slate-100 p-0">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openDetail(item)}
                className="flex w-full flex-col gap-2 p-4 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white", colorFor(item.company))}>
                    {initialsOf(item.company)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{item.offerTitle}</p>
                    <p className="truncate text-xs text-body">{item.company} · {item.offerCity} · envoyée le {formatDateFr(item.sentISO)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.interviewAtISO ? (
                    <Badge variant="outline" className="gap-1 border-brand/25 bg-brand-50 text-[10px] text-brand">
                      <IconCalendarEvent size={11} /> {formatDateTimeFr(item.interviewAtISO)}
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_BADGES[item.status])}>
                    {KANBAN_COLUMNS.find((c) => c.status === item.status)?.label}
                  </Badge>
                  <IconArrowRight size={14} className="text-slate-300" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------ Fiche détail ------------------------------ */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-left">{selected.offerTitle}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-left">
                  <span className="font-semibold text-body">{selected.company}</span>
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_BADGES[selected.status])}>
                    {KANBAN_COLUMNS.find((c) => c.status === selected.status)?.label}
                  </Badge>
                  {selected.aiScore !== null ? (
                    <Badge variant="outline" className="border-brand/25 bg-brand-50 text-[10px] text-brand">
                      Analyse IA : {selected.aiScore}/100
                    </Badge>
                  ) : null}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Envoyée le</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{formatDateFr(selected.sentISO)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Entretien</p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {selected.interviewAtISO ? formatDateTimeFr(selected.interviewAtISO) : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Dernier mouvement</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{formatDateFr(selected.updatedISO)}</p>
                  </div>
                </div>

                {selected.aiSummary ? (
                  <div className="rounded-xl border border-slate-200/80 bg-brand-50/60 p-3">
                    <p className="text-xs font-bold text-brand">Retour du recruteur (analyse IA)</p>
                    <p className="mt-1 text-xs leading-relaxed text-body">{selected.aiSummary}</p>
                  </div>
                ) : null}

                {selected.aiQuestions.length > 0 ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Questions probables en entretien</p>
                    <ul className="mt-1.5 space-y-1">
                      {selected.aiQuestions.map((q) => (
                        <li key={q} className="text-xs leading-relaxed text-body">• {q}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <Separator />

                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Notes personnelles</p>
                    <span className="text-[10px] text-slate-400">Enregistrées sur cet appareil</span>
                  </div>
                  <Textarea
                    value={notes[selected.id] ?? ""}
                    onChange={(e) => saveNote(selected.id, e.target.value)}
                    placeholder="Ex. : relancé(e) le 12/11, contact RH très réactif, préparer la démo React…"
                    rows={3}
                    className="mt-2 resize-none text-sm"
                    aria-label="Notes personnelles sur cette candidature"
                  />
                </div>

                {/* Relance IA */}
                <div className="rounded-xl border border-gold/30 bg-gold-50/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <IconMail size={16} className="text-gold-dark" />
                      <p className="text-xs font-bold text-gold-dark">Email de relance ({daysSince(selected.sentISO)} jours sans réponse)</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => void generateRelance(selected)}
                      disabled={relanceLoading}
                      className="h-8 gap-1.5 rounded-lg bg-gold text-[11px] font-bold text-brand hover:bg-gold-dark"
                    >
                      {relanceLoading ? <IconLoader2 size={13} className="animate-spin" /> : <IconSparkles size={13} />}
                      Générer avec Groq IA
                    </Button>
                  </div>
                  {relance ? (
                    <div className="mt-3 rounded-lg border border-gold/25 bg-white p-3">
                      {relance.fallback ? (
                        <Badge variant="outline" className="mb-2 border-gold/40 bg-gold-50 text-[10px] text-gold-dark">
                          Mode dégradé local
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="mb-2 border-brand/20 bg-brand-50 text-[10px] text-brand">
                          {relance.model}
                        </Badge>
                      )}
                      <p className="text-xs font-bold text-ink">{relance.subject}</p>
                      <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-body">{relance.body}</p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => void copyEmail()} className="h-7 gap-1 rounded-md text-[11px]">
                          <IconCopy size={12} /> Copier
                        </Button>
                        <a
                          href={`mailto:?subject=${encodeURIComponent(relance.subject)}&body=${encodeURIComponent(relance.body)}`}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[11px] font-medium text-ink transition-colors hover:bg-slate-50"
                        >
                          <IconMail size={12} /> Ouvrir dans ma messagerie
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>

                {selected.coverLetter ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ma lettre de motivation envoyée</p>
                    <ScrollArea className="mt-1.5 max-h-40 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                      <p className="whitespace-pre-line text-xs leading-relaxed text-body">{selected.coverLetter}</p>
                      <ScrollBar orientation="vertical" />
                    </ScrollArea>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
