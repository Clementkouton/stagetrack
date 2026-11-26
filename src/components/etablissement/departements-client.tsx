"use client";

/**
 * Départements & Chefs (client) — création du département + de son Chef
 * (modale récapitulative « Copier les identifiants »), réinitialisation du
 * mot de passe du chef, remplacement du chef.
 */
import { useMemo, useState } from "react";
import {
  IconBuildingBank,
  IconCheck,
  IconCirclePlus,
  IconCopy,
  IconKey,
  IconLoader2,
  IconMail,
  IconSchool,
  IconUserOff,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  createDepartmentWithHead,
  replaceDepartmentHead,
  resetDepartmentHeadPassword,
  type HeadCredentials,
} from "@/app/etablissement/actions";
import type { DepartmentRow } from "@/lib/etablissement-data";
import { cn } from "@/lib/utils";

export interface DepartmentsPayload {
  universityAcronym: string;
  departments: DepartmentRow[];
}

interface CreateForm {
  name: string;
  code: string;
  specialties: string[];
  headFullName: string;
  headEmail: string;
}

const CREDENTIALS_COPY = (c: HeadCredentials): string =>
  [
    "Identifiants StageTrack — Chef de Département",
    `Département : ${c.departmentName} (${c.departmentCode})`,
    `Nom : ${c.fullName}`,
    `Email : ${c.email}`,
    `Mot de passe temporaire : ${c.tempPassword}`,
    "",
    "Connexion : espace Université sur StageTrack (à modifier à la première connexion).",
  ].join("\n");

