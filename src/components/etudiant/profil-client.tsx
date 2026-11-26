"use client";

/**
 * Module 7 (client) — Mon profil académique : badge matricule vérifié,
 * rattachement en cascade Université → Département → Spécialité → Niveau,
 * carte de confirmation officielle avec le Chef de Département assigné,
 * édition du téléphone, du CV et des tags de compétences.
 */
import { useMemo, useState } from "react";
import {
  IconCheck,
  IconCircleCheck,
  IconCircleX,
  IconExternalLink,
  IconIdBadge,
  IconLoader2,
  IconMail,
  IconPhone,
  IconPlus,
  IconSchool,
  IconShieldCheck,
  IconSparkles,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { updateStudentAcademicProfile, updateStudentProfile, type AcademicProfileResult } from "@/app/etudiant/actions";
import { colorFor, initialsOf } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface CascadeUniversity {
  id: string;
  name: string;
  acronym: string;
  city: string | null;
  departments: { id: string; name: string; code: string; specialties: string[] }[];
}

export interface DepartmentHeadInfo {
  fullName: string;
  title: string;
  email: string;
}

const LEVELS = [
  "Licence 1",
  "Licence 2",
  "Licence 3",
  "Master 1",
  "Master 2",
  "Ingénieur 1",
  "Ingénieur 2",
  "Ingénieur 3",
  "Doctorat",
  "BTS / DUT",
];

/** Carte de confirmation officielle (encadré vert sapin / or). */
function AttachmentConfirmation({
  result,
}: {
  result: Pick<AcademicProfileResult, "universityName" | "universityAcronym" | "universityCity" | "departmentName" | "departmentCode" | "specialty" | "level" | "head">;
}) {
  return (
    <div className="rounded-2xl border-2 border-brand/25 bg-gradient-to-br from-brand-50 to-gold-50 p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-800">
        <IconCircleCheck size={15} />
        Rattachement académique confirmé
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-brand/20 bg-white p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <IconSchool size={12} className="text-brand" /> Établissement
          </p>
          <p className="mt-1 text-sm font-bold leading-snug text-ink">{result.universityName}</p>
          <p className="text-xs text-body">
            {result.universityAcronym}
            {result.universityCity ? ` · ${result.universityCity}` : ""}
          </p>
        </div>
        <div className="rounded-xl border border-gold/30 bg-white p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <IconSparkles size={12} className="text-gold" /> Département &amp; Spécialité
          </p>
          <p className="mt-1 text-sm font-bold leading-snug text-ink">{result.departmentName}</p>
          <p className="text-xs text-body">
            {result.specialty} · {result.level}
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-emerald-700/30 bg-emerald-50 p-3.5">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
          <IconShieldCheck size={13} /> Chef de Département assigné automatiquement
        </p>
        {result.head ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm font-bold text-ink">{result.head.fullName}</p>
            <Badge variant="outline" className="rounded-lg border-emerald-700/30 bg-white text-[10px] font-semibold text-emerald-800">
              {result.head.title}
            </Badge>
            <a href={`mailto:${result.head.email}`} className="flex items-center gap-1 text-xs font-semibold text-brand underline-offset-2 hover:underline">
              <IconMail size={12} /> {result.head.email}
            </a>
          </div>
        ) : (
          <p className="mt-1.5 text-xs italic text-body">
            Aucun Chef de Département n&apos;est encore nommé — votre Direction des Stages peut le créer depuis l&apos;espace
            établissement.
          </p>
        )}
      </div>
    </div>
  );
}

interface ProfilInfo {
  fullName: string;
  email: string;
  matricule: string;
  universityId: string | null;
  departmentId: string | null;
  specialty: string | null;
  fieldOfStudy: string;
  level: string;
  phone: string;
  cvUrl: string;
  skills: string[];
}

