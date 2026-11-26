"use client";

/**
 * Étudiants rattachés (client) — recherche par nom/matricule, filtres
 * département / spécialité / niveau / statut, tableau + fiche complète (Sheet).
 */
import {
  IconBuildingSkyscraper,
  IconCalendarMonth,
  IconCircleCheck,
  IconExternalLink,
  IconFileText,
  IconIdBadge,
  IconMail,
  IconPhone,
  IconSchool,
  IconSearch,
  IconUser,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { assignThesisSupervisor } from "@/app/etablissement/actions";
import type { EtabStudentRow } from "@/lib/etablissement-data";
import { colorFor, initialsOf, formatDateFr } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";
import { useMemo, useState, useTransition } from "react";

export interface EtudiantsPayload {
  isChef: boolean;
  universityAcronym: string;
  departmentFilter: string | null;
  students: EtabStudentRow[];
  /** Maîtres de Mémoire du département (Chef uniquement) pour l'affectation. */
  supervisors: { memberId: string; fullName: string; grade: string | null; workload: number; maxWorkload: number }[];
}

const LEVELS = ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2"];
const STATUSES = [
  { value: "ACTIF", label: "En stage" },
  { value: "RECHERCHE", label: "En recherche" },
  { value: "TERMINE", label: "Terminé" },
];

function StatusBadge({ status }: { status: EtabStudentRow["stageStatus"] }) {
  if (status === "ACTIF") {
    return (
      <Badge className="gap-1 rounded-lg bg-brand px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-brand-dark">
        <IconCircleCheck size={11} /> En stage
      </Badge>
    );
  }
  if (status === "TERMINE") {
    return (
      <Badge variant="outline" className="gap-1 rounded-lg border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
        Terminé
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 rounded-lg border-gold/40 bg-gold-50 px-2 py-0.5 text-[10px] font-semibold text-gold-dark">
      En recherche
    </Badge>
  );
}

function conventionStepLabel(row: EtabStudentRow): string | null {
  if (!row.conventionState) return null;
  const s = row.conventionState;
  if (s.signedUniversity) return "Convention signée (circuit complet)";
  if (s.pedagogicalApproved) return "Visée — attente signature Direction";
  if (s.signedCompany) return "Signée étudiant + entreprise — attente visa";
  return "Circuit de signatures en cours";
}

export function EtudiantsClient({ payload }: { payload: EtudiantsPayload }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<string>("all");
  const [specialty, setSpecialty] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<EtabStudentRow | null>(null);
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const departments = useMemo(
    () => Array.from(new Set(payload.students.map((s) => s.departmentCode).filter((c): c is string => Boolean(c)))).sort(),
    [payload.students],
  );
  const specialties = useMemo(
    () => Array.from(new Set(payload.students.map((s) => s.specialty).filter((v): v is string => Boolean(v)))).sort(),
    [payload.students],
  );

  const filtered = payload.students.filter((s) => {
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!s.fullName.toLowerCase().includes(q) && !s.matricule.toLowerCase().includes(q)) return false;
    }
    if (department !== "all" && s.departmentCode !== department) return false;
    if (specialty !== "all" && s.specialty !== specialty) return false;
    if (level !== "all" && s.level !== level) return false;
    if (status !== "all" && s.stageStatus !== status) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">Étudiants rattachés</h1>
        <p className="text-sm text-body">
          {payload.students.length} étudiant(s) {payload.isChef ? `du département ${payload.departmentFilter}` : `de ${payload.universityAcronym}`} —
          cliquez sur une ligne pour la fiche complète.
        </p>
      </div>

      {/* ------------------------- Filtres ------------------------- */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom ou numéro matricule…"
              aria-label="Rechercher un étudiant"
              className="h-10 rounded-xl pl-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {payload.isChef ? (
              <Select value="dept-locked" disabled>
                <SelectTrigger className="h-9 rounded-xl text-xs" aria-label="Département verrouillé">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dept-locked">Dépt. {payload.departmentFilter}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous départements</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>Dépt. {d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Spécialité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes spécialités</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous niveaux</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-slate-400">
            {filtered.length} résultat(s) sur {payload.students.length}
          </p>
        </CardContent>
      </Card>

      {/* ------------------------- Tableau ------------------------- */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto rounded-xl">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-500">Étudiant</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Département</TableHead>
                  <TableHead className="hidden text-xs font-semibold text-slate-500 sm:table-cell">Chef assigné</TableHead>
                  <TableHead className="hidden text-xs font-semibold text-slate-500 md:table-cell">Entreprise d'accueil</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-body">
                      Aucun étudiant ne correspond à ces critères.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="cursor-pointer"
                      aria-label={`Fiche de ${s.fullName}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", colorFor(s.fullName))}>
                            {initialsOf(s.fullName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{s.fullName}</p>
                            <p className="truncate text-[11px] text-body">
                              {s.matricule} · {s.level ?? "—"} {s.specialty ? `· ${s.specialty}` : ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg border-brand/25 bg-brand-50 text-[11px] font-semibold text-brand">
                          {s.departmentCode ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-ink">{s.headName ?? "—"}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {s.companyName ? (
                          <div>
                            <p className="truncate text-xs font-semibold text-ink">{s.companyName}</p>
                            <p className="truncate text-[11px] text-body">{s.position}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-body">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge status={s.stageStatus} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------- Fiche (Sheet) ------------------------- */}
      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader className="border-b border-slate-200/80 bg-brand px-5 py-5 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white">
                    {initialsOf(selected.fullName)}
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="text-left text-base font-bold text-white">{selected.fullName}</SheetTitle>
                    <SheetDescription className="text-left text-xs text-white/70">
                      {selected.matricule} · {selected.level ?? "Niveau —"}
                    </SheetDescription>
                  </div>
                </div>
                <div className="mt-3">
                  <StatusBadge status={selected.stageStatus} />
                </div>
              </SheetHeader>

              <div className="space-y-4 px-5 py-4">
                <section>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Parcours académique</p>
                  <div className="mt-2 space-y-2 text-sm">
                    <p className="flex items-start gap-2 text-ink">
                      <IconSchool size={15} className="mt-0.5 shrink-0 text-brand" />
                      <span>
                        {payload.universityAcronym}
                        {selected.departmentName ? ` — ${selected.departmentName}` : ""}
                        {selected.specialty ? ` · ${selected.specialty}` : ""}
                      </span>
                    </p>
                    <p className="flex items-start gap-2 text-ink">
                      <IconIdBadge size={15} className="mt-0.5 shrink-0 text-brand" />
                      <span>
                        Chef de Département : <strong>{selected.headName ?? "non nommé"}</strong>
                      </span>
                    </p>
                  </div>
                </section>
                <Separator />
                <section>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Contact</p>
                  <div className="mt-2 space-y-1.5 text-sm">
                    <p className="flex items-center gap-2 text-ink"><IconMail size={14} className="shrink-0 text-slate-400" /> {selected.email}</p>
                    <p className="flex items-center gap-2 text-ink"><IconPhone size={14} className="shrink-0 text-slate-400" /> {selected.phone ?? "—"}</p>
                    {selected.cvUrl ? (
                      <a
                        href={selected.cvUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold text-brand underline-offset-2 hover:underline"
                      >
                        <IconExternalLink size={14} /> Voir le CV en ligne
                      </a>
                    ) : null}
                  </div>
                </section>
                <Separator />
                <section>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Stage</p>
                  {selected.companyName ? (
                    <div className="mt-2 space-y-1.5 text-sm">
                      <p className="flex items-center gap-2 text-ink">
                        <IconBuildingSkyscraper size={14} className="shrink-0 text-slate-400" /> {selected.companyName} — {selected.position}
                      </p>
                      {selected.startDate && selected.endDate ? (
                        <p className="flex items-center gap-2 text-ink">
                          <IconCalendarMonth size={14} className="shrink-0 text-slate-400" />
                          {formatDateFr(selected.startDate)} → {formatDateFr(selected.endDate)}
                          {selected.currentWeek ? ` (semaine ${selected.currentWeek}/${selected.totalWeeks})` : ""}
                        </p>
                      ) : null}
                      {selected.conventionRef ? (
                        <p className="flex items-start gap-2 text-xs text-body">
                          <IconFileText size={13} className="mt-0.5 shrink-0 text-slate-400" />
                          {selected.conventionRef} — {conventionStepLabel(selected)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm italic text-body">Aucun stage pour le moment — l&apos;étudiant est en recherche.</p>
                  )}
                </section>
                <Separator />
                {payload.isChef && selected.internId ? (
                  <section>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Encadrement du mémoire</p>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-ink">
                        Maître de Mémoire :{" "}
                        <strong>{selected.thesisSupervisorName ?? "non affecté"}</strong>
                      </p>
                      <Label htmlFor="assign-supervisor" className="text-xs text-body">
                        Affecter / réaffecter un encadreur académique
                      </Label>
                      <Select
                        value={selected.thesisSupervisorId ?? "none"}
                        onValueChange={(value) => {
                          const supervisorId = value === "none" ? null : value;
                          startTransition(async () => {
                            const result = await assignThesisSupervisor(selected.internId as string, supervisorId);
                            if (result.ok) {
                              const name =
                                value === "none"
                                  ? null
                                  : payload.supervisors.find((s) => s.memberId === value)?.fullName ?? null;
                              setSelected({ ...selected, thesisSupervisorId: supervisorId, thesisSupervisorName: name });
                              toast({
                                title: name ? "Maître de Mémoire affecté" : "Affectation retirée",
                                description: name
                                  ? `${name} encadre désormais le mémoire de ${selected.fullName}.`
                                  : `L'encadrement du mémoire de ${selected.fullName} est à pourvoir.`,
                              });
                            } else {
                              toast({ title: "Affectation impossible", description: result.error, variant: "destructive" });
                            }
                          });
                        }}
                        disabled={pending}
                      >
                        <SelectTrigger id="assign-supervisor" className="h-9 rounded-xl text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Non affecté —</SelectItem>
                          {payload.supervisors.map((s) => (
                            <SelectItem key={s.memberId} value={s.memberId}>
                              {s.grade ? `${s.grade} ` : ""}
                              {s.fullName} ({s.workload}/{s.maxWorkload})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {payload.supervisors.length === 0 ? (
                        <p className="text-[11px] text-gold-dark">
                          Aucun Maître de Mémoire dans votre département — créez-en depuis « Maîtres de Mémoire ».
                        </p>
                      ) : null}
                    </div>
                  </section>
                ) : null}
                {payload.isChef && selected.internId ? <Separator /> : null}
                <section>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Compétences</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.skills.length === 0 ? (
                      <p className="text-xs italic text-body">Non renseignées.</p>
                    ) : (
                      selected.skills.map((skill) => (
                        <Badge key={skill} variant="outline" className="rounded-lg border-brand/25 bg-brand-50 text-[11px] text-brand">
                          {skill}
                        </Badge>
                      ))
                    )}
                  </div>
                </section>
                <Button variant="outline" onClick={() => setSelected(null)} className="mt-2 h-9 w-full gap-1.5 rounded-xl border-slate-200/80 text-xs text-ink hover:bg-slate-50">
                  <IconUser size={14} /> Fermer la fiche
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