function CredentialsBox({ credentials, onClose }: { credentials: HeadCredentials; onClose: () => void }) {
  const { toast } = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CREDENTIALS_COPY(credentials));
      toast({ title: "Identifiants copiés", description: "Collez-les dans un message sécurisé pour le Chef de Département." });
    } catch {
      toast({ title: "Copie impossible", description: "Votre navigateur a refusé l'accès au presse-papiers.", variant: "destructive" });
    }
  };
  return (
    <div className="mt-4 rounded-xl border border-gold/40 bg-gold-50 p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gold-dark">
        <IconKey size={14} /> Identifiants d&apos;accès générés
      </p>
      <div className="mt-3 space-y-1.5 text-sm">
        <p className="flex items-center gap-2 text-ink">
          <IconMail size={14} className="shrink-0 text-brand" />
          <span className="font-semibold">{credentials.email}</span>
        </p>
        <p className="flex items-center gap-2 text-ink">
          <IconKey size={14} className="shrink-0 text-brand" />
          <span className="font-mono font-bold tracking-wide">{credentials.tempPassword}</span>
        </p>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-body">
        Compte créé pour <strong>{credentials.fullName}</strong> — Chef du Département {credentials.departmentCode}.
        Transmettez ces identifiants via un canal sécurisé.
      </p>
      <div className="mt-3 flex gap-2">
        <Button onClick={() => void copy()} className="h-9 flex-1 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark">
          <IconCopy size={14} />
          Copier les identifiants
        </Button>
        <Button variant="outline" onClick={onClose} className="h-9 rounded-xl border-slate-200/80 text-xs text-ink hover:bg-slate-50">
          Terminé
        </Button>
      </div>
    </div>
  );
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || value.some((s) => s.toLowerCase() === v.toLowerCase())) return;
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="h-10 flex-1 rounded-xl text-sm"
        />
        <Button type="button" onClick={add} className="h-10 w-10 shrink-0 rounded-xl bg-brand p-0 text-white hover:bg-brand-dark" aria-label="Ajouter la spécialité">
          <IconCirclePlus size={16} />
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((s) => (
            <Badge key={s} variant="outline" className="gap-1 rounded-lg border-brand/25 bg-brand-50 py-1 pr-1 text-xs text-brand">
              {s}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== s))}
                aria-label={`Retirer ${s}`}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand/15"
              >
                <IconX size={12} />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DepartmentsClient({ payload }: { payload: DepartmentsPayload }) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<HeadCredentials | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<DepartmentRow | null>(null);
  const [replaceForm, setReplaceForm] = useState({ headFullName: "", headEmail: "" });
  const [form, setForm] = useState<CreateForm>({ name: "", code: "", specialties: [], headFullName: "", headEmail: "" });

  const totals = useMemo(
    () => ({
      students: payload.departments.reduce((acc, d) => acc + d.students, 0),
      heads: payload.departments.filter((d) => d.headName).length,
    }),
    [payload.departments],
  );

  const submitCreate = async () => {
    setSaving(true);
    try {
      const result = await createDepartmentWithHead(form);
      if (result.ok && result.data) {
        setCredentials(result.data);
        setForm({ name: "", code: "", specialties: [], headFullName: "", headEmail: "" });
        toast({ title: "Département créé", description: `${result.data.departmentName} — Chef : ${result.data.fullName}` });
      } else {
        toast({ title: "Création impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const submitReplace = async () => {
    if (!replaceTarget) return;
    setSaving(true);
    try {
      const result = await replaceDepartmentHead({
        departmentId: replaceTarget.id,
        headFullName: replaceForm.headFullName,
        headEmail: replaceForm.headEmail,
      });
      if (result.ok && result.data) {
        setCredentials(result.data);
        setReplaceTarget(null);
        setReplaceForm({ headFullName: "", headEmail: "" });
        toast({ title: "Chef remplacé", description: `${result.data.departmentCode} — nouveau chef : ${result.data.fullName}` });
      } else {
        toast({ title: "Remplacement impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (memberId: string, departmentCode: string) => {
    const result = await resetDepartmentHeadPassword(memberId);
    if (result.ok && result.data) {
      setCredentials(result.data);
      toast({ title: "Mot de passe réinitialisé", description: `Nouveau mot de passe temporaire pour le Chef ${departmentCode}.` });
    } else {
      toast({ title: "Réinitialisation impossible", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Départements &amp; Chefs</h1>
          <p className="text-sm text-body">
            {payload.departments.length} départements · {totals.heads}/{payload.departments.length} chefs nommés ·{" "}
            {totals.students} étudiants rattachés
          </p>
        </div>
        <Button
          onClick={() => {
            setCredentials(null);
            setCreateOpen(true);
          }}
          className="h-9 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
        >
          <IconCirclePlus size={15} />
          Créer un Département &amp; son Chef
        </Button>
      </div>

      {/* --------------------------- Cartes --------------------------- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {payload.departments.map((d) => (
          <Card key={d.id} className="border-slate-200/80 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
                  {d.code.slice(0, 3)}
                </span>
                <Badge variant="outline" className="border-gold/30 bg-gold-50 text-[10px] text-gold-dark">
                  {d.placed}/{d.students} placés
                </Badge>
              </div>
              <p className="mt-3 text-sm font-bold leading-snug text-ink">{d.name}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Spécialités</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {d.specialties.slice(0, 3).map((s) => (
                  <Badge key={s} variant="outline" className="rounded-md border-slate-200 bg-slate-50 text-[10px] text-slate-600">
                    {s}
                  </Badge>
                ))}
                {d.specialties.length > 3 ? (
                  <Badge variant="outline" className="rounded-md border-slate-200 bg-slate-50 text-[10px] text-slate-600">
                    +{d.specialties.length - 3}
                  </Badge>
                ) : null}
              </div>
              <Separator className="my-3" />
              {d.headName ? (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <IconSchool size={13} className="text-brand" /> {d.headName}
                  </p>
                  <p className="ml-5 truncate text-[11px] text-body">{d.headEmail}</p>
                </div>
              ) : (
                <p className="text-xs italic text-body">Aucun chef nommé — créez-en un ou remplacez-le.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --------------------------- Tableau --------------------------- */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto rounded-xl">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-slate-500">Département</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500">Chef de Département</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500">Étudiants</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payload.departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <IconBuildingBank size={15} className="shrink-0 text-brand" />
                        {d.name} <span className="text-xs font-normal text-body">({d.code})</span>
                      </p>
                    </TableCell>
                    <TableCell>
                      {d.headName ? (
                        <div>
                          <p className="text-sm text-ink">{d.headName}</p>
                          <p className="text-[11px] text-body">{d.headEmail}</p>
                        </div>
                      ) : (
                        <span className="text-xs italic text-body">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink">
                        <IconUsersGroup size={14} className="text-slate-400" />
                        {d.students}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!d.headMemberId}
                          onClick={() => void resetPassword(d.headMemberId ?? "", d.code)}
                          className="h-8 gap-1 rounded-lg border-slate-200/80 px-2 text-[11px] text-ink hover:bg-slate-50"
                        >
                          <IconKey size={12} />
                          Réinitialiser
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReplaceTarget(d);
                            setReplaceForm({ headFullName: "", headEmail: "" });
                          }}
                          className="h-8 gap-1 rounded-lg border-gold/40 px-2 text-[11px] text-gold-dark hover:bg-gold-50"
                        >
                          <IconUserOff size={12} />
                          Remplacer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ------------------- Modale création + identifiants ------------------- */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCredentials(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-ink">
              <IconBuildingBank size={18} className="text-brand" />
              Créer un Département &amp; son Chef de Département
            </DialogTitle>
            <DialogDescription className="text-xs text-body">
              Le système crée le département, le compte utilisateur du Chef (mot de passe temporaire sécurisé) et son
              rattachement administratif.
            </DialogDescription>
          </DialogHeader>

          {credentials ? (
            <div>
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <IconCheck size={15} />
                Département créé avec succès — identifiants du Chef ci-dessous.
              </div>
              <CredentialsBox credentials={credentials} onClose={() => setCreateOpen(false)} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="dept-name" className="text-xs font-semibold text-ink">Nom du département</Label>
                  <Input
                    id="dept-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex. Génie Électrique et Informatique"
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="dept-code" className="text-xs font-semibold text-ink">Code</Label>
                  <Input
                    id="dept-code"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="GEI"
                    maxLength={6}
                    className="mt-1 h-10 rounded-xl text-sm font-mono uppercase"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-ink">Spécialités du département</Label>
                <div className="mt-1">
                  <TagInput
                    value={form.specialties}
                    onChange={(specialties) => setForm((f) => ({ ...f, specialties }))}
                    placeholder="Ex. Réseaux, Télécommunications…"
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="head-name" className="text-xs font-semibold text-ink">Nom complet du Chef</Label>
                  <Input
                    id="head-name"
                    value={form.headFullName}
                    onChange={(e) => setForm((f) => ({ ...f, headFullName: e.target.value }))}
                    placeholder="Ex. Nadège Ahouansou"
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="head-email" className="text-xs font-semibold text-ink">Email institutionnel</Label>
                  <Input
                    id="head-email"
                    type="email"
                    value={form.headEmail}
                    onChange={(e) => setForm((f) => ({ ...f, headEmail: e.target.value }))}
                    placeholder="chef.gei@insti-lokossa.bj"
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-[11px] text-slate-400">Un mot de passe temporaire sera généré automatiquement.</p>
                <Button
                  onClick={() => void submitCreate()}
                  disabled={saving || form.name.trim().length < 4 || form.code.trim().length < 2 || form.headFullName.trim().length < 4 || form.headEmail.trim().length < 5}
                  className="h-9 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
                >
                  {saving ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
                  Créer le département
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------- Modale remplacement chef ------------------- */}
      <Dialog
        open={replaceTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReplaceTarget(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-ink">
              Remplacer le Chef — {replaceTarget?.code}
            </DialogTitle>
            <DialogDescription className="text-xs text-body">
              {replaceTarget?.headName
                ? `${replaceTarget.headName} perdra l'accès de chef au département ${replaceTarget.code} (son compte est conservé).`
                : "Nommez le premier Chef de Département de ce département."}
            </DialogDescription>
          </DialogHeader>
          {credentials ? (
            <CredentialsBox credentials={credentials} onClose={() => { setReplaceTarget(null); setCredentials(null); }} />
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="replace-name" className="text-xs font-semibold text-ink">Nom complet du nouveau Chef</Label>
                <Input
                  id="replace-name"
                  value={replaceForm.headFullName}
                  onChange={(e) => setReplaceForm((f) => ({ ...f, headFullName: e.target.value }))}
                  placeholder="Ex. Firmin Adounkè"
                  className="mt-1 h-10 rounded-xl text-sm"
                />
              </div>
              <div>
                <Label htmlFor="replace-email" className="text-xs font-semibold text-ink">Email institutionnel</Label>
                <Input
                  id="replace-email"
                  type="email"
                  value={replaceForm.headEmail}
                  onChange={(e) => setReplaceForm((f) => ({ ...f, headEmail: e.target.value }))}
                  placeholder="nouveau.chef@insti-lokossa.bj"
                  className="mt-1 h-10 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button variant="outline" onClick={() => setReplaceTarget(null)} className={cn("h-9 rounded-xl border-slate-200/80 text-xs text-ink hover:bg-slate-50")}>
                  Annuler
                </Button>
                <Button
                  onClick={() => void submitReplace()}
                  disabled={saving || replaceForm.headFullName.trim().length < 4 || replaceForm.headEmail.trim().length < 5}
                  className="h-9 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
                >
                  {saving ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
                  Nommer ce Chef
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