export function ProfilClient({
  profile,
  universities,
  currentHead,
  candidatureCount,
}: {
  profile: ProfilInfo;
  universities: CascadeUniversity[];
  currentHead: DepartmentHeadInfo | null;
  candidatureCount: number;
}) {
  const { toast } = useToast();

  /* -------------------- Cascade parcours académique -------------------- */
  const [universityId, setUniversityId] = useState(profile.universityId ?? "");
  const [departmentId, setDepartmentId] = useState(profile.departmentId ?? "");
  const [specialty, setSpecialty] = useState(profile.specialty ?? "");
  const [level, setLevel] = useState(profile.level || "Licence 3");
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [confirmation, setConfirmation] = useState<AcademicProfileResult | null>(null);

  const selectedUniversity = universities.find((u) => u.id === universityId) ?? null;
  const selectedDepartment = selectedUniversity?.departments.find((d) => d.id === departmentId) ?? null;

  const cascadeDirty =
    universityId !== (profile.universityId ?? "") ||
    departmentId !== (profile.departmentId ?? "") ||
    specialty !== (profile.specialty ?? "") ||
    level !== (profile.level || "Licence 3");

  const onUniversityChange = (value: string) => {
    setUniversityId(value);
    setDepartmentId("");
    setSpecialty("");
    setConfirmation(null);
  };
  const onDepartmentChange = (value: string) => {
    setDepartmentId(value);
    setSpecialty("");
    setConfirmation(null);
  };

  const saveAcademic = async () => {
    if (!universityId || !departmentId || !specialty) return;
    setSavingAcademic(true);
    try {
      const result = await updateStudentAcademicProfile({
        universityId,
        departmentId,
        specialty,
        level,
      });
      if (result.ok && result.data) {
        setConfirmation(result.data);
        toast({
          title: "Parcours académique enregistré",
          description: result.data.head
            ? `Chef de Département assigné : ${result.data.head.fullName}.`
            : "Vos stages actifs ont été rattachés à votre département.",
        });
      } else {
        toast({ title: "Enregistrement impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setSavingAcademic(false);
    }
  };

  /* -------------------- Informations personnelles -------------------- */
  const [fieldOfStudy, setFieldOfStudy] = useState(profile.fieldOfStudy);
  const [phone, setPhone] = useState(profile.phone);
  const [cvUrl, setCvUrl] = useState(profile.cvUrl);
  const [skills, setSkills] = useState<string[]>(profile.skills);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);

  const addSkill = () => {
    const value = newSkill.trim();
    if (!value) return;
    if (skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      toast({ title: "Compétence déjà présente", variant: "destructive" });
      return;
    }
    if (skills.length >= 15) {
      toast({ title: "Maximum 15 compétences", description: "Gardez votre profil focalisé sur vos points forts.", variant: "destructive" });
      return;
    }
    setSkills((prev) => [...prev, value]);
    setNewSkill("");
  };

  const removeSkill = (skill: string) => setSkills((prev) => prev.filter((s) => s !== skill));

  const save = async () => {
    setSaving(true);
    try {
      const result = await updateStudentProfile({ fieldOfStudy, level, phone, cvUrl, skills });
      if (result.ok) {
        toast({ title: "Profil académique mis à jour", description: "Vos informations sont à jour pour les recruteurs." });
      } else {
        toast({ title: "Enregistrement impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    fieldOfStudy !== profile.fieldOfStudy ||
    level !== (profile.level || "Licence 3") ||
    phone !== profile.phone ||
    cvUrl !== profile.cvUrl ||
    skills.join("|") !== profile.skills.join("|");

  const schoolLabel = useMemo(() => {
    const confirmed = confirmation;
    if (confirmed) return `${confirmed.universityAcronym} — ${confirmed.departmentName}`;
    if (selectedDepartment && selectedUniversity) {
      return `${selectedUniversity.acronym} — ${selectedDepartment.name}`;
    }
    return universities.find((u) => u.id === profile.universityId)?.acronym ?? "Établissement à rattacher";
  }, [confirmation, selectedDepartment, selectedUniversity, universities, profile.universityId]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">Mon profil académique</h1>
        <p className="text-sm text-body">Votre carte d&apos;identité StageTrack, visible par les recruteurs.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* ------------------------ Carte identité ------------------------ */}
        <Card className="border-slate-200/80 shadow-sm lg:col-span-2">
          <div className="bg-brand px-4 py-6 text-white sm:px-5">
            <div className="flex items-center gap-3">
              <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white", colorFor(profile.fullName))}>
                {initialsOf(profile.fullName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{profile.fullName}</p>
                <p className="flex items-center gap-1 text-xs text-white/75">
                  <IconMail size={12} /> {profile.email}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gold">
                <IconShieldCheck size={14} /> Matricule vérifié
              </p>
              <p className="mt-1 flex items-center gap-2 text-lg font-bold tracking-wide text-white">
                <IconIdBadge size={18} className="text-gold" />
                {profile.matricule}
              </p>
              <p className="mt-1 text-[10px] text-white/60">Détecté automatiquement à la connexion — non modifiable.</p>
            </div>
          </div>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex items-start gap-2.5">
              <IconSchool size={17} className="mt-0.5 shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Établissement rattaché</p>
                <p className="text-sm font-semibold text-ink">{schoolLabel}</p>
                {selectedUniversity?.city ? <p className="text-xs text-body">{selectedUniversity.city} · Bénin</p> : null}
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-2.5">
              <IconShieldCheck size={17} className="mt-0.5 shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Chef de Département</p>
                {(confirmation?.head ?? currentHead) ? (
                  <>
                    <p className="text-sm font-semibold text-ink">{(confirmation?.head ?? currentHead)?.fullName}</p>
                    <p className="truncate text-xs text-body">{(confirmation?.head ?? currentHead)?.title}</p>
                    <p className="truncate text-xs text-body">{(confirmation?.head ?? currentHead)?.email}</p>
                  </>
                ) : (
                  <p className="text-sm italic text-body">Sélectionnez votre département pour l&apos;identifier automatiquement.</p>
                )}
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-2.5">
              <IconSparkles size={17} className="mt-0.5 shrink-0 text-gold" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Activité StageTrack</p>
                <p className="text-sm font-semibold text-ink">{candidatureCount} candidature{candidatureCount > 1 ? "s" : ""} via la plateforme</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ------------------------ Formulaire ------------------------ */}
        <div className="space-y-4 lg:col-span-3">
          {/* -------- Parcours académique en cascade -------- */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-bold text-ink">Parcours académique</h2>
                <p className="text-xs text-body">
                  Rattachement officiel : votre département et votre niveau, transmis automatiquement à votre
                  établissement pour le suivi des conventions.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold text-ink">1 · Université / Institut</Label>
                  <Select value={universityId || undefined} onValueChange={onUniversityChange}>
                    <SelectTrigger className="mt-1 h-10 rounded-xl text-sm">
                      <SelectValue placeholder="Choisir votre établissement" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {universities.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.acronym} — {u.name.length > 42 ? `${u.name.slice(0, 42)}…` : u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-ink">2 · Département</Label>
                  <Select
                    value={departmentId || undefined}
                    onValueChange={onDepartmentChange}
                    disabled={!selectedUniversity || selectedUniversity.departments.length === 0}
                  >
                    <SelectTrigger className="mt-1 h-10 rounded-xl text-sm">
                      <SelectValue
                        placeholder={
                          !selectedUniversity
                            ? "Choisir d'abord une université"
                            : selectedUniversity.departments.length === 0
                              ? "Aucun département créé"
                              : "Choisir un département"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {(selectedUniversity?.departments ?? []).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-ink">3 · Spécialité</Label>
                  <Select value={specialty || undefined} onValueChange={setSpecialty} disabled={!selectedDepartment}>
                    <SelectTrigger className="mt-1 h-10 rounded-xl text-sm">
                      <SelectValue placeholder={selectedDepartment ? "Choisir une spécialité" : "Choisir d'abord un département"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {(selectedDepartment?.specialties ?? []).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-ink">4 · Niveau d&apos;études</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger className="mt-1 h-10 rounded-xl text-sm">
                      <SelectValue placeholder="Choisir un niveau" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-[11px] text-slate-400">
                  {cascadeDirty ? "Nouveau rattachement à confirmer" : "Rattachement à jour"} — vos stages actifs suivent
                  automatiquement votre département.
                </p>
                <Button
                  onClick={() => void saveAcademic()}
                  disabled={savingAcademic || !universityId || !departmentId || !specialty || !level}
                  className="h-9 shrink-0 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
                >
                  {savingAcademic ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
                  Enregistrer mon parcours académique
                </Button>
              </div>

              {confirmation ? (
                <div className="pt-1">
                  <AttachmentConfirmation result={confirmation} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* -------- Informations personnelles -------- */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div>
                <h2 className="text-sm font-bold text-ink">Informations &amp; compétences</h2>
                <p className="text-xs text-body">Ces informations accompagnent chacune de vos candidatures.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="profil-filiere" className="text-xs font-semibold text-ink">Filière (libre)</label>
                  <Input
                    id="profil-filiere"
                    value={fieldOfStudy}
                    onChange={(e) => setFieldOfStudy(e.target.value)}
                    placeholder="Ex. Génie Logiciel"
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="profil-phone" className="flex items-center gap-1 text-xs font-semibold text-ink">
                    <IconPhone size={12} /> Téléphone
                  </label>
                  <Input
                    id="profil-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+229 97 41 25 36"
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="profil-cv" className="flex items-center gap-1 text-xs font-semibold text-ink">
                    <IconExternalLink size={12} /> Lien du CV (Drive, GitHub)
                  </label>
                  <Input
                    id="profil-cv"
                    value={cvUrl}
                    onChange={(e) => setCvUrl(e.target.value)}
                    placeholder="https://…"
                    className="mt-1 h-10 rounded-xl text-sm"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <label htmlFor="profil-skill" className="text-xs font-semibold text-ink">
                  Compétences techniques ({skills.length}/15)
                </label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="profil-skill"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Ex. React, SQL, Figma…"
                    className="h-10 flex-1 rounded-xl text-sm"
                  />
                  <Button type="button" onClick={addSkill} className="h-10 w-10 shrink-0 rounded-xl bg-brand p-0 text-white hover:bg-brand-dark" aria-label="Ajouter la compétence">
                    <IconPlus size={16} />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skills.length === 0 ? (
                    <p className="text-xs text-body">Aucune compétence — ajoutez au moins une compétence pour postuler.</p>
                  ) : (
                    skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="gap-1 rounded-lg border-brand/25 bg-brand-50 py-1 pr-1 text-xs font-medium text-brand"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          aria-label={`Retirer ${skill}`}
                          className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand/15"
                        >
                          <IconCircleX size={12} />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <p className="text-[11px] text-slate-400">
                  {hasChanges ? "Modifications non enregistrées" : "Profil à jour"}
                </p>
                <Button
                  onClick={() => void save()}
                  disabled={saving || !hasChanges}
                  className="h-9 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
                >
                  {saving ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
                  Enregistrer mon profil
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
