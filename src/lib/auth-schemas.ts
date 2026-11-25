/**
 * Schémas de validation (Zod) du système d'authentification StageTrack.
 * Tous les messages d'erreur sont en français.
 */

import { z } from "zod";

/* ------------------------------- Champs ------------------------------- */

const matriculeSchema = z
  .string()
  .trim()
  .min(3, "Le numéro matricule doit contenir au moins 3 caractères.")
  .max(24, "Le numéro matricule ne peut pas dépasser 24 caractères.")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9-]*$/,
    "Format invalide : lettres, chiffres et tirets uniquement (ex. 20241045 ou IFRI-2026-089).",
  );

const emailSchema = z.email("Veuillez saisir une adresse email valide.");

const loginPasswordSchema = z.string().min(1, "Veuillez saisir votre mot de passe.");

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.");

/* ------------------------------- Étudiant ------------------------------ */

export const studentLoginSchema = z.object({
  matricule: matriculeSchema,
  password: loginPasswordSchema,
});

export const studentSignupSchema = z.object({
  matricule: matriculeSchema,
  institution: z.string().min(1, "Veuillez confirmer votre établissement d'origine."),
  fullName: z.string().trim().min(3, "Veuillez saisir votre nom complet (prénom et nom)."),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Veuillez confirmer votre mot de passe."),
});

/* ------------------------------ Entreprise ----------------------------- */

export const companyLoginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const companySignupSchema = z.object({
  companyName: z.string().trim().min(2, "Veuillez saisir le nom de votre entreprise."),
  sector: z.string().min(1, "Veuillez sélectionner un secteur d'activité."),
  city: z.string().min(1, "Veuillez sélectionner une ville."),
  email: emailSchema,
  contactName: z
    .string()
    .trim()
    .min(3, "Veuillez saisir le nom du responsable RH ou du tuteur."),
  password: passwordSchema,
});

/* -------------------------- Université / Entité ------------------------ */

export const universityLoginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const universitySignupSchema = z.object({
  institutionName: z
    .string()
    .trim()
    .min(3, "Veuillez saisir le nom de l'université ou de l'école."),
  acronym: z
    .string()
    .trim()
    .regex(
      /^[A-Z]{2,10}$/,
      "Sigle invalide : 2 à 10 lettres majuscules (ex. IFRI, ENEAM, EPAC).",
    ),
  email: emailSchema,
  referentRole: z.string().min(1, "Veuillez sélectionner la fonction du référent."),
  password: passwordSchema,
});

/* ------------------------------ Types inférés -------------------------- */

export type StudentLoginValues = z.infer<typeof studentLoginSchema>;
export type StudentSignupValues = z.infer<typeof studentSignupSchema>;
export type CompanyLoginValues = z.infer<typeof companyLoginSchema>;
export type CompanySignupValues = z.infer<typeof companySignupSchema>;
export type UniversityLoginValues = z.infer<typeof universityLoginSchema>;
export type UniversitySignupValues = z.infer<typeof universitySignupSchema>;
