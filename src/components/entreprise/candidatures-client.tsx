"use client";

/**
 * Candidatures & Pipeline ATS — Vue Kanban / Vue Liste, Drawer candidat avec
 * analyse IA (score + points forts + questions d'entretien), planification d'entretien
 * et conversion en stagiaire actif.
 */
import { useMemo, useState, useTransition } from "react";
import {
  IconCalendarEvent,
  IconCheck,
  IconClipboardList,
  IconIdBadge2,
  IconLayoutKanban,
  IconLoader2,
  IconMail,
  IconMapPin,
  IconSchool,
  IconSparkles,
  IconUserCircle,
  IconUserPlus,
  IconX,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  convertCandidatureToIntern,
  moveCandidature,
  saveCandidatureAnalysis,
  scheduleInterview,
  type CandidatureStatus,
} from "@/app/entreprise/actions";
import { colorFor, formatDateFr, formatDateShortFr, initialsOf } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface CandidatureRow {
  id: string;
  studentName: string;
  matricule: string;
  university: string;
  email: string;
  phone: string | null;
  offerId: string | null;
  offerTitle: string;
  cvSummary: string;
  coverLetter: string | null;
  status: CandidatureStatus;
  interviewAt: string | null;
  aiScore: number | null;
  aiSummary: string[];
  aiQuestions: string[];
  createdAt: string;
}

export interface MiniOffer {
  id: string;
  title: string;
}

export interface TutorOption {
  id: string;
  name: string;
  role: string;
}

const STATUS_ORDER: Array<{ key: CandidatureStatus; label: string; accent: string }> = [
  { key: "NOUVELLE", label: "Nouvelles", accent: "border-t-brand" },
  { key: "PRESELECTIONNEE", label: "Présélectionnées", accent: "border-t-teal-700" },
  { key: "ENTRETIEN_PLANIFIE", label: "Entretien planifié", accent: "border-t-gold" },
  { key: "OFFRE_ENVOYEE", label: "Offre envoyée", accent: "border-t-amber-600" },
  { key: "ACCEPTEE", label: "Acceptées", accent: "border-t-emerald-700" },
];

const STATUS_LABEL: Record<CandidatureStatus, string> = {
  NOUVELLE: "Nouvelle",
  PRESELECTIONNEE: "Présélectionnée",
  ENTRETIEN_PLANIFIE: "Entretien planifié",
  OFFRE_ENVOYEE: "Offre envoyée",
  ACCEPTEE: "Acceptée",
  REFUSEE: "Refusée",
};

const daysSince = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
};

