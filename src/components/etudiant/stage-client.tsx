"use client";

/**
 * Module 5 (client) — Mon stage actif : 3 onglets (Missions avec
 * changement de statut, Présences avec pointage hebdomadaire, Journal
 * de bord avec structuration Groq IA).
 */
import { useState } from "react";
import Link from "next/link";
import {
  IconBuildingSkyscraper,
  IconCalendarCheck,
  IconCalendarEvent,
  IconCheck,
  IconClipboardList,
  IconLoader2,
  IconPencil,
  IconSparkles,
  IconUser,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { submitPresenceSheet, submitWeeklyJournal, updateTaskStatus } from "@/app/etudiant/actions";
import { formatDateFr } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface StageData {
  intern: {
    id: string;
    position: string;
    company: string;
    companyCity: string;
    sector: string;
    tutorName: string;
    tutorEmail: string | null;
    tutorRole: string | null;
    startDateISO: string;
    endDateISO: string;
    totalWeeks: number;
    currentWeek: number;
    weekLabel: string;
    onboarding: Array<{ label: string; done: boolean }>;
  };
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    week: number;
    status: "A_FAIRE" | "EN_COURS" | "VALIDE";
    aiSuggested: boolean;
  }>;
  presenceSheets: Array<{
    id: string;
    periodLabel: string;
    daysPresent: number;
    totalDays: number;
    status: "A_VALIDER" | "VALIDEE" | "REJETEE";
    submittedISO: string;
  }>;
  journals: Array<{
    id: string;
    week: number;
    content: string;
    createdISO: string;
  }>;
  convention: { reference: string; signedStudent: boolean; status: string } | null;
}

const TASK_BADGES: Record<string, string> = {
  A_FAIRE: "border-slate-300 bg-slate-100 text-slate-600",
  EN_COURS: "border-gold/40 bg-gold-50 text-gold-dark",
  VALIDE: "border-emerald-300 bg-emerald-100 text-emerald-800",
};

const PRESENCE_BADGES: Record<string, string> = {
  A_VALIDER: "border-gold/40 bg-gold-50 text-gold-dark",
  VALIDEE: "border-emerald-300 bg-emerald-100 text-emerald-800",
  REJETEE: "border-red-200 bg-red-50 text-red-600",
};

const PRESENCE_LABELS: Record<string, string> = {
  A_VALIDER: "En attente du tuteur",
  VALIDEE: "Validé par le tuteur",
  REJETEE: "Rejetée",
};

