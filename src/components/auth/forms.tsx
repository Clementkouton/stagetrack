"use client";

/**
 * Formulaires d'authentification StageTrack.
 * 6 écrans : Connexion/Inscription × Étudiant/Entreprise/Université.
 * Validation react-hook-form + Zod, messages en français, animations Framer Motion.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconBuildingBank,
  IconBuildingSkyscraper,
  IconCircleCheck,
  IconEye,
  IconEyeOff,
  IconIdBadge2,
  IconLoader2,
  IconLock,
  IconMail,
  IconUser,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  useForm,
  useWatch,
  type Control,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FONCTIONS_REFERENT,
  INSTITUTIONS,
  SECTEURS,
  VILLES,
  detectInstitution,
  passwordStrength,
} from "@/lib/auth";
import {
  companyLoginSchema,
  companySignupSchema,
  studentLoginSchema,
  studentSignupSchema,
  universityLoginSchema,
  universitySignupSchema,
  type CompanyLoginValues,
  type CompanySignupValues,
  type StudentLoginValues,
  type StudentSignupValues,
  type UniversityLoginValues,
  type UniversitySignupValues,
} from "@/lib/auth-schemas";
import { cn } from "@/lib/utils";

export interface AuthFormProps {
  /** Appelé après authentification réussie avec l'URL de redirection fournie par l'API. */
  onSuccess: (redirect?: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Appels API réels (scrypt + JWT stagetrack_session)                 */
/* ------------------------------------------------------------------ */

interface AuthApiResponse {
  ok: boolean;
  redirect?: string;
  error?: string;
}

/** POST /api/auth/login — retourne l'URL de destination ou lève une erreur FR. */
async function postLogin(payload: {
  identifier: string;
  password: string;
  space: "etudiant" | "entreprise" | "etablissement";
}): Promise<string> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as AuthApiResponse;
  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "Connexion impossible. Vérifiez vos identifiants.");
  }
  return data.redirect ?? "/";
}

/** POST /api/auth/register — crée le compte puis connecte (JWT). */
async function postRegister(payload: Record<string, unknown>): Promise<string> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as AuthApiResponse;
  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "Inscription impossible. Vérifiez vos informations.");
  }
  return data.redirect ?? "/";
}



const selectOptions = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }));

/* ------------------------------------------------------------------ */
/*  Primitives de champs partagées                                     */
/* ------------------------------------------------------------------ */

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
      {children}
    </span>
  );
}

interface TextFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  icon?: ReactNode;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric";
}

function TextField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  icon,
  type = "text",
  autoComplete,
  inputMode,
}: TextFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-[13px] font-semibold text-ink">{label}</FormLabel>
          <FormControl>
            <div className="relative">
              {icon ? <FieldIcon>{icon}</FieldIcon> : null}
              <Input
                type={type}
                inputMode={inputMode}
                autoComplete={autoComplete}
                placeholder={placeholder}
                className={cn(
                  "h-11 rounded-xl border-slate-200 bg-white text-[15px] text-ink shadow-none placeholder:text-slate-400",
                  icon ? "pl-10" : "pl-4",
                )}
                {...field}
              />
            </div>
          </FormControl>
          <FormMessage className="text-xs font-medium" />
        </FormItem>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */

interface PasswordFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  strengthMeter?: boolean;
  rules?: RegisterOptions<T>;
}

function PasswordField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = "8 caractères minimum",
  autoComplete,
  strengthMeter = false,
  rules,
}: PasswordFieldProps<T>) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-[13px] font-semibold text-ink">{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <FieldIcon>
                <IconLock size={18} stroke={1.8} />
              </FieldIcon>
              <Input
                type={visible ? "text" : "password"}
                autoComplete={autoComplete}
                placeholder={placeholder}
                className="h-11 rounded-xl border-slate-200 bg-white pl-10 pr-11 text-[15px] text-ink shadow-none placeholder:text-slate-400"
                {...field}
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-2.5 top-1/2 flex h-7.5 w-7.5 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand"
              >
                {visible ? (
                  <IconEyeOff size={17} stroke={1.8} />
                ) : (
                  <IconEye size={17} stroke={1.8} />
                )}
              </button>
            </div>
          </FormControl>
          {strengthMeter ? (
            <div className="pt-1">
              <PasswordStrengthMeter password={String(field.value ?? "")} />
            </div>
          ) : null}
          <FormMessage className="text-xs font-medium" />
        </FormItem>
      )}
    />
  );
}

