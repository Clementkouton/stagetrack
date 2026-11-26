"use client";

/**
 * Évaluations & Jury (client) — tableau des notes entreprise, filtres
 * département / niveau, export « PV Jury (CSV) », attestation de fin de
 * stage (consultation + téléchargement .txt).
 */
import { useMemo, useState } from "react";
import {
  IconAward,
  IconDownload,
  IconFileText,
  IconReportAnalytics,
  IconSchool,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { EvaluationRow } from "@/lib/etablissement-data";
import { cn } from "@/lib/utils";

export interface EvaluationsPayload {
  isChef: boolean;
  departmentCode: string | null;
  universityAcronym: string;
  evaluations: EvaluationRow[];
}

const LEVELS = ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2"];

function NoteStars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("text-sm font-bold", value >= 4 ? "text-emerald-700" : value >= 3 ? "text-gold-dark" : "text-red-600")}>
        {value}/5
      </span>
    </span>
  );
}

export function EvaluationsClient({ payload }: { payload: EvaluationsPayload }) {
  const { toast } = useToast();
  const [department, setDepartment] = useState("all");
  const [level, setLevel] = useState("all");
  const [attestationTarget, setAttestationTarget] = useState<EvaluationRow | null>(null);

  const departments = useMemo(
    () => Array.from(new Set(payload.evaluations.map((e) => e.departmentCode).filter((c): c is string => Boolean(c)))).sort(),
    [payload.evaluations],
  );

  const filtered = payload.evaluations.filter(
    (e) => (department === "all" || e.departmentCode === department) && (level === "all" || e.level === level),
  );

  const average = filtered.length
    ? Math.round((filtered.reduce((acc, e) => acc + e.average, 0) / filtered.length) * 10) / 10
    : 0;

  const downloadCsv = () => {
    const header = [
      "Matricule", "Étudiant", "Département", "Niveau", "Poste", "Entreprise",
      "Technique", "Ponctualité", "Autonomie", "Esprit d'équipe", "Moyenne /5", "Avis finalisé",
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = filtered.map((e) =>
      [
        e.matricule, e.studentName, e.departmentCode ?? "", e.level ?? "", e.position, e.companyName,
        String(e.technique), String(e.ponctualite), String(e.autonomie), String(e.espritEquipe),
        String(e.average), e.finalized ? "OUI" : "NON",
      ].map(escape).join(";"),
    );
    const csv = ["\uFEFF" + header.join(";"), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PV-Jury-${payload.universityAcronym}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "PV Jury exporté", description: `${filtered.length} évaluation(s) exportée(s) en CSV.` });
  };

  const downloadAttestation = (row: EvaluationRow) => {
    if (!row.attestationContent) return;
    const blob = new Blob([row.attestationContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attestation-${row.matricule.replace(/[^\w-]+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Attestation téléchargée", description: `${row.attestationRef ?? ""} — ${row.studentName}` });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Évaluations &amp; Jury</h1>
          <p className="text-sm text-body">
            Notes attribuées par les maîtres de stage en entreprise — {filtered.length} stage(s) terminé(s),
            moyenne {average}/5.
          </p>
        </div>
        <Button
          onClick={downloadCsv}
          disabled={filtered.length === 0}
          className="h-9 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
        >
          <IconDownload size={14} />
          Exporter le PV Jury (CSV)
        </Button>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {payload.isChef ? (
              <Select value="dept-locked" disabled>
                <SelectTrigger className="h-9 rounded-xl text-xs" aria-label="Département verrouillé">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dept-locked">Dépt. {payload.departmentCode}</SelectItem>
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
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Niveau d'études" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous niveaux</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="col-span-2 flex items-center justify-end sm:col-span-1">
              <Badge variant="outline" className="border-gold/30 bg-gold-50 text-[11px] font-semibold text-gold-dark">
                <IconSchool size={12} className="mr-1" /> Moyenne : {average}/5
              </Badge>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-100">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-500">Étudiant</TableHead>
                  <TableHead className="hidden text-xs font-semibold text-slate-500 sm:table-cell">Stage</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-slate-500">Technique</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-slate-500">Ponctualité</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-slate-500">Autonomie</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-slate-500">Esprit d'équipe</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-slate-500">Moyenne</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500">Attestation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-body">
                      Aucune évaluation pour ces critères — les notes apparaissent après le premier stage terminé.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <p className="text-sm font-semibold text-ink">{e.studentName}</p>
                        <p className="text-[11px] text-body">
                          {e.matricule} · {e.departmentCode ?? "—"} · {e.level ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <p className="max-w-44 truncate text-xs text-ink">{e.position}</p>
                        <p className="text-[11px] text-body">{e.companyName}</p>
                      </TableCell>
                      <TableCell className="text-center"><NoteStars value={e.technique} /></TableCell>
                      <TableCell className="text-center"><NoteStars value={e.ponctualite} /></TableCell>
                      <TableCell className="text-center"><NoteStars value={e.autonomie} /></TableCell>
                      <TableCell className="text-center"><NoteStars value={e.espritEquipe} /></TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-sm font-bold text-brand">
                          <IconReportAnalytics size={12} />
                          {e.average}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {e.attestationContent ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAttestationTarget(e)}
                            className="h-8 gap-1 rounded-lg border-gold/40 px-2 text-[11px] font-semibold text-gold-dark hover:bg-gold-50"
                          >
                            <IconAward size={12} />
                            Attestation
                          </Button>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ------------------- Modale attestation ------------------- */}
      <Dialog
        open={attestationTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAttestationTarget(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-ink">
              <IconAward size={17} className="text-gold" />
              Attestation de fin de stage — {attestationTarget?.attestationRef}
            </DialogTitle>
            <DialogDescription className="text-xs text-body">
              {attestationTarget ? `${attestationTarget.studentName} — ${attestationTarget.position} chez ${attestationTarget.companyName}` : ""}
            </DialogDescription>
          </DialogHeader>
          {attestationTarget ? (
            <div className="space-y-3">
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-xs leading-relaxed text-body">
                {attestationTarget.attestationContent}
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="font-bold text-ink">{attestationTarget.average}/5</p>
                  <p className="text-slate-400">Moyenne entreprise</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="font-bold text-ink">{attestationTarget.finalized ? "Finalisée" : "En cours"}</p>
                  <p className="text-slate-400">Évaluation</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button variant="outline" onClick={() => setAttestationTarget(null)} className="h-9 rounded-xl border-slate-200/80 text-xs text-ink hover:bg-slate-50">
                  Fermer
                </Button>
                <Button
                  onClick={() => downloadAttestation(attestationTarget)}
                  className="h-9 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
                >
                  <IconDownload size={14} />
                  Télécharger l&apos;attestation
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <IconFileText size={12} />
        Le PV Jury CSV s&apos;ouvre dans Excel (séparateur « ; », encodage UTF-8 BOM). Les attestations sont générées par
        l&apos;entreprise à la fin du stage.
      </p>
    </div>
  );
}
