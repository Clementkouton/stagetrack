"use client";

/**
 * Paramètres & Profil (client) :
 *  - ParametresClient : édition du nom / sigle / ville (Admin Université) ;
 *  - MemberProfileClient : « Mon profil » du Chef de Département et du
 *    Maître de Mémoire — onboarding en 3 étapes à la première connexion
 *    (photo / avatar automatique, fonction & grade, mot de passe).
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconBooks,
  IconBuildingBank,
  IconCheck,
  IconCircleCheck,
  IconInfoCircle,
  IconLoader2,
  IconLock,
  IconSchool,
  IconSparkles,
  IconUpload,
  IconEye, IconEyeOff
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateUniversityMemberProfile, updateUniversitySettings, updateMemberOnboarding } from "@/app/etablissement/actions";
import { avatarSvgDataUrl, AVATAR_MAX_BYTES, initialsOfName } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export interface ParametresPayload {
  name: string;
  acronym: string;
  city: string;
  memberName: string;
  memberEmail: string;
  isOnboarding: boolean;

}

export function ParametresClient({ payload }: { payload: ParametresPayload }) {
  const { toast } = useToast();
  const [name, setName] = useState(payload.name);
  const [acronym, setAcronym] = useState(payload.acronym);
  const [city, setCity] = useState(payload.city);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = name !== payload.name || acronym !== payload.acronym || city !== payload.city;

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const result = await updateUniversitySettings({ name, acronym, city });
      if (result.ok) {
        setSaved(true);
        toast({ title: "Paramètres enregistrés", description: "Les informations de l'établissement sont à jour." });
      } else {
        toast({ title: "Enregistrement impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">Paramètres École</h1>
        <p className="text-sm text-body">
          Informations officielles de l&apos;établissement, visibles par les étudiants et les entreprises partenaires.
        </p>
      </div>

      {payload.isOnboarding ? (
        <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/10 p-4">
          <IconInfoCircle size={18} className="mt-0.5 shrink-0 text-gold-dark" />
          <div>
            <p className="text-sm font-bold text-ink">Bienvenue — finalisez votre espace</p>
            <p className="mt-0.5 text-xs leading-relaxed text-body">
              Vérifiez puis enregistrez les informations officielles de votre établissement pour accéder au
              tableau de bord. Cette étape n&apos;est demandée qu&apos;à la première connexion.
            </p>
          </div>
        </div>
      ) : null}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
              {payload.acronym.slice(0, 4)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{payload.name}</p>
              <p className="text-xs text-body">
                Direction des Stages — espace administrateur de {payload.acronym}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="school-name" className="text-xs font-semibold text-ink">Nom de l&apos;établissement</Label>
              <Input
                id="school-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. INSTI — Institut National Supérieur de Technologie Industrielle"
                className="mt-1 h-10 rounded-xl text-sm"
              />
            </div>
            <div>
              <Label htmlFor="school-acronym" className="text-xs font-semibold text-ink">Sigle</Label>
              <Input
                id="school-acronym"
                value={acronym}
                onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                placeholder="INSTI"
                maxLength={10}
                className="mt-1 h-10 rounded-xl text-sm font-mono uppercase"
              />
            </div>
            <div>
              <Label htmlFor="school-city" className="text-xs font-semibold text-ink">Ville</Label>
              <Input
                id="school-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex. Lokossa"
                className="mt-1 h-10 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              {saved && !hasChanges ? (
                <>
                  <IconCircleCheck size={13} className="text-emerald-600" />
                  Paramètres à jour
                </>
              ) : (
                <>
                  <IconBuildingBank size={13} />
                  {hasChanges ? "Modifications non enregistrées" : "Aucune modification"}
                </>
              )}
            </p>
            <Button
              onClick={() => void save()}
              disabled={saving || !hasChanges}
              className="h-9 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
            >
              {saving ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
              Enregistrer les paramètres
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================== PROFIL MEMBRE (CHEF / MAÎTRE DE MÉMOIRE) ==============================
 * Onboarding en 3 étapes à la première connexion (profileCompleted = false) :
 *  ① Photo de profil — upload d'une image OU avatar SVG automatique (nom + titre) ;
 *  ② Fonction & grade — titre officiel affiché dans les badges ;
 *  ③ Sécurité — nouveau mot de passe (le mot de passe temporaire est requis).
 * Une fois le profil enregistré, profileCompleted = true et le JWT est re-signé.
 */

