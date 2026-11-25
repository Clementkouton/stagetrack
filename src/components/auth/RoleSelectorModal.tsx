"use client";

/**
 * Modale réutilisable <RoleSelectorModal /> :
 * s'ouvre au clic sur « Se connecter » ou « Rejoindre gratuitement ».
 * Contient le flux complet AuthFlow (sélecteur de rôle → connexion / inscription).
 */

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { AuthMode } from "@/lib/auth";
import { AuthFlow } from "./AuthFlow";

export interface RoleSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mode présélectionné : "connexion" (Se connecter) ou "inscription" (Rejoindre gratuitement). */
  defaultMode?: AuthMode;
}

export function RoleSelectorModal({
  open,
  onOpenChange,
  defaultMode = "connexion",
}: RoleSelectorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-3xl border-slate-200/80 bg-white p-0 shadow-2xl shadow-brand/25 sm:max-w-xl [&>button]:rounded-full [&>button]:border [&>button]:border-slate-200 [&>button]:bg-white/90 [&>button]:shadow-sm [&>button]:backdrop-blur">
        <DialogTitle className="sr-only">
          Connexion à votre espace StageTrack — sélection de profil
        </DialogTitle>
        <DialogDescription className="sr-only">
          Sélectionnez votre profil (étudiant, entreprise ou université) puis connectez-vous
          ou créez votre compte gratuit.
        </DialogDescription>
        <AuthFlow variant="modal" initialMode={defaultMode} onComplete={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