const STRENGTH_BARS = ["bg-red-400", "bg-orange-400", "bg-gold", "bg-brand"];
const STRENGTH_TEXT = ["text-red-500", "text-orange-500", "text-gold-dark", "text-brand"];

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);
  if (!strength) return null;
  return (
    <div className="flex items-center gap-2.5" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i <= strength.score ? STRENGTH_BARS[strength.score - 1] : "bg-slate-200",
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "w-20 text-right text-[11px] font-bold",
          STRENGTH_TEXT[strength.score - 1],
        )}
      >
        {strength.label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface SelectFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
}

function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
}: SelectFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-[13px] font-semibold text-ink">{label}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white text-[15px] text-ink shadow-none data-[placeholder]:text-slate-400">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="max-h-72 rounded-xl border-slate-200">
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="rounded-lg text-[14px]"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage className="text-xs font-medium" />
        </FormItem>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */

function SubmitButton({
  pending,
  idleLabel,
  pendingLabel,
}: {
  pending: boolean;
  idleLabel: string;
  pendingLabel: string;
}) {
  return (
    <Button
      type="submit"
      disabled={pending}
      className="mt-1.5 h-12 w-full rounded-xl bg-brand text-[15px] font-semibold text-white shadow-lg shadow-brand/25 transition-all duration-200 hover:bg-brand-dark hover:shadow-xl hover:shadow-brand/30"
    >
      {pending ? (
        <>
          <IconLoader2 size={18} className="animate-spin" />
          {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
    </Button>
  );
}

function ForgotPasswordLink() {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast({
          title: "Email de réinitialisation envoyé",
          description:
            "Si votre compte existe, un lien de réinitialisation vous a été envoyé par email. Pensez à vérifier vos courriers indésirables.",
        })
      }
      className="text-[13px] font-semibold text-brand transition-colors hover:text-gold-dark hover:underline"
    >
      Mot de passe oublié ?
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  A. Espace ÉTUDIANT — logique matricule obligatoire                 */
/* ------------------------------------------------------------------ */

export function StudentLoginForm({ onSuccess }: AuthFormProps) {
  const [pending, setPending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<StudentLoginValues>({
    resolver: zodResolver(studentLoginSchema),
    mode: "onTouched",
    defaultValues: { matricule: "", password: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      const redirect = await postLogin({
        identifier: values.matricule,
        password: values.password,
        space: "etudiant",
      });
      toast({
        title: "Connexion réussie !",
        description: "Bienvenue sur votre espace étudiant StageTrack.",
      });
      onSuccess(redirect);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connexion impossible.";
      toast({ title: "Connexion impossible", description: message, variant: "destructive" });
      setPending(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          control={form.control}
          name="matricule"
          label="Numéro matricule"
          placeholder="20241045 ou IFRI-2026-089"
          icon={<IconIdBadge2 size={18} stroke={1.8} />}
          autoComplete="username"
        />
        <PasswordField
          control={form.control}
          name="password"
          label="Mot de passe"
          autoComplete="current-password"
          placeholder="Votre mot de passe"
        />
        <div className="flex justify-end">
          <ForgotPasswordLink />
        </div>
        <SubmitButton
          pending={pending}
          idleLabel="Accéder à mon espace étudiant"
          pendingLabel="Connexion en cours…"
        />
      </form>
    </Form>
  );
}

export function StudentSignupForm({ onSuccess }: AuthFormProps) {
  const [pending, setPending] = useState(false);
  const form = useForm<StudentSignupValues>({
    resolver: zodResolver(studentSignupSchema),
    mode: "onTouched",
    defaultValues: {
      matricule: "",
      institution: "",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const matricule = useWatch({ control: form.control, name: "matricule" }) ?? "";
  const detection = useMemo(() => detectInstitution(matricule), [matricule]);
  const detectedInstitutionId = detection?.institution.id ?? "";

  useEffect(() => {
    if (detectedInstitutionId) {
      form.setValue("institution", detectedInstitutionId, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [detectedInstitutionId, form]);

  const { toast } = useToast();
  const router = useRouter();
  const handleSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      const redirect = await postRegister({ space: "etudiant", ...values });
      toast({
        title: "Compte créé avec succès !",
        description: "Complétez votre rattachement académique pour accéder à votre espace.",
      });
      onSuccess(redirect);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Inscription impossible.";
      toast({ title: "Inscription impossible", description: message, variant: "destructive" });
      setPending(false);
    }
  });

  const showManualSelect = !detection && matricule.trim().length >= 3;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          control={form.control}
          name="matricule"
          label="Numéro matricule"
          placeholder="20241045 ou IFRI-2026-089"
          icon={<IconIdBadge2 size={18} stroke={1.8} />}
          autoComplete="username"
        />

        {/* Badge de détection automatique de l'établissement */}
        <AnimatePresence mode="wait" initial={false}>
          {detection ? (
            <motion.div
              key="detection-ok"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-2.5 rounded-xl border border-brand/25 bg-brand/5 px-3.5 py-3"
            >
              <IconCircleCheck size={17} stroke={1.8} className="mt-0.5 shrink-0 text-brand" />
              <p className="text-[13px] leading-snug text-brand">
                <span className="font-bold">Détection automatique :</span>{" "}
                {detection.institution.name}
                {detection.institution.university
                  ? ` — ${detection.institution.university}`
                  : ""}
              </p>
            </motion.div>
          ) : matricule.trim().length >= 3 ? (
            <motion.div
              key="detection-unknown"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50 px-3.5 py-3"
            >
              <IconAlertTriangle size={17} stroke={1.8} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-[13px] leading-snug text-amber-700">
                <span className="font-bold">Établissement non reconnu.</span>{" "}
                Sélectionnez-le manuellement ci-dessous.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {showManualSelect ? (
          <SelectField
            control={form.control}
            name="institution"
            label="Établissement d'origine"
            placeholder="Sélectionnez votre établissement"
            options={INSTITUTIONS.map((i) => ({ value: i.id, label: i.name }))}
          />
        ) : null}

        <TextField
          control={form.control}
          name="fullName"
          label="Nom complet"
          placeholder="Prénom et nom (ex. Nadège Ahouansou)"
          icon={<IconUser size={18} stroke={1.8} />}
          autoComplete="name"
        />
        <TextField
          control={form.control}
          name="email"
          label="Email (personnel ou étudiant)"
          placeholder="prenom.nom@email.com"
          type="email"
          inputMode="email"
          icon={<IconMail size={18} stroke={1.8} />}
          autoComplete="email"
        />
        <PasswordField
          control={form.control}
          name="password"
          label="Mot de passe"
          autoComplete="new-password"
          strengthMeter
        />
        <PasswordField
          control={form.control}
          name="confirmPassword"
          label="Confirmer le mot de passe"
          autoComplete="new-password"
          placeholder="Ressaisissez votre mot de passe"
          rules={{
            validate: (value) =>
              value === form.getValues("password") || "Les mots de passe ne correspondent pas.",
          }}
        />
        <SubmitButton
          pending={pending}
          idleLabel="Créer mon compte étudiant gratuitement"
          pendingLabel="Création du compte…"
        />
      </form>
    </Form>
  );
}

/* ------------------------------------------------------------------ */
/*  B. Espace ENTREPRISE                                               */
/* ------------------------------------------------------------------ */

export function CompanyLoginForm({ onSuccess }: AuthFormProps) {
  const [pending, setPending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<CompanyLoginValues>({
    resolver: zodResolver(companyLoginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      const redirect = await postLogin({
        identifier: values.email,
        password: values.password,
        space: "entreprise",
      });
      toast({
        title: "Connexion réussie !",
        description: "Bienvenue sur votre portail entreprise StageTrack.",
      });
      onSuccess(redirect);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connexion impossible.";
      toast({ title: "Connexion impossible", description: message, variant: "destructive" });
      setPending(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          control={form.control}
          name="email"
          label="Email professionnel"
          placeholder="recrutement@entreprise.com"
          type="email"
          inputMode="email"
          icon={<IconMail size={18} stroke={1.8} />}
          autoComplete="email"
        />
        <PasswordField
          control={form.control}
          name="password"
          label="Mot de passe"
          autoComplete="current-password"
          placeholder="Votre mot de passe"
        />
        <div className="flex justify-end">
          <ForgotPasswordLink />
        </div>
        <SubmitButton
          pending={pending}
          idleLabel="Accéder au portail entreprise"
          pendingLabel="Connexion en cours…"
        />
      </form>
    </Form>
  );
}

export function CompanySignupForm({ onSuccess }: AuthFormProps) {
  const [pending, setPending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<CompanySignupValues>({
    resolver: zodResolver(companySignupSchema),
    mode: "onTouched",
    defaultValues: { companyName: "", sector: "", city: "", email: "", contactName: "", password: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      const redirect = await postRegister({ space: "entreprise", ...values });
      toast({
        title: "Espace entreprise créé !",
        description: "Complétez la vitrine de votre entreprise pour accéder à votre portail.",
      });
      onSuccess(redirect);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Inscription impossible.";
      toast({ title: "Inscription impossible", description: message, variant: "destructive" });
      setPending(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          control={form.control}
          name="companyName"
          label="Nom de l'entreprise"
          placeholder="Ex. KKiaPay SARL"
          icon={<IconBuildingSkyscraper size={18} stroke={1.8} />}
          autoComplete="organization"
        />
        <SelectField
          control={form.control}
          name="sector"
          label="Secteur d'activité"
          placeholder="Choisir un secteur"
          options={selectOptions(SECTEURS)}
        />
        <SelectField
          control={form.control}
          name="city"
          label="Ville"
          placeholder="Choisir une ville"
          options={selectOptions(VILLES)}
        />
        <TextField
          control={form.control}
          name="email"
          label="Email professionnel"
          placeholder="recrutement@entreprise.com"
          type="email"
          inputMode="email"
          icon={<IconMail size={18} stroke={1.8} />}
          autoComplete="email"
        />
        <TextField
          control={form.control}
          name="contactName"
          label="Nom du responsable RH / Tuteur"
          placeholder="Ex. Rodrigue Kpossou"
          icon={<IconUser size={18} stroke={1.8} />}
          autoComplete="name"
        />
        <PasswordField
          control={form.control}
          name="password"
          label="Mot de passe"
          autoComplete="new-password"
          strengthMeter
        />
        <SubmitButton
          pending={pending}
          idleLabel="Créer mon espace entreprise gratuitement"
          pendingLabel="Création de l'espace…"
        />
      </form>
    </Form>
  );
}

/* ------------------------------------------------------------------ */
/*  C. Espace UNIVERSITÉ / ENTITÉ                                      */
/* ------------------------------------------------------------------ */

export function UniversityLoginForm({ onSuccess }: AuthFormProps) {
  const [pending, setPending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<UniversityLoginValues>({
    resolver: zodResolver(universityLoginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      const redirect = await postLogin({
        identifier: values.email,
        password: values.password,
        space: "etablissement",
      });
      toast({
        title: "Connexion réussie !",
        description: "Bienvenue sur votre espace établissement StageTrack.",
      });
      onSuccess(redirect);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connexion impossible.";
      toast({ title: "Connexion impossible", description: message, variant: "destructive" });
      setPending(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          control={form.control}
          name="email"
          label="Email institutionnel"
          placeholder="stages@universite.bj"
          type="email"
          inputMode="email"
          icon={<IconMail size={18} stroke={1.8} />}
          autoComplete="email"
        />
        <PasswordField
          control={form.control}
          name="password"
          label="Mot de passe"
          autoComplete="current-password"
          placeholder="Votre mot de passe"
        />
        <div className="flex justify-end">
          <ForgotPasswordLink />
        </div>
        <SubmitButton
          pending={pending}
          idleLabel="Accéder à l'espace établissement"
          pendingLabel="Connexion en cours…"
        />
      </form>
    </Form>
  );
}

export function UniversitySignupForm({ onSuccess }: AuthFormProps) {
  const [pending, setPending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<UniversitySignupValues>({
    resolver: zodResolver(universitySignupSchema),
    mode: "onTouched",
    defaultValues: { institutionName: "", acronym: "", email: "", referentRole: "", password: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      const redirect = await postRegister({ space: "universite", ...values });
      toast({
        title: "Espace établissement créé !",
        description: "Complétez les paramètres de votre établissement pour accéder à votre portail.",
      });
      onSuccess(redirect);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Inscription impossible.";
      toast({ title: "Inscription impossible", description: message, variant: "destructive" });
      setPending(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          control={form.control}
          name="institutionName"
          label="Nom de l'université ou de l'école"
          placeholder="Ex. Université d'Abomey-Calavi"
          icon={<IconBuildingBank size={18} stroke={1.8} />}
          autoComplete="organization"
        />
        <TextField
          control={form.control}
          name="acronym"
          label="Code / Sigle de l'établissement"
          placeholder="Ex. IFRI, ENEAM, EPAC"
        />
        <TextField
          control={form.control}
          name="email"
          label="Email institutionnel"
          placeholder="stages@universite.bj"
          type="email"
          inputMode="email"
          icon={<IconMail size={18} stroke={1.8} />}
          autoComplete="email"
        />
        <SelectField
          control={form.control}
          name="referentRole"
          label="Fonction du référent"
          placeholder="Choisir une fonction"
          options={selectOptions(FONCTIONS_REFERENT)}
        />
        <PasswordField
          control={form.control}
          name="password"
          label="Mot de passe"
          autoComplete="new-password"
          strengthMeter
        />
        <SubmitButton
          pending={pending}
          idleLabel="Créer l'espace de mon établissement"
          pendingLabel="Création de l'espace…"
        />
      </form>
    </Form>
  );
}
