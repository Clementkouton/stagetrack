"use client";

/**
 * Paramètres — édition de la vitrine entreprise + gestion de l'équipe
 * (Administrateurs RH vs Tuteurs de stage).
 */
import { useState, useTransition, type FormEvent } from "react";
import {
  IconBuildingSkyscraper,
  IconLoader2,
  IconMail,
  IconPhone,
  IconShieldCheck,
  IconTrash,
  IconUserPlus,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addTeamMember, removeTeamMember, saveCompanyProfile } from "@/app/entreprise/actions";

export interface CompanyProfile {
  name: string;
  sector: string;
  city: string;
  description: string;
  website: string;
}

export interface TeamRow {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  active: boolean;
}

const SECTORS = [
  "Fintech / Paiements mobiles",
  "Informatique & IA",
  "Finance & Banque",
  "Marketing Digital",
  "Gestion de Projet",
  "Télécoms & Réseaux",
];

export function ParametresClient({
  profile,
  team,
}: {
  profile: CompanyProfile;
  team: TeamRow[];
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(profile);
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  const submitProfile = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveCompanyProfile({
        name: form.name,
        sector: form.sector,
        city: form.city,
        description: form.description,
        website: form.website,
      });
      if (result.ok) {
        toast({ title: "Vitrine enregistrée", description: "Les informations de votre entreprise ont été mises à jour." });
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    });
  };

  const remove = (member: TeamRow) => {
    startTransition(async () => {
      const result = await removeTeamMember(member.id);
      if (result.ok) {
        toast({ title: "Membre retiré", description: `${member.name} a été retiré de l'équipe.` });
      } else {
        toast({ title: "Suppression refusée", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Paramètres &amp; Équipe</h1>
        <p className="mt-1 text-sm text-body">
          Éditez la vitrine de votre entreprise visible par les étudiants et gérez vos tuteurs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Vitrine */}
        <Card className="border-slate-200/80 rounded-xl bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <IconBuildingSkyscraper size={18} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">Vitrine entreprise</h2>
                <p className="text-[11px] text-body">Informations affichées sur vos offres de stage</p>
              </div>
            </div>
            <form onSubmit={submitProfile} className="mt-4 space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="co-name">Nom de l&apos;entreprise</Label>
                <Input id="co-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Secteur d&apos;activité</Label>
                  <Select value={form.sector} onValueChange={(v) => setForm((f) => ({ ...f, sector: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="co-city">Ville</Label>
                  <Input id="co-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-web">Site web (optionnel)</Label>
                <Input id="co-web" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-desc">Description (vitrine)</Label>
                <Textarea
                  id="co-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  required
                />
                <p className="text-[11px] text-slate-400">Minimum 30 caractères. Présentez votre mission, vos produits et votre culture d&apos;équipe.</p>
              </div>
              <Button type="submit" disabled={pending} className="w-full gap-2 rounded-xl bg-brand hover:bg-brand-dark sm:w-auto">
                {pending && <IconLoader2 size={15} className="animate-spin" />}
                Enregistrer la vitrine
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Équipe */}
        <Card className="border-slate-200/80 rounded-xl bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <IconUsersGroup size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink">Équipe &amp; tuteurs</h2>
                  <p className="text-[11px] text-body">{team.length} membre(s) — RH et tuteurs de stage</p>
                </div>
              </div>
              <Button size="sm" onClick={() => setAddOpen(true)} className="h-8 gap-1.5 rounded-lg bg-brand text-xs hover:bg-brand-dark">
                <IconUserPlus size={14} />
                Ajouter
              </Button>
            </div>

            <div className="mt-4 space-y-2.5">
              {team.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3.5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-gold">
                      {member.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-semibold text-ink">{member.name}</p>
                        {member.role === "ADMIN_RH" ? (
                          <Badge variant="outline" className="border-gold/40 bg-gold-50 text-[9px] font-bold text-gold-dark">
                            <IconShieldCheck size={10} className="mr-0.5" />
                            Admin RH
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-brand/25 bg-brand-50 text-[9px] font-bold text-brand">
                            Tuteur de stage
                          </Badge>
                        )}
                      </div>
                      <p className="flex items-center gap-1.5 text-[11px] text-body">
                        <IconMail size={11} />
                        {member.email}
                        {member.phone ? (
                          <>
                            <span className="text-slate-300">·</span>
                            <IconPhone size={11} />
                            {member.phone}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-slate-400 hover:text-destructive"
                    aria-label={`Retirer ${member.name}`}
                    onClick={() => remove(member)}
                  >
                    <IconTrash size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog ajout membre */}
      <AddMemberDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function AddMemberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN_RH" | "TUTEUR">("TUTEUR");
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await addTeamMember({ name, email, role, phone });
      if (result.ok) {
        toast({ title: "Membre ajouté", description: `${name} fait désormais partie de votre équipe.` });
        setName("");
        setEmail("");
        setPhone("");
        setRole("TUTEUR");
        onClose();
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-ink">Ajouter un membre</DialogTitle>
          <DialogDescription>
            Les administrateurs RH gèrent les offres et le recrutement ; les tuteurs suivent les stagiaires en poste.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="tm-name">Nom complet</Label>
            <Input id="tm-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="ex. Aïcha Kponou" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-email">Email professionnel</Label>
            <Input id="tm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="prenom.nom@kkiapay.me" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "ADMIN_RH" | "TUTEUR")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TUTEUR">Tuteur de stage</SelectItem>
                  <SelectItem value="ADMIN_RH">Administrateur RH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-phone">Téléphone (optionnel)</Label>
              <Input id="tm-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+229 …" />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Annuler</Button>
            <Button type="submit" disabled={pending} className="gap-2 rounded-xl bg-brand hover:bg-brand-dark">
              {pending && <IconLoader2 size={15} className="animate-spin" />}
              Ajouter le membre
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
