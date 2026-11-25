"use client";

/**
 * Missions & Présences — 3 onglets :
 * 1. Missions & Tâches (assignation + suggestion IA Groq)
 * 2. Feuilles de présence (validation RH)
 * 3. Journaux hebdomadaires (lecture)
 */
import { useState, useTransition } from "react";
import {
  IconCalendarCheck,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
  IconChecklist,
  IconClock,
  IconLoader2,
  IconNotebook,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createTask, deleteTask, saveAiTasks, updateTaskStatus, validatePresenceSheet } from "@/app/entreprise/actions";
import { formatDateFr, formatDateShortFr } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface SuiviIntern {
  id: string;
  name: string;
  position: string;
  currentWeek: number;
  totalWeeks: number;
}

export interface TaskRow {
  id: string;
  internId: string;
  internName: string;
  title: string;
  description: string | null;
  week: number;
  status: string;
  aiSuggested: boolean;
}

export interface PresenceRow {
  id: string;
  internId: string;
  internName: string;
  position: string;
  periodLabel: string;
  daysPresent: number;
  totalDays: number;
  status: string;
  submittedAt: string;
}

export interface JournalRow {
  id: string;
  internName: string;
  position: string;
  week: number;
  content: string;
}

const TASK_STATUS: Record<string, { label: string; cls: string }> = {
  A_FAIRE: { label: "À faire", cls: "border-slate-300 bg-slate-100 text-slate-600" },
  EN_COURS: { label: "En cours", cls: "border-brand/25 bg-brand-50 text-brand" },
  VALIDE: { label: "Validé", cls: "border-emerald-700/30 bg-emerald-700/10 text-emerald-800" },
};

