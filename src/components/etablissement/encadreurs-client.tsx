"use client";

/**
 * Maîtres de Mémoire (client, Chef de Département) :
 *  - cartes des encadreurs avec charge d'encadrement (X / 6) et étudiants affectés ;
 *  - création d'un compte ACADEMIC_SUPERVISOR (grade, nom, email) ;
 *  - modale de mot de passe temporaire copiable ;
 *  - réinitialisation de mot de passe.
 */
import { useState, useTransition } from "react";
import {
  IconBooks,
  IconCheck,
  IconCircleCheck,
  IconCopy,
  IconIdBadge,
  IconInfoCircle,
  IconLoader2,
  IconMail,
  IconRefresh,
  IconUserPlus,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { createSupervisorAccount, resetSupervisorPassword, type SupervisorCredentials } from "@/app/etablissement/actions";
import { initialsOf, colorFor } from "@/lib/entreprise-format";
import { cn } from "@/lib/utils";

export interface EncadreursPayload {
  departmentName: string | null;
  departmentCode: string | null;
  universityAcronym: string;
  supervisors: {
    memberId: string;
    fullName: string;
    email: string;
    title: string | null;
    grade: string | null;
    avatarUrl: string | null;
    profileCompleted: boolean;
    workload: number;
    maxWorkload: number;
    students: { name: string; matricule: string; level: string | null; thesisTitle: string | null; status: string }[];
  }[];
}

const GRADES = ["Prof.", "Dr.", "Ing.", "M.", "Mme"];

export function EncadreursClient({ payload }: { payload: EncadreursPayload }) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [credentials, setCredentials] = useState<SupervisorCredentials | null>(null);
  const [pending, startTransition] = useTransition();

  const totalLoad = payload.supervisors.reduce((acc, s) => acc + s.workload, 0);

  const resetPassword = (memberId: string, fullName: string) => {
    startTransition(async () => {
      const result = await resetSupervisorPassword(memberId);
      if (result.ok && result.data) {
        setCredentials(result.data);
        toast({ title: "Mot de passe réinitialisé", description: `${fullName} devra compléter son onboarding à la prochaine connexion.` });
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Maîtres de Mémoire</h1>
          <p className="text-sm text-body">
            Encadrement académique du département {payload.departmentCode ?? "—"} · {payload.supervisors.length} encadreur(s) ·{" "}
            {totalLoad} mémoire(s) encadré(s)
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-9 gap-2 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
        >
          <IconUserPlus size={15} />
          Créer un Maître de Mémoire
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand-50 p-4">
        <IconInfoCircle size={18} className="mt-0.5 shrink-0 text-brand" />
        <p className="text-xs leading-relaxed text-body">
          Chaque Maître de Mémoire reçoit un <strong className="text-ink">mot de passe temporaire</strong> : à sa première
          connexion, il complète son profil en 3 étapes (photo, fonction, mot de passe) avant d&apos;accéder à ses
          mémorants. Charge d&apos;encadrement conseillée : <strong className="text-ink">6 mémoires maximum</strong>.
        </p>
      </div>

      {payload.supervisors.length === 0 ? (
        <Card className="border-dashed border-slate-300 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
              <IconBooks size={26} className="text-brand" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">Aucun Maître de Mémoire</p>
            <p className="mt-1 max-w-sm text-xs text-body">
              Créez le premier encadreur académique de votre département — il pourra valider les thèmes de mémoire et
              délivrer les Bons à Soutenir.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {payload.supervisors.map((s) => {
            const loadPct = Math.min(100, Math.round((s.workload / s.maxWorkload) * 100));
            const overloaded = s.workload > s.maxWorkload;
            return (
              <Card key={s.memberId} className="border-slate-200/80 shadow-sm">
                <CardContent className="space-y-3.5 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                          colorFor(s.fullName),
                        )}
                      >
                        {initialsOf(s.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">{s.fullName}</p>
                        <p className="truncate text-xs text-body">{s.grade ?? s.title ?? "Maître de Mémoire"}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {s.profileCompleted ? (
                        <Badge variant="outline" className="gap-1 border-emerald-700/30 bg-emerald-700/10 text-[10px] font-bold text-emerald-800">
                          <IconCircleCheck size={11} />
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-gold/40 bg-gold-50 text-[10px] font-bold text-gold-dark">
                          Onboarding en attente
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1 border-brand/25 bg-brand-50 text-[10px] font-bold text-brand">
                        <IconIdBadge size={11} />
                        {s.grade ?? "Maître"}
                      </Badge>
                    </div>
                  </div>

                  <p className="flex items-center gap-1.5 text-[11px] text-body">
                    <IconMail size={12} className="shrink-0 text-slate-400" />
                    <span className="truncate">{s.email}</span>
                  </p>

                  {/* Charge d'encadrement */}
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 font-semibold text-ink">
                        <IconUsersGroup size={13} className="text-brand" />
                        Charge d&apos;encadrement
                      </span>
                      <span className={cn("font-bold", overloaded ? "text-red-600" : loadPct >= 85 ? "text-gold-dark" : "text-ink")}>
                        {s.workload} / {s.maxWorkload}
                      </span>
                    </div>
                    <Progress
                      value={loadPct}
                      className="mt-1.5 h-2 bg-slate-100 [&_[data-slot=progress-indicator]]:bg-brand"
                    />
                    {overloaded ? (
                      <p className="mt-1 text-[11px] font-semibold text-red-600">
                        Charge supérieure au plafond conseillé ({s.maxWorkload}) — réaffectez des mémoires.
                      </p>
                    ) : null}
                  </div>

                  {s.students.length > 0 ? (
                    <div className="space-y-1.5">
                      {s.students.slice(0, 4).map((st) => (
                        <div key={st.matricule} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                          <p className="truncate text-[11px] font-semibold text-ink">
                            {st.name} · {st.matricule}
                          </p>
                          <p className="shrink-0 text-[10px] text-slate-400">{st.level ?? "—"}</p>
                        </div>
                      ))}
                      {s.students.length > 4 ? (
                        <p className="text-[10px] text-slate-400">+ {s.students.length - 4} autre(s) mémoire(s)…</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-center text-[11px] text-body">
                      Aucun mémoire affecté — utilisez « Étudiants de ma filière » pour assigner des stagiaires.
                    </p>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resetPassword(s.memberId, s.fullName)}
                    disabled={pending}
                    className="h-8 gap-1.5 rounded-lg border-slate-200/80 text-[11px] font-semibold text-ink hover:bg-slate-50"
                  >
                    <IconRefresh size={13} />
                    Réinitialiser le mot de passe
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateSupervisorDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(creds) => {
          setCreateOpen(false);
          setCredentials(creds);
        }}
      />

      {/* Modale mot de passe temporaire */}
      <Dialog open={credentials !== null} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink">
              <IconCheck size={18} className="text-emerald-600" />
              Compte créé — mot de passe temporaire
            </DialogTitle>
            <DialogDescription>
              Transmettez ces identifiants à {credentials?.fullName}. Ils ne seront plus affichés après fermeture.
            </DialogDescription>
          </DialogHeader>
          {credentials ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Email institutionnel</p>
                <p className="mt-0.5 font-semibold text-ink">{credentials.email}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Mot de passe temporaire
                </p>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <code className="rounded-lg bg-white px-2.5 py-1.5 font-mono text-sm font-bold text-brand shadow-sm">
                    {credentials.tempPassword}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(credentials.tempPassword).then(() =>
                        toast({ title: "Copié", description: "Mot de passe copié dans le presse-papiers." }),
                      );
                    }}
                    className="h-8 shrink-0 gap-1 rounded-lg text-xs"
                  >
                    <IconCopy size={13} />
                    Copier
                  </Button>
                </div>
              </div>
              <p className="rounded-xl bg-gold/10 p-3 text-xs leading-relaxed text-gold-dark">
                À sa première connexion, {credentials.fullName.split(" ")[0]} complétera son onboarding en 3 étapes
                (photo de profil, fonction &amp; grade, nouveau mot de passe) puis accédera à son espace « Mes
                Mémorants ».
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)} className="h-9 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark">
              Terminé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateSupervisorDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (credentials: SupervisorCredentials) => void;
}) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("Dr.");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await createSupervisorAccount({ fullName, email, grade });
      if (result.ok && result.data) {
        toast({ title: "Maître de Mémoire créé", description: `${fullName} peut maintenant se connecter.` });
        setFullName("");
        setEmail("");
        setGrade("Dr.");
        onCreated(result.data);
      } else {
        toast({ title: "Création impossible", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-ink">
            <IconBooks size={18} className="text-brand" />
            Créer un Maître de Mémoire
          </DialogTitle>
          <DialogDescription>
            Le compte sera rattaché à votre département avec le rôle ACADEMIC_SUPERVISOR.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="sup-grade">Grade / titre</Label>
            <Input
              id="sup-grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Prof., Dr., Ing.…"
              maxLength={30}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
                    grade === g
                      ? "border-brand bg-brand-50 text-brand"
                      : "border-slate-200 bg-white text-slate-500 hover:border-brand/40",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-name">Nom complet</Label>
            <Input
              id="sup-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ex. Prof. Adèle Kponton"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-email">Email institutionnel</Label>
            <Input
              id="sup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@insti-lokossa.bj"
              required
            />
          </div>
        </div>
        <DialogFooter className="gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={pending || fullName.trim().length < 4 || !email.includes("@")}
            className="gap-2 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
          >
            {pending ? <IconLoader2 size={15} className="animate-spin" /> : <IconUserPlus size={15} />}
            Créer le compte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