function StatusBadge({ status }: { status: CandidatureStatus }) {
  const cls =
    status === "ACCEPTEE"
      ? "border-emerald-700/30 bg-emerald-700/10 text-emerald-800"
      : status === "REFUSEE"
        ? "border-red-300 bg-red-50 text-red-700"
        : status === "ENTRETIEN_PLANIFIE"
          ? "border-gold/40 bg-gold-50 text-gold-dark"
          : status === "OFFRE_ENVOYEE"
            ? "border-amber-500/40 bg-amber-100 text-amber-800"
            : status === "PRESELECTIONNEE"
              ? "border-teal-700/30 bg-teal-700/10 text-teal-800"
              : "border-brand/25 bg-brand-50 text-brand";
  return (
    <Badge variant="outline" className={cn("text-[11px] font-bold", cls)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function AiAnalysisSection({
  candidate,
  onAnalyzed,
}: {
  candidate: CandidatureRow;
  onAnalyzed: (result: { score: number; summary: string[]; questions: string[]; fallback?: boolean; model?: string }) => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    setFallbackNote(null);
    try {
      const res = await fetch("/api/entreprise/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "candidat",
          payload: {
            studentName: candidate.studentName,
            position: candidate.offerTitle,
            university: candidate.university,
            matricule: candidate.matricule,
            cvSummary: candidate.cvSummary,
            coverLetter: candidate.coverLetter,
          },
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        score?: number;
        summary?: string;
        questions?: string;
        lines?: { summary: string[]; questions: string[] };
        fallback?: boolean;
        model?: string;
      };
      if (!res.ok || !data.ok) {
        toast({ title: "Analyse IA impossible", description: data.error ?? "Erreur du service IA.", variant: "destructive" });
        return;
      }
      onAnalyzed({
        score: data.score ?? 75,
        summary: data.lines?.summary ?? [],
        questions: data.lines?.questions ?? [],
        fallback: data.fallback,
        model: data.model,
      });
      if (data.fallback) setFallbackNote("Analyse générée en mode dégradé local (GROQ_API_KEY absente).");
      void saveCandidatureAnalysis(candidate.id, {
        score: data.score ?? 75,
        summary: (data.lines?.summary ?? []).join("\n"),
        questions: data.lines?.questions ?? [],
      });
      toast({ title: "Analyse terminée", description: `Score de compatibilité : ${data.score ?? 75}/100.` });
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible de contacter l'API IA.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (candidate.aiScore !== null && candidate.aiSummary) {
    return (
      <div className="space-y-3 rounded-xl border border-brand/20 bg-brand-50/60 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Analyse IA — compatibilité</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-brand">{candidate.aiScore}</span>
            <span className="text-xs text-body">/100</span>
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand/10">
          <div className="h-full rounded-full bg-brand" style={{ width: `${candidate.aiScore}%` }} />
        </div>
        <ul className="space-y-1.5">
          {candidate.aiSummary.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-body">
              <IconCheck size={14} className="mt-0.5 shrink-0 text-emerald-700" />
              {point}
            </li>
          ))}
        </ul>
        {candidate.aiQuestions.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand">3 questions d&apos;entretien ciblées</p>
            <ol className="space-y-1.5">
              {candidate.aiQuestions.map((q, i) => (
                <li key={i} className="rounded-lg bg-white px-3 py-2 text-sm text-body shadow-sm">
                  <span className="mr-1.5 font-bold text-gold-dark">Q{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {fallbackNote ? <p className="text-[11px] text-gold-dark">{fallbackNote}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-brand/30 bg-brand-50/40 p-4 text-center">
      <p className="text-sm text-body">Analysez ce profil avec l&apos;IA : score de compatibilité, points forts et questions d&apos;entretien ciblées.</p>
      <Button
        type="button"
        onClick={() => void analyze()}
        disabled={loading}
        className="mt-3 gap-1.5 rounded-xl bg-gold px-4 text-xs font-bold text-brand hover:bg-gold-dark"
      >
        {loading ? <IconLoader2 size={15} className="animate-spin" /> : <IconSparkles size={15} />}
        {loading ? "Analyse en cours…" : "Analyser le profil (IA)"}
      </Button>
    </div>
  );
}

export function CandidaturesClient({
  candidatures,
  offers,
  tutors,
}: {
  candidatures: CandidatureRow[];
  offers: MiniOffer[];
  tutors: TutorOption[];
}) {
  const { toast } = useToast();
  const [view, setView] = useState<"kanban" | "liste">("kanban");
  const [offerFilter, setOfferFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(
    () => (offerFilter === "all" ? candidatures : candidatures.filter((c) => c.offerId === offerFilter)),
    [candidatures, offerFilter],
  );

  const selected = candidatures.find((c) => c.id === selectedId) ?? null;

  const changeStatus = (c: CandidatureRow, status: CandidatureStatus) => {
    if (c.status === status) return;
    startTransition(async () => {
      const result = await moveCandidature(c.id, status);
      if (result.ok) {
        toast({ title: "Candidature mise à jour", description: `${c.studentName} → ${STATUS_LABEL[status]}.` });
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    });
  };

  const dropOn = (status: CandidatureStatus) => {
    setDragOver(null);
    const c = candidatures.find((x) => x.id === dragId);
    setDragId(null);
    if (c) changeStatus(c, status);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Candidatures &amp; Pipeline ATS</h1>
          <p className="mt-1 text-sm text-body">{filtered.length} candidature(s) — faites glisser les cartes ou utilisez la fiche candidat.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={offerFilter} onValueChange={setOfferFilter}>
            <SelectTrigger className="h-9 w-full text-xs sm:w-56">
              <SelectValue placeholder="Filtrer par offre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les offres</SelectItem>
              {offers.map((o) => (
                <SelectItem key={o.id} value={o.id} className="text-xs">
                  {o.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white p-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setView("kanban")}
              className={cn("h-7 gap-1 px-2.5 text-xs", view === "kanban" ? "bg-brand-50 text-brand hover:bg-brand-50" : "text-body")}
              aria-label="Vue Kanban"
            >
              <IconLayoutKanban size={14} />
              Kanban
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setView("liste")}
              className={cn("h-7 gap-1 px-2.5 text-xs", view === "liste" ? "bg-brand-50 text-brand hover:bg-brand-50" : "text-body")}
              aria-label="Vue liste"
            >
              <IconClipboardList size={14} />
              Liste
            </Button>
          </div>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {STATUS_ORDER.map((col) => {
            const items = filtered.filter((c) => c.status === col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(col.key);
                }}
                onDragLeave={() => setDragOver((prev) => (prev === col.key ? null : prev))}
                onDrop={() => dropOn(col.key)}
                className={cn(
                  "flex flex-col rounded-xl border border-slate-200/80 bg-white transition-colors",
                  col.accent,
                  "border-t-4",
                  dragOver === col.key && "border-brand/40 bg-brand-50/40 ring-1 ring-brand/30",
                )}
              >
                <div className="flex items-center justify-between px-3.5 pt-3.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{col.label}</p>
                  <Badge variant="outline" className="border-slate-200 text-[11px] font-bold text-ink">
                    {items.length}
                  </Badge>
                </div>
                <ScrollArea className="h-[520px] px-3 py-3">
                  <div className="space-y-2.5">
                    {items.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-[11px] text-slate-400">
                        Glissez une carte ici
                      </p>
                    ) : (
                      items.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          draggable
                          onDragStart={() => setDragId(c.id)}
                          onDragEnd={() => setDragId(null)}
                          onClick={() => setSelectedId(c.id)}
                          className={cn(
                            "w-full cursor-grab rounded-xl border border-slate-200/80 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md active:cursor-grabbing",
                            dragId === c.id && "opacity-50",
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", colorFor(c.studentName))}>
                              {initialsOf(c.studentName)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink">{c.studentName}</p>
                              <p className="truncate text-[11px] text-body">{c.university}</p>
                            </div>
                            {c.aiScore !== null ? (
                              <span className="shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand">{c.aiScore}</span>
                            ) : null}
                          </div>
                          <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-body">{c.offerTitle}</p>
                          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                            <span>{c.matricule}</span>
                            <span>{daysSince(c.createdAt)} j</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="border-slate-200/80 rounded-xl bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-slate-500">Candidat</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-slate-500">Offre</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-slate-500">Université</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wide text-slate-500">Score IA</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-slate-500">Statut</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-slate-500">Reçu le</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wide text-slate-500">Fiche</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/60">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", colorFor(c.studentName))}>
                            {initialsOf(c.studentName)}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-ink">{c.studentName}</p>
                            <p className="text-[11px] text-body">{c.matricule}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-body">{c.offerTitle}</TableCell>
                      <TableCell className="text-sm text-body">{c.university}</TableCell>
                      <TableCell className="text-center text-sm font-bold text-brand">{c.aiScore ?? "—"}</TableCell>
                      <TableCell>
                        <Select value={c.status} onValueChange={(v) => changeStatus(c, v as CandidatureStatus)}>
                          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_LABEL) as CandidatureStatus[]).map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-body">{formatDateShortFr(c.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => setSelectedId(c.id)}>
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fiche candidat — Drawer latéral */}
      <Drawer direction="right" open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selected ? (
          <DrawerContent className="h-full w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
            <DrawerHeader className="border-b border-slate-200/80 bg-slate-50/80 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", colorFor(selected.studentName))}>
                    {initialsOf(selected.studentName)}
                  </span>
                  <div>
                    <DrawerTitle className="text-lg font-bold text-ink">{selected.studentName}</DrawerTitle>
                    <DrawerDescription className="text-xs">{selected.offerTitle}</DrawerDescription>
                    <div className="mt-1.5"><StatusBadge status={selected.status} /></div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-body" onClick={() => setSelectedId(null)} aria-label="Fermer la fiche">
                  <IconX size={16} />
                </Button>
              </div>
            </DrawerHeader>

            <div className="space-y-5 p-4 pb-8">
              {/* Coordonnées */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  { icon: IconIdBadge2, label: "Matricule", value: selected.matricule },
                  { icon: IconSchool, label: "Université", value: selected.university },
                  { icon: IconMail, label: "Email", value: selected.email },
                  { icon: IconMapPin, label: "Téléphone", value: selected.phone ?? "—" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200/80 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      <item.icon size={12} className="text-brand" />
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-ink">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* CV & lettre */}
              <div className="rounded-xl border border-slate-200/80 p-3.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Résumé du CV</p>
                <p className="mt-1.5 text-sm leading-relaxed text-body">{selected.cvSummary}</p>
                {selected.coverLetter ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Lettre de motivation</p>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-body">{selected.coverLetter}</p>
                  </div>
                ) : (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-xs italic text-slate-400">Aucune lettre de motivation jointe.</p>
                )}
              </div>

              {/* IA */}
              <AiAnalysisSection
                candidate={selected}
                onAnalyzed={(result) => {
                  startTransition(() => {
                    toast({ title: "Analyse enregistrée", description: `Le profil de ${selected.studentName} a été analysé (score ${result.score}).` });
                  });
                }}
              />

              {/* Actions */}
              <div className="space-y-3 rounded-xl border border-slate-200/80 p-3.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Actions recruteur</p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Planifier un entretien</Label>
                    <InterviewScheduler
                      current={selected.interviewAt}
                      onSubmit={(iso) => {
                        startTransition(async () => {
                          const result = await scheduleInterview(selected.id, iso);
                          toast(
                            result.ok
                              ? { title: "Entretien planifié", description: `Entretien de ${selected.studentName} enregistré.` }
                              : { title: "Erreur", description: result.error, variant: "destructive" },
                          );
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Statut du pipeline</Label>
                    <Select value={selected.status} onValueChange={(v) => changeStatus(selected, v as CandidatureStatus)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABEL) as CandidatureStatus[]).map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selected.interviewAt ? (
                  <p className="flex items-center gap-1.5 rounded-lg bg-gold-50 px-3 py-2 text-xs font-medium text-gold-dark">
                    <IconCalendarEvent size={14} />
                    Entretien prévu le {formatDateFr(selected.interviewAt)}
                  </p>
                ) : null}

                <ConvertDialog
                  candidate={selected}
                  tutors={tutors}
                  onConverted={(ok, msg) => {
                    toast(
                      ok
                        ? { title: "Stagiaire créé", description: msg }
                        : { title: "Conversion impossible", description: msg, variant: "destructive" },
                    );
                    if (ok) setSelectedId(null);
                  }}
                />
              </div>
            </div>
          </DrawerContent>
        ) : null}
      </Drawer>
    </div>
  );
}

function InterviewScheduler({ current, onSubmit }: { current: string | null; onSubmit: (iso: string) => void }) {
  const [value, setValue] = useState(current ? new Date(current).toISOString().slice(0, 16) : "");
  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (value) onSubmit(new Date(value).toISOString());
      }}
    >
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 text-xs"
        aria-label="Date et heure de l'entretien"
      />
      <Button type="submit" size="sm" className="h-8 w-full gap-1 rounded-lg bg-brand text-xs hover:bg-brand-dark">
        <IconCalendarEvent size={13} />
        Enregistrer
      </Button>
    </form>
  );
}

function ConvertDialog({
  candidate,
  tutors,
  onConverted,
}: {
  candidate: CandidatureRow;
  tutors: TutorOption[];
  onConverted: (ok: boolean, message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tutorId, setTutorId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [totalWeeks, setTotalWeeks] = useState<string>("12");
  const [, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await convertCandidatureToIntern({
        candidatureId: candidate.id,
        tutorId,
        startDateISO: new Date(startDate).toISOString(),
        totalWeeks: parseInt(totalWeeks, 10) || 12,
      });
      onConverted(result.ok, result.ok ? `${candidate.studentName} est désormais un stagiaire actif.` : result.error ?? "Erreur inconnue.");
      if (result.ok) setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        onClick={() => setOpen(true)}
        className="w-full gap-2 rounded-xl bg-emerald-700 text-sm font-semibold hover:bg-emerald-800"
        disabled={candidate.status === "ACCEPTEE"}
      >
        <IconUserPlus size={16} />
        Convertir en stagiaire actif
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink">Convertir {candidate.studentName}</DialogTitle>
          <DialogDescription>
            Le candidat deviendra un stagiaire actif avec sa checklist d&apos;onboarding et son suivi de stage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label>Tuteur assigné</Label>
            <Select value={tutorId} onValueChange={setTutorId}>
              <SelectTrigger><SelectValue placeholder="Choisir un tuteur" /></SelectTrigger>
              <SelectContent>
                {tutors.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.role === "ADMIN_RH" ? "(RH)" : "(Tuteur)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conv-date">Date de début du stage</Label>
            <Input id="conv-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conv-weeks">Durée (semaines)</Label>
            <Input id="conv-weeks" type="number" min={1} max={52} value={totalWeeks} onChange={(e) => setTotalWeeks(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Annuler
          </Button>
          <Button onClick={submit} disabled={!tutorId || !startDate} className="gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800">
            <IconUserCircle size={15} />
            Confirmer la conversion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