export interface MemberProfilePayload {
  memberName: string;
  memberEmail: string;
  memberTitle: string | null;
  memberAvatarUrl: string | null;
  role: "HEAD_OF_DEPARTMENT" | "ACADEMIC_SUPERVISOR";
  departmentName: string | null;
  universityName: string;
  universityAcronym: string;
  isOnboarding: boolean;
}

const STEPS = ["Photo de profil", "Fonction & grade", "Sécurité du compte"] as const;

export function MemberProfileClient({ payload }: { payload: MemberProfilePayload }) {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSupervisor = payload.role === "ACADEMIC_SUPERVISOR";

  const [step, setStep] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(payload.memberAvatarUrl);
  const [title, setTitle] = useState(
    payload.memberTitle ??
      (isSupervisor ? "Maître de Mémoire" : `Chef du Département ${payload.departmentName ?? ""}`),
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const defaultTitle = isSupervisor
    ? "Maître de Mémoire — Génie Électrique et Informatique"
    : `Chef du Département ${payload.departmentName ?? ""}`;

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format invalide", description: "Choisissez une image (PNG, JPG, WebP).", variant: "destructive" });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast({ title: "Image trop lourde", description: "300 Ko maximum — utilisez l'avatar automatique.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(String(reader.result));
      toast({ title: "Photo chargée", description: "Vérifiez l'aperçu puis passez à l'étape suivante." });
    };
    reader.readAsDataURL(file);
  };

  const useAutoAvatar = () => {
    setAvatarUrl(avatarSvgDataUrl(payload.memberName, title));
    toast({ title: "Avatar généré", description: "Avatar automatique StageTrack créé à partir de votre nom." });
  };

  const save = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Mots de passe différents", description: "La confirmation ne correspond pas au nouveau mot de passe.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const result = await updateMemberOnboarding({
        title,
        avatarUrl: avatarUrl ?? undefined,
        currentPassword,
        newPassword,
      });
      if (result.ok) {
        toast({
          title: "Profil complété !",
          description: "Votre espace est activé — redirection vers votre tableau de bord.",
        });
        // Le JWT re-signé débloque l'accès complet : accueil par rôle.
        router.push(isSupervisor ? "/etablissement/encadrement" : "/etablissement/dashboard");
        router.refresh();
      } else {
        toast({ title: "Enregistrement impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const canNext = step === 0 ? avatarUrl !== null : step === 1 ? title.trim().length >= 4 : false;
  const canSave =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    /[A-Za-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    newPassword === confirmPassword;


  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">
          {payload.isOnboarding ? "Bienvenue — finalisez votre profil" : "Mon profil"}
        </h1>
        <p className="text-sm text-body">
          {payload.isOnboarding
            ? "Complétez ces 3 étapes pour activer votre espace StageTrack. Votre compte a été créé par la Direction des Stages avec un mot de passe temporaire."
            : "Vos informations de membre " + payload.universityAcronym + " — photo, fonction et sécurité du compte."}
        </p>
      </div>

      {/* Fil d'étapes */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i < step
                  ? "bg-emerald-700 text-white"
                  : i === step
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-400",
              )}
            >
              {i < step ? <IconCheck size={14} /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden truncate text-xs font-semibold sm:block",
                i === step ? "text-ink" : "text-slate-400",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? <span className="h-0.5 min-w-3 flex-1 rounded bg-slate-200" aria-hidden /> : null}
          </div>
        ))}
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Étape 1 — avatar */}
          {step === 0 ? (
            <div className="space-y-4">
              <p className="text-sm font-bold text-ink">① Photo de profil</p>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold/40 bg-brand-50 text-2xl font-bold text-brand">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Aperçu de l'avatar" className="h-full w-full object-cover" />
                  ) : (
                    initialsOfName(payload.memberName)
                  )}
                </span>
                <div className="w-full space-y-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => pickPhoto(e.target.files?.[0])}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 gap-2 rounded-xl border-slate-200/80 text-xs font-semibold text-ink hover:bg-slate-50"
                    >
                      <IconUpload size={15} />
                      Téléverser une photo
                    </Button>
                    <Button
                      type="button"
                      onClick={useAutoAvatar}
                      className="h-9 gap-2 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
                    >
                      <IconSparkles size={15} className="text-gold" />
                      Valider l&apos;avatar automatique
                    </Button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-body">
                    PNG / JPG / WebP, 300 Ko maximum. Sans photo, un avatar StageTrack est généré à partir de votre nom
                    et de votre fonction (dégradé vert académique, liseré or).
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Étape 2 — fonction */}
          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-sm font-bold text-ink">② Fonction &amp; grade</p>
              <div className="space-y-1.5">
                <Label htmlFor="member-title" className="text-xs font-semibold text-ink">
                  Fonction officielle (affichée dans votre badge)
                </Label>
                <Input
                  id="member-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={defaultTitle}
                  maxLength={120}
                  className="mt-1 h-10 rounded-xl text-sm"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    isSupervisor ? "Dr. — Maître de Mémoire" : "Chef du Département GEI",
                    isSupervisor ? "Prof. — Maître de Mémoire" : "Chef du Département GC",
                    isSupervisor ? "Maître Assistant — Encadreur académique" : "Chef du Département GMP",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setTitle(suggestion)}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 transition-colors hover:border-brand/40 hover:text-brand"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-brand-50 p-3.5">
                <p className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold/40">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <IconSchool size={20} className="text-brand" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{payload.memberName}</span>
                    <span className="block truncate text-xs text-body">{title || defaultTitle}</span>
                  </span>
                </p>
              </div>
            </div>
          ) : null}

          {/* Étape 3 — sécurité */}
          {step === 2 ? (
            <div className="space-y-4">
              <p className="text-sm font-bold text-ink">③ Sécurité du compte</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="current-password" className="text-xs font-semibold text-ink">
                    Mot de passe actuel (temporaire reçu de la Direction)
                  </Label>
                  <div className="relative mt-1">
                  <Input
                    id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Votre mot de passe temporaire"
                    autoComplete="current-password"
                      className="h-10 rounded-xl pr-10 text-sm"
                  />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      aria-label={showCurrentPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-[#0B393C]"
                    >
                      {showCurrentPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                </div>
                </div>

                <div>
                  <Label htmlFor="new-password" className="text-xs font-semibold text-ink">
                    Nouveau mot de passe
                  </Label>
                  <div className="relative mt-1">
                  <Input
                    id="new-password"
                      type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8 caractères min., lettres + chiffres"
                    autoComplete="new-password"
                      className="h-10 rounded-xl pr-10 text-sm"
                  />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-[#0B393C]"
                    >
                      {showNewPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="text-xs font-semibold text-ink">
                    Confirmer le nouveau mot de passe
                  </Label>
                  <div className="relative mt-1">
                  <Input
                    id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le nouveau mot de passe"
                    autoComplete="new-password"
                      className="h-10 rounded-xl pr-10 text-sm"
                  />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-[#0B393C]"
                    >
                      {showConfirmPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                </div>
              </div>
              </div>

              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <IconLock size={13} />
                Hachage scrypt natif — votre mot de passe n&apos;est jamais stocké en clair.
              </p>
            </div>

          ) : null}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
              className="h-9 rounded-xl text-xs font-semibold text-slate-500"
            >
              Retour
            </Button>
            {step < 2 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => Math.min(2, s + 1))}
                disabled={!canNext}
                className="h-9 gap-2 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
              >
                Étape suivante
                <IconArrowRight size={15} />
              </Button>
            ) : (
              <Button
                onClick={() => void save()}
                disabled={saving || !canSave}
                className="h-9 gap-2 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
              >
                {saving ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
                Finaliser mon profil
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