export function SuiviClient({
  interns,
  tasks,
  presences,
  journals,
}: {
  interns: SuiviIntern[];
  tasks: TaskRow[];
  presences: PresenceRow[];
  journals: JournalRow[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [taskDialogIntern, setTaskDialogIntern] = useState<SuiviIntern | null>(null);

  const pendingPresences = presences.filter((p) => p.status === "A_VALIDER").length;

  const suggestTasks = async (intern: SuiviIntern) => {
    if (aiLoadingId) return;
    setAiLoadingId(intern.id);
    try {
      const res = await fetch("/api/entreprise/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "missions",
          payload: {
            internName: intern.name,
            position: intern.position,
            currentWeek: intern.currentWeek,
            totalWeeks: intern.totalWeeks,
          },
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        tasks?: Array<{ title: string; description: string }>;
        fallback?: boolean;
        model?: string;
      };
      if (!res.ok || !data.ok || !data.tasks || data.tasks.length === 0) {
        toast({ title: "Suggestion IA impossible", description: data.error ?? "Aucune tâche générée.", variant: "destructive" });
        return;
      }
      startTransition(async () => {
        const result = await saveAiTasks(intern.id, intern.currentWeek, data.tasks ?? []);
        if (result.ok) {
          toast({
            title: `${data.tasks?.length ?? 0} tâche(s) ajoutée(s)`,
            description: `Suggestions IA ${data.fallback ? "(mode dégradé local)" : `(${data.model})`} enregistrées pour ${intern.name} — semaine ${intern.currentWeek}.`,
          });
        } else {
          toast({ title: "Erreur", description: result.error, variant: "destructive" });
        }
      });
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible de contacter l'API IA.", variant: "destructive" });
    } finally {
      setAiLoadingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Missions &amp; Présences</h1>
        <p className="mt-1 text-sm text-body">
          Tâches hebdomadaires, validation des feuilles de présence et journaux de bord de vos stagiaires.
        </p>
      </div>

      <Tabs defaultValue="missions" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 bg-white p-1 shadow-sm">
          <TabsTrigger value="missions" className="gap-1.5 text-xs data-[state=active]:bg-brand data-[state=active]:text-white">
            <IconChecklist size={14} />
            Missions &amp; Tâches
          </TabsTrigger>
          <TabsTrigger value="presences" className="gap-1.5 text-xs data-[state=active]:bg-brand data-[state=active]:text-white">
            <IconCalendarCheck size={14} />
            Feuilles de présence
            {pendingPresences > 0 ? (
              <Badge variant="outline" className="ml-1 border-gold/40 bg-gold-50 px-1 text-[10px] font-bold text-gold-dark">
                {pendingPresences}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="journaux" className="gap-1.5 text-xs data-[state=active]:bg-brand data-[state=active]:text-white">
            <IconNotebook size={14} />
            Journaux hebdomadaires
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Missions & Tâches ---------------- */}
        <TabsContent value="missions" className="space-y-4">
          {interns.map((intern) => {
            const internTasks = tasks.filter((t) => t.internId === intern.id);
            return (
              <Card key={intern.id} className="border-slate-200/80 rounded-xl bg-white">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-ink">{intern.name}</p>
                      <p className="text-xs text-body">
                        {intern.position} — Semaine {intern.currentWeek}/{intern.totalWeeks}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => void suggestTasks(intern)}
                        disabled={aiLoadingId === intern.id || pending}
                        className="h-8 gap-1.5 rounded-lg bg-gold px-3 text-xs font-bold text-brand hover:bg-gold-dark"
                      >
                        {aiLoadingId === intern.id ? <IconLoader2 size={13} className="animate-spin" /> : <IconSparkles size={13} />}
                        Suggérer des tâches hebdomadaires (IA)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTaskDialogIntern(intern)}
                        className="h-8 gap-1.5 rounded-lg text-xs"
                      >
                        <IconPlus size={13} />
                        Ajouter une tâche
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {internTasks.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 py-5 text-center text-xs text-body">
                        Aucune tâche pour cette semaine — utilisez la suggestion IA ou ajoutez une tâche manuellement.
                      </p>
                    ) : (
                      internTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex flex-col gap-2 rounded-xl border border-slate-200/80 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-ink">{task.title}</p>
                              <Badge variant="outline" className={cn("text-[10px] font-bold", TASK_STATUS[task.status]?.cls)}>
                                {TASK_STATUS[task.status]?.label ?? task.status}
                              </Badge>
                              {task.aiSuggested ? (
                                <Badge variant="outline" className="border-gold/40 bg-gold-50 text-[10px] font-bold text-gold-dark">
                                  IA
                                </Badge>
                              ) : null}
                            </div>
                            {task.description ? <p className="mt-0.5 text-xs text-body">{task.description}</p> : null}
                            <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                              <IconClock size={11} />
                              Semaine {task.week}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Select
                              value={task.status}
                              onValueChange={(v) => {
                                startTransition(async () => {
                                  const result = await updateTaskStatus(task.id, v as "A_FAIRE" | "EN_COURS" | "VALIDE");
                                  if (!result.ok) toast({ title: "Erreur", description: result.error, variant: "destructive" });
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A_FAIRE" className="text-xs">À faire</SelectItem>
                                <SelectItem value="EN_COURS" className="text-xs">En cours</SelectItem>
                                <SelectItem value="VALIDE" className="text-xs">Validé</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-destructive"
                              aria-label={`Supprimer la tâche ${task.title}`}
                              onClick={() => {
                                startTransition(async () => {
                                  const result = await deleteTask(task.id);
                                  if (result.ok) toast({ title: "Tâche supprimée" });
                                  else toast({ title: "Erreur", description: result.error, variant: "destructive" });
                                });
                              }}
                            >
                              <IconTrash size={14} />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ---------------- Feuilles de présence ---------------- */}
        <TabsContent value="presences">
          <Card className="border-slate-200/80 rounded-xl bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 text-left">
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Stagiaire</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Période</th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Jours présents</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Soumis le</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">Statut</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presences.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-body">
                          Aucune feuille de présence enregistrée.
                        </td>
                      </tr>
                    ) : (
                      presences.map((p) => (
                        <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-ink">{p.internName}</p>
                            <p className="text-[11px] text-body">{p.position}</p>
                          </td>
                          <td className="px-4 py-3 text-body">{p.periodLabel}</td>
                          <td className="px-4 py-3 text-center font-bold text-ink">
                            {p.daysPresent}/{p.totalDays}
                          </td>
                          <td className="px-4 py-3 text-body">{formatDateShortFr(p.submittedAt)}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold",
                                p.status === "VALIDEE"
                                  ? "border-emerald-700/30 bg-emerald-700/10 text-emerald-800"
                                  : p.status === "REJETEE"
                                    ? "border-red-300 bg-red-50 text-red-700"
                                    : "border-gold/40 bg-gold-50 text-gold-dark",
                              )}
                            >
                              {p.status === "VALIDEE" ? "Validée" : p.status === "REJETEE" ? "Rejetée" : "À valider"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {p.status === "A_VALIDER" ? (
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    startTransition(async () => {
                                      const result = await validatePresenceSheet(p.id, true);
                                      if (result.ok) toast({ title: "Feuille validée", description: `${p.internName} — ${p.periodLabel}.` });
                                      else toast({ title: "Erreur", description: result.error, variant: "destructive" });
                                    });
                                  }}
                                  className="h-8 gap-1 rounded-lg bg-emerald-700 px-2.5 text-xs hover:bg-emerald-800"
                                  disabled={pending}
                                >
                                  <IconCheck size={13} />
                                  Valider
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    startTransition(async () => {
                                      const result = await validatePresenceSheet(p.id, false);
                                      if (result.ok) toast({ title: "Feuille rejetée", description: `${p.internName} — ${p.periodLabel}.` });
                                      else toast({ title: "Erreur", description: result.error, variant: "destructive" });
                                    });
                                  }}
                                  className="h-8 gap-1 rounded-lg border-red-200 px-2.5 text-xs text-red-700 hover:bg-red-50"
                                  disabled={pending}
                                >
                                  <IconX size={13} />
                                  Rejeter
                                </Button>
                              </div>
                            ) : (
                              <p className="text-right text-[11px] text-slate-400">Traitée</p>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Journaux ---------------- */}
        <TabsContent value="journaux" className="space-y-4">
          {journals.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white">
              <CardContent className="py-12 text-center text-sm text-body">
                Aucun journal hebdomadaire soumis pour le moment.
              </CardContent>
            </Card>
          ) : (
            journals.map((j) => (
              <Card key={j.id} className="border-slate-200/80 rounded-xl bg-white">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{j.internName}</p>
                      <p className="text-xs text-body">{j.position}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 border-brand/25 bg-brand-50 text-[10px] font-bold text-brand">
                      Semaine {j.week}
                    </Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-body">
                    {j.content}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog ajout de tâche manuelle */}
      <TaskDialog
        intern={taskDialogIntern}
        onClose={() => setTaskDialogIntern(null)}
      />
    </div>
  );
}

function TaskDialog({ intern, onClose }: { intern: SuiviIntern | null; onClose: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [week, setWeek] = useState("");
  const [, startTransition] = useTransition();

  const submit = () => {
    if (!intern) return;
    startTransition(async () => {
      const result = await createTask({
        internId: intern.id,
        title,
        description,
        week: parseInt(week, 10) || intern.currentWeek,
      });
      if (result.ok) {
        toast({ title: "Tâche créée", description: `« ${title} » assignée à ${intern.name}.` });
        setTitle("");
        setDescription("");
        setWeek("");
        onClose();
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={intern !== null} onOpenChange={(open) => !open && onClose()}>
      {intern ? (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-ink">Nouvelle tâche — {intern.name}</DialogTitle>
            <DialogDescription>
              Semaine en cours : {intern.currentWeek}/{intern.totalWeeks}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Titre de la tâche</Label>
              <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Rédiger les tests du module X" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Description (optionnel)</Label>
              <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-week">Semaine</Label>
              <Input id="task-week" type="number" min={1} max={intern.totalWeeks} value={week} onChange={(e) => setWeek(e.target.value)} placeholder={String(intern.currentWeek)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-xl">Annuler</Button>
            <Button onClick={submit} disabled={title.trim().length < 3} className="gap-2 rounded-xl bg-brand hover:bg-brand-dark">
              <IconCircleCheck size={15} />
              Créer la tâche
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