export function StageClient({ data }: { data: StageData | null }) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState(data?.tasks ?? []);
  const [sheets, setSheets] = useState(data?.presenceSheets ?? []);
  const [journals, setJournals] = useState(data?.journals ?? []);
  const [taskBusy, setTaskBusy] = useState<string | null>(null);
  const [presenceLabel, setPresenceLabel] = useState(data?.intern.weekLabel ?? "");
  const [presenceDays, setPresenceDays] = useState("5");
  const [presenceBusy, setPresenceBusy] = useState(false);
  const [journalWeek, setJournalWeek] = useState(String(data?.intern.currentWeek ?? 1));
  const [journalContent, setJournalContent] = useState("");
  const [journalBusy, setJournalBusy] = useState(false);
  const [structuring, setStructuring] = useState(false);

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <IconCalendarCheck size={30} className="text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-ink">Aucun stage actif pour le moment</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-body">
              Dès qu&apos;une de vos candidatures est acceptée et convertie en stage, l&apos;espace « Mon stage actif »
              s&apos;activera automatiquement : missions du tuteur, présences et journal de bord.
            </p>
            <Button asChild className="mt-4 h-9 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark">
              <Link href="/etudiant/offres">Explorer les offres</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { intern } = data;
  const progression = Math.round((intern.currentWeek / intern.totalWeeks) * 100);
  const onboardingDone = intern.onboarding.filter((o) => o.done).length;
  const sheetExists = sheets.some((s) => s.periodLabel === presenceLabel.trim() && presenceLabel.trim().length > 0);
  const journalExists = journals.some((j) => j.week === Number(journalWeek));

  const changeTaskStatus = async (taskId: string, status: string) => {
    setTaskBusy(taskId);
    try {
      const result = await updateTaskStatus(taskId, status as "A_FAIRE" | "EN_COURS" | "VALIDE");
      if (result.ok) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: status as typeof t.status } : t)));
        toast({ title: "Tâche mise à jour", description: "Le tuteur voit immédiatement votre avancement." });
      } else {
        toast({ title: "Mise à jour impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setTaskBusy(null);
    }
  };

  const submitPresence = async () => {
    setPresenceBusy(true);
    try {
      const result = await submitPresenceSheet({
        internId: intern.id,
        periodLabel: presenceLabel.trim(),
        daysPresent: Number(presenceDays),
      });
      if (result.ok) {
        const optimistic = {
          id: `tmp-${Date.now()}`,
          periodLabel: presenceLabel.trim(),
          daysPresent: Number(presenceDays),
          totalDays: 5,
          status: "A_VALIDER" as const,
          submittedISO: new Date().toISOString(),
        };
        setSheets((prev) => [optimistic, ...prev]);
        toast({ title: "Présence déclarée", description: "Votre feuille est en attente de validation par le tuteur." });
      } else {
        toast({ title: "Déclaration impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setPresenceBusy(false);
    }
  };

  const structureJournal = async () => {
    if (journalContent.trim().length < 10) {
      toast({ title: "Notes trop courtes", description: "Écrivez d'abord quelques notes brutes de votre semaine.", variant: "destructive" });
      return;
    }
    setStructuring(true);
    try {
      const res = await fetch("/api/etudiant/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "journal",
          payload: {
            week: Number(journalWeek),
            totalWeeks: intern.totalWeeks,
            position: intern.position,
            rawNotes: journalContent,
          },
        }),
      });
      const result = (await res.json()) as { ok: boolean; report?: string; model?: string; fallback?: boolean; error?: string };
      if (!res.ok || !result.ok || !result.report) {
        toast({ title: "Structuration impossible", description: result.error ?? "Réessayez.", variant: "destructive" });
        return;
      }
      setJournalContent(result.report);
      toast({
        title: result.fallback ? "Bilan structuré (mode dégradé local)" : `Bilan structuré avec ${result.model}`,
        description: "Relisez et ajustez avant de soumettre.",
      });
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible de joindre le service IA.", variant: "destructive" });
    } finally {
      setStructuring(false);
    }
  };

  const submitJournal = async () => {
    setJournalBusy(true);
    try {
      const result = await submitWeeklyJournal({ internId: intern.id, week: Number(journalWeek), content: journalContent });
      if (result.ok) {
        const optimistic = { id: `tmp-${Date.now()}`, week: Number(journalWeek), content: journalContent, createdISO: new Date().toISOString() };
        setJournals((prev) => [optimistic, ...prev]);
        setJournalContent("");
        toast({ title: "Journal de bord soumis", description: `Bilan de la semaine ${journalWeek} enregistré.` });
      } else {
        toast({ title: "Soumission impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setJournalBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* --------------------------- En-tête récapitulatif --------------------------- */}
      <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <div className="bg-brand px-4 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Badge variant="outline" className="mb-2 border-white/25 bg-white/10 text-[10px] text-white">
                {intern.sector}
              </Badge>
              <h1 className="text-lg font-bold sm:text-xl">{intern.position}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/80">
                <span className="flex items-center gap-1"><IconBuildingSkyscraper size={14} /> {intern.company} — {intern.companyCity}</span>
                <span className="flex items-center gap-1"><IconUser size={14} /> Tuteur : {intern.tutorName}</span>
              </div>
            </div>
            <div className="w-full max-w-xs shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gold">Semaine {intern.currentWeek} / {intern.totalWeeks}</span>
                <span className="text-white/70">{progression} %</span>
              </div>
              <Progress value={progression} className="mt-1.5 h-2 bg-white/15" aria-label={`Progression ${progression}%`} />
              <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
                <span>Début : {formatDateFr(intern.startDateISO)}</span>
                <span>Fin : {formatDateFr(intern.endDateISO)}</span>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Onboarding</p>
            <p className="mt-0.5 text-sm font-bold text-ink">{onboardingDone}/{intern.onboarding.length} complétés</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tâches validées</p>
            <p className="mt-0.5 text-sm font-bold text-ink">{tasks.filter((t) => t.status === "VALIDE").length}/{tasks.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Journaux soumis</p>
            <p className="mt-0.5 text-sm font-bold text-ink">{journals.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Convention</p>
            {data.convention ? (
              data.convention.signedStudent ? (
                <Badge variant="outline" className="mt-0.5 gap-1 border-emerald-300 bg-emerald-100 text-[10px] text-emerald-800">
                  <IconCheck size={11} /> Signée par vous
                </Badge>
              ) : (
                <Link href="/etudiant/documents" className="mt-0.5 inline-flex text-[11px] font-semibold text-gold-dark hover:underline">
                  À signer →
                </Link>
              )
            ) : (
              <p className="mt-0.5 text-sm font-bold text-ink">—</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="missions" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
          <TabsTrigger value="missions" className="gap-1.5 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-brand data-[state=active]:text-white sm:text-sm">
            <IconClipboardList size={14} /> Mes missions
          </TabsTrigger>
          <TabsTrigger value="presences" className="gap-1.5 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-brand data-[state=active]:text-white sm:text-sm">
            <IconCalendarCheck size={14} /> Présences
          </TabsTrigger>
          <TabsTrigger value="journal" className="gap-1.5 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-brand data-[state=active]:text-white sm:text-sm">
            <IconPencil size={14} /> Journal de bord
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------ Missions ------------------------------ */}
        <TabsContent value="missions" className="mt-4">
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="p-0">
              <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-bold text-ink">Tâches assignées par {intern.tutorName}</h2>
                <p className="text-xs text-body">Faites évoluer vos tâches : À faire → En cours → Validée (visée du tuteur).</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/60">
                      <TableHead className="w-16 text-xs">Sem.</TableHead>
                      <TableHead className="min-w-[220px] text-xs">Mission</TableHead>
                      <TableHead className="w-40 text-xs">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-sm text-body">
                          Aucune tâche assignée pour le moment — votre tuteur prépare vos missions.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tasks.map((task) => (
                        <TableRow key={task.id} className={cn(task.week === intern.currentWeek && "bg-gold-50/40")}>
                          <TableCell className="text-xs font-bold text-slate-500">S{task.week}</TableCell>
                          <TableCell>
                            <div className="flex items-start gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-ink">{task.title}</p>
                                {task.description ? <p className="mt-0.5 text-xs leading-snug text-body">{task.description}</p> : null}
                              </div>
                              {task.aiSuggested ? (
                                <Badge variant="outline" className="shrink-0 gap-0.5 border-gold/40 bg-gold-50 text-[9px] text-gold-dark">
                                  <IconSparkles size={9} /> IA
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("text-[10px]", TASK_BADGES[task.status])}>
                                {task.status === "A_FAIRE" ? "À faire" : task.status === "EN_COURS" ? "En cours" : "Validée"}
                              </Badge>
                              <Select value={task.status} onValueChange={(value) => void changeTaskStatus(task.id, value)} disabled={taskBusy === task.id}>
                                <SelectTrigger size="sm" className="h-8 w-28 rounded-lg text-xs" aria-label={`Changer le statut de ${task.title}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="A_FAIRE">À faire</SelectItem>
                                  <SelectItem value="EN_COURS">En cours</SelectItem>
                                  <SelectItem value="VALIDE">Validée</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ Présences ------------------------------ */}
        <TabsContent value="presences" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="border-slate-200/80 shadow-sm lg:col-span-2">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div>
                  <h2 className="text-sm font-bold text-ink">Déclarer ma semaine</h2>
                  <p className="text-xs text-body">Pointage hebdomadaire — le tuteur valide ou rejette chaque feuille.</p>
                </div>
                <div>
                  <label htmlFor="presence-label" className="text-xs font-semibold text-ink">Période</label>
                  <Input
                    id="presence-label"
                    value={presenceLabel}
                    onChange={(e) => setPresenceLabel(e.target.value)}
                    className="mt-1 h-10 rounded-xl text-sm"
                    placeholder="Semaine 7 (24 – 28 nov.)"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink">Jours présents cette semaine</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["0", "1", "2", "3", "4", "5"].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setPresenceDays(day)}
                        aria-pressed={presenceDays === day}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold transition-colors",
                          presenceDays === day
                            ? "border-brand bg-brand text-white"
                            : "border-slate-200 bg-white text-slate-500 hover:border-brand/40",
                        )}
                      >
                        {day}
                      </button>
                    ))}
                    <span className="ml-1 self-center text-[11px] text-slate-400">/ 5 jours</span>
                  </div>
                  {Number(presenceDays) < 5 ? (
                    <p className="mt-2 rounded-lg border border-gold/30 bg-gold-50 p-2 text-[11px] text-gold-dark">
                      Absence(s) à justifier auprès du tuteur ({intern.tutorEmail ?? "tuteur"}).
                    </p>
                  ) : null}
                </div>
                <Button
                  onClick={() => void submitPresence()}
                  disabled={presenceBusy || presenceLabel.trim().length < 5 || sheetExists}
                  className="h-10 w-full gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
                >
                  {presenceBusy ? <IconLoader2 size={15} className="animate-spin" /> : <IconCalendarCheck size={15} />}
                  {sheetExists ? "Feuille déjà soumise" : "Déclarer ma présence"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-sm lg:col-span-3">
              <CardContent className="p-0">
                <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                  <h2 className="text-sm font-bold text-ink">Historique des présences</h2>
                  <p className="text-xs text-body">Statuts posés par le tuteur : validé, en attente ou rejeté.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {sheets.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-body sm:px-5">Aucune feuille de présence soumise.</p>
                  ) : (
                    sheets.map((sheet) => (
                      <div key={sheet.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                            sheet.daysPresent >= 4 ? "bg-brand-50 text-brand" : sheet.daysPresent >= 2 ? "bg-gold-50 text-gold-dark" : "bg-red-50 text-red-500",
                          )}>
                            {sheet.daysPresent}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{sheet.periodLabel}</p>
                            <p className="text-xs text-body">
                              {sheet.daysPresent}/{sheet.totalDays} jours · soumis le {formatDateFr(sheet.submittedISO)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("shrink-0 text-[10px]", PRESENCE_BADGES[sheet.status])}>
                          {PRESENCE_LABELS[sheet.status]}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------ Journal ------------------------------ */}
        <TabsContent value="journal" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="border-slate-200/80 shadow-sm lg:col-span-2">
              <CardContent className="space-y-3.5 p-4 sm:p-5">
                <div>
                  <h2 className="text-sm font-bold text-ink">Bilan de la semaine</h2>
                  <p className="text-xs text-body">Rédigez vos notes brutes, puis laissez l&apos;IA structurer le bilan.</p>
                </div>
                <div>
                  <label htmlFor="journal-week" className="text-xs font-semibold text-ink">Semaine</label>
                  <Select value={journalWeek} onValueChange={setJournalWeek}>
                    <SelectTrigger id="journal-week" className="mt-1 h-10 rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: intern.totalWeeks }, (_, i) => i + 1).map((week) => (
                        <SelectItem key={week} value={String(week)}>
                          Semaine {week}{week === intern.currentWeek ? " (en cours)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="journal-content" className="text-xs font-semibold text-ink">Mes notes de la semaine</label>
                  <Textarea
                    id="journal-content"
                    value={journalContent}
                    onChange={(e) => setJournalContent(e.target.value)}
                    rows={7}
                    placeholder="Ex. : finalisé le webhook MTN, bug de doublons résolu avec clé d'idempotence, démo sprint vendredi, difficulté sur l'index SQL…"
                    className="mt-1 resize-none text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => void structureJournal()}
                    disabled={structuring}
                    className="h-9 gap-1.5 rounded-xl bg-gold text-xs font-bold text-brand hover:bg-gold-dark"
                  >
                    {structuring ? <IconLoader2 size={14} className="animate-spin" /> : <IconSparkles size={14} />}
                    Structurer mon bilan avec Groq IA
                  </Button>
                  <Button
                    onClick={() => void submitJournal()}
                    disabled={journalBusy || journalContent.trim().length < 40 || journalExists}
                    className="h-10 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
                  >
                    {journalBusy ? <IconLoader2 size={15} className="animate-spin" /> : <IconPencil size={15} />}
                    {journalExists ? `Semaine ${journalWeek} déjà soumise` : "Soumettre mon bilan"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-sm lg:col-span-3">
              <CardContent className="p-0">
                <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                  <h2 className="text-sm font-bold text-ink">Mes bilans hebdomadaires</h2>
                  <p className="text-xs text-body">Retours du tuteur : ses validations de présence et vos bilans archivés.</p>
                </div>
                <div className="max-h-[520px] space-y-3 overflow-y-auto px-4 py-3 sm:px-5">
                  {journals.length === 0 ? (
                    <p className="py-8 text-center text-sm text-body">Aucun bilan soumis — commencez par la semaine 1.</p>
                  ) : (
                    journals.map((journal) => (
                      <div key={journal.id} className="rounded-xl border border-slate-200/80 p-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-brand/25 bg-brand-50 text-[10px] font-bold text-brand">
                            Semaine {journal.week}
                          </Badge>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <IconCalendarEvent size={12} /> {formatDateFr(journal.createdISO)}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-body">{journal.content}</p>
                      </div>
                    ))
                  )}
                  {sheets.length > 0 ? (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                      <p className="text-xs font-bold text-ink">Retours du tuteur sur les présences</p>
                      <ul className="mt-1.5 space-y-1">
                        {sheets.slice(0, 4).map((sheet) => (
                          <li key={`retour-${sheet.id}`} className="flex items-center justify-between text-[11px]">
                            <span className="text-body">{sheet.periodLabel} — {sheet.daysPresent}/{sheet.totalDays} jours</span>
                            <span className={cn(
                              "font-semibold",
                              sheet.status === "VALIDEE" ? "text-emerald-700" : sheet.status === "REJETEE" ? "text-red-500" : "text-gold-dark",
                            )}>
                              {PRESENCE_LABELS[sheet.status]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
