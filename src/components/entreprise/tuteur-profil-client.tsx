"use client";

/**
 * Mon Profil (Tuteur / Maître de Stage) :
 *  - onboarding en 3 étapes à la première connexion (photo/avatar, fonction,
 *    mot de passe) ;
 *  - ensuite : carte profil personnel (lecture seule nom/email) + édition
 *    fonction & téléphone + sécurité du compte.
 * Aucune gestion d'équipe ni de vitrine : réservées à l'Admin RH.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconCheck,
  IconCircleCheck,
  IconInfoCircle,
  IconLoader2,
  IconLock,
  IconMail,
  IconPhone,
  IconShieldCheck,
  IconSparkles,
  IconUpload,
  IconUserCircle,
  IconEye,
  IconEyeOff
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateTutorProfile } from "@/app/entreprise/actions";
import { avatarSvgDataUrl, AVATAR_MAX_BYTES, initialsOfName } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export interface TuteurProfilePayload {
  fullName: string;
  email: string;
  position: string | null;
  phone: string | null;
  avatarUrl: string | null;
  companyName: string;
  isAdmin: boolean;
  isOnboarding: boolean;
}

const STEPS = ["Photo de profil", "Fonction & contact", "Sécurité du compte"] as const;

export function TuteurProfilClient({ payload }: { payload: TuteurProfilePayload }) {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnboarding = payload.isOnboarding;

  const [step, setStep] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(payload.avatarUrl);
  const [position, setPosition] = useState(payload.position ?? "Tuteur de stage");
  const [phone, setPhone] = useState(payload.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      toast({ title: "Photo chargée", description: "Vérifiez l'aperçu puis continuez." });
    };
    reader.readAsDataURL(file);
  };

  const useAutoAvatar = () => {
    setAvatarUrl(avatarSvgDataUrl(payload.fullName, position));
    toast({ title: "Avatar généré", description: "Avatar automatique StageTrack créé à partir de votre nom." });
  };

  const save = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Mots de passe différents", description: "La confirmation ne correspond pas au nouveau mot de passe.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const result = await updateTutorProfile({
        position,
        phone,
        avatarUrl: avatarUrl ?? undefined,
        currentPassword,
        newPassword,
      });
      if (result.ok) {
        setSaved(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast({
          title: isOnboarding ? "Profil complété !" : "Profil enregistré",
          description: isOnboarding
            ? "Votre espace tuteur est activé — redirection vers votre tableau de bord."
            : "Vos informations personnelles et votre mot de passe sont à jour.",
        });
        if (isOnboarding) {
          router.push("/entreprise/dashboard");
          router.refresh();
        }
      } else {
        toast({ title: "Enregistrement impossible", description: result.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const canNext = step === 0 ? avatarUrl !== null : position.trim().length >= 3;
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
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {isOnboarding ? "Bienvenue — finalisez votre profil" : "Mon Profil"}
        </h1>
        <p className="mt-1 text-sm text-body">
          {isOnboarding
            ? "Complétez ces 3 étapes pour activer votre espace tuteur chez " + payload.companyName + "."
            : "Vos informations personnelles — la vitrine entreprise et l'équipe sont gérées par l'Administrateur RH."}
        </p>
      </div>

      {isOnboarding ? (
        <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/10 p-4">
          <IconInfoCircle size={18} className="mt-0.5 shrink-0 text-gold-dark" />
          <div>
            <p className="text-sm font-bold text-ink">Première connexion — 3 étapes</p>
            <p className="mt-0.5 text-xs leading-relaxed text-body">
              Votre compte a été créé par l&apos;Administrateur RH avec un mot de passe temporaire : photo de profil
              (ou avatar automatique), fonction &amp; contact, puis nouveau mot de passe.
            </p>
          </div>
        </div>
      ) : null}

      {isOnboarding ? (
        <>
          {/* Fil d'étapes */}
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    i < step ? "bg-emerald-700 text-white" : i === step ? "bg-brand text-white" : "bg-slate-100 text-slate-400",
                  )}
                >
                  {i < step ? <IconCheck size={14} /> : i + 1}
                </span>
                <span className={cn("hidden truncate text-xs font-semibold sm:block", i === step ? "text-ink" : "text-slate-400")}>
                  {label}
                </span>
                {i < STEPS.length - 1 ? <span className="h-0.5 min-w-3 flex-1 rounded bg-slate-200" aria-hidden /> : null}
              </div>
            ))}
          </div>

          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="space-y-4 p-4 sm:p-6">
              {step === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-ink">① Photo de profil</p>
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold/40 bg-brand-50 text-2xl font-bold text-brand">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="Aperçu de l'avatar" className="h-full w-full object-cover" />
                      ) : (
                        initialsOfName(payload.fullName)
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
                        PNG / JPG / WebP, 300 Ko maximum. Sans photo, un avatar StageTrack est généré à partir de votre
                        nom et de votre fonction.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-ink">② Fonction &amp; contact</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="tuteur-position" className="text-xs font-semibold text-ink">
                        Fonction / titre
                      </Label>
                      <Input
                        id="tuteur-position"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="ex. Ingénieur DevOps — Tuteur technique"
                        maxLength={120}
                        className="mt-1 h-10 rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tuteur-phone" className="text-xs font-semibold text-ink">
                        Téléphone
                      </Label>
                      <Input
                        id="tuteur-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+229 …"
                        className="mt-1 h-10 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl bg-brand-50 p-3.5">
                    <p className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold/40">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <IconUserCircle size={20} className="text-brand" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-ink">{payload.fullName}</span>
                        <span className="block truncate text-xs text-body">{position || "Fonction à préciser"}</span>
                      </span>
                    </p>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-ink">③ Sécurité du compte</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="tuteur-current" className="text-xs font-semibold text-ink">
                        Mot de passe actuel (temporaire reçu)
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="tuteur-current"
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
                      <Label htmlFor="tuteur-new" className="text-xs font-semibold text-ink">
                        Nouveau mot de passe
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="tuteur-new"
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
                      <Label htmlFor="tuteur-confirm" className="text-xs font-semibold text-ink">
                        Confirmer le nouveau mot de passe
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="tuteur-confirm"
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
        </>
      ) : (
        /* -------- Profil courant (hors onboarding) -------- */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-slate-200/80 rounded-xl bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <IconUserCircle size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink">Identité</h2>
                  <p className="text-[11px] text-body">Informations gérées par l&apos;Administrateur RH</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold/40 bg-brand-50 text-lg font-bold text-brand">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialsOfName(payload.fullName)
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-ink">{payload.fullName}</p>
                    <Badge variant="outline" className="border-gold/40 bg-gold-50 text-[9px] font-bold text-gold-dark">
                      <IconShieldCheck size={10} className="mr-0.5" />
                      Tuteur / Maître de Stage
                    </Badge>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-body">
                    <IconMail size={11} />
                    {payload.email}
                  </p>
                  <p className="mt-0.5 text-[11px] text-body">{payload.companyName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 rounded-xl bg-white">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <IconPhone size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink">Fonction &amp; contact</h2>
                  <p className="text-[11px] text-body">Visibles par vos stagiaires et l&apos;université</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-position" className="text-xs font-semibold text-ink">Fonction / titre</Label>
                <Input
                  id="p-position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  maxLength={120}
                  className="h-10 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-phone" className="text-xs font-semibold text-ink">Téléphone</Label>
                <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-xl text-sm" />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Sécurité</p>
                <div className="mt-2 grid grid-cols-1 gap-3">
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Mot de passe actuel"
                    autoComplete="current-password"
                    className="h-9 rounded-xl text-sm"
                  />
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nouveau mot de passe (8 car. min., lettres + chiffres)"
                    autoComplete="new-password"
                    className="h-9 rounded-xl text-sm"
                  />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmer le nouveau mot de passe"
                    autoComplete="new-password"
                    className="h-9 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  {saved ? (
                    <>
                      <IconCircleCheck size={13} className="text-emerald-600" />
                      Profil à jour
                    </>
                  ) : (
                    <>
                      <IconLock size={13} />
                      Modification locale — cliquez pour enregistrer
                    </>
                  )}
                </p>
                <Button
                  onClick={() => void save()}
                  disabled={saving || !canSave || position.trim().length < 3}
                  className="h-9 gap-2 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark"
                >
                  {saving ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
