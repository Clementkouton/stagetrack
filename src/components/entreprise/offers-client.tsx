"use client";

/**
 * Offres de stage — tableau de gestion + modale de création avec génération IA Groq.
 */
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import {
  IconBrandSpeedtest,
  IconDotsVertical,
  IconEditOff,
  IconLoader2,
  IconMapPin,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconUsers,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createOffer, deleteOffer, updateOfferStatus } from "@/app/entreprise/actions";
import { CITIES, SECTORS } from "@/lib/stagetrack-data";
import { cn } from "@/lib/utils";

export interface OfferRow {
  id: string;
  title: string;
  sector: string;
  city: string;
  duration: string;
  workMode: string;
  contractType: string;
  gratification: string | null;
  status: string;
  aiGenerated: boolean;
  candidateCount: number;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  PUBLIEE: "Publiée",
  BROUILLON: "Brouillon",
  POURVUE: "Pourvue",
};

const STATUS_CLASS: Record<string, string> = {
  PUBLIEE: "border-emerald-700/30 bg-emerald-700/10 text-emerald-800",
  BROUILLON: "border-slate-300 bg-slate-100 text-slate-600",
  POURVUE: "border-gold/40 bg-gold-50 text-gold-dark",
};

const WORK_MODE_LABEL: Record<string, string> = {
  SUR_SITE: "Sur site",
  HYBRIDE: "Hybride",
  TELETRAVAIL: "Télétravail",
};

const CONTRACT_LABEL: Record<string, string> = {
  STAGE_ACADEMIQUE: "Stage académique",
  PRE_EMBAUCHE: "Pré-embauche",
};

const DURATIONS = ["1 mois", "2 mois", "3 mois", "4 mois", "6 mois", "9 mois"];
const sectorOptions = SECTORS.filter((s) => s !== "Tous les secteurs");
const cityOptions = CITIES.filter((c) => c !== "Toutes les villes");

interface GenResult {
  ok: boolean;
  error?: string;
  description?: string;
  missions?: string;
  skills?: string;
  fallback?: boolean;
  model?: string;
}

function CreateOfferDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [genNotice, setGenNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    sector: "",
    city: "",
    duration: "",
    workMode: "SUR_SITE",
    contractType: "STAGE_ACADEMIQUE",
    gratification: "60 000 FCFA / mois",
    description: "",
    missions: "",
    skills: "",
    status: "PUBLIEE",
    aiGenerated: false,
  });

  useEffect(() => {
    if (!open) {
      setGenNotice(null);
      setForm({
        title: "", sector: "", city: "", duration: "", workMode: "SUR_SITE",
        contractType: "STAGE_ACADEMIQUE", gratification: "60 000 FCFA / mois",
        description: "", missions: "", skills: "", status: "PUBLIEE", aiGenerated: false,
      });
    }
  }, [open]);

  const generateWithAi = async () => {
    if (form.title.trim().length < 5) {
      toast({ title: "Titre requis", description: "Saisissez d'abord un titre (ex. « Stagiaire Développeur Next.js »).", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setGenNotice(null);
    try {
      const res = await fetch("/api/entreprise/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "offre",
          payload: { title: form.title, sector: form.sector || undefined, city: form.city || undefined, duration: form.duration || undefined },
        }),
      });
      const data = (await res.json()) as GenResult;
      if (!res.ok || !data.ok) {
        toast({ title: "Génération IA impossible", description: data.error ?? "Erreur du service IA.", variant: "destructive" });
        return;
      }
      setForm((f) => ({
        ...f,
        description: data.description ?? f.description,
        missions: data.missions ?? f.missions,
        skills: data.skills ?? f.skills,
        aiGenerated: true,
      }));
      setGenNotice(
        data.fallback
          ? "Contenu généré en mode dégradé local (GROQ_API_KEY absente). Relisez et ajustez si besoin."
          : `Contenu généré par ${data.model ?? "Groq"} — relisez avant publication.`,
      );
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible de contacter l'API IA.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      sector: form.sector,
      city: form.city,
      duration: form.duration,
      workMode: form.workMode,
      contractType: form.contractType,
      gratification: form.gratification,
      description: form.description,
      missions: form.missions.split("\n").map((l) => l.replace(/^[-•*\s]+/, "").trim()).filter(Boolean),
      skills: form.skills.split("\n").map((l) => l.replace(/^[-•*\s]+/, "").trim()).filter(Boolean),
      status: form.status as "PUBLIEE" | "BROUILLON" | "POURVUE",
      aiGenerated: form.aiGenerated,
    };
    startTransition(async () => {
      const result = await createOffer(payload);
      if (result.ok) {
        toast({ title: "Offre créée", description: `« ${form.title} » a été ${form.status === "PUBLIEE" ? "publiée" : "enregistrée en brouillon"}.` });
        onOpenChange(false);
      } else {
        toast({ title: "Formulaire incomplet", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-ink">Créer une offre de stage</DialogTitle>
        <DialogDescription>
          Renseignez le titre puis laissez l&apos;IA Groq rédiger la description, les missions et les compétences.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="offer-title">Titre du poste</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="offer-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="ex. Stagiaire Développeur Next.js"
              className="flex-1"
              required
            />
            <Button
              type="button"
              onClick={() => void generateWithAi()}
              disabled={generating}
              className="h-9 shrink-0 gap-1.5 rounded-xl bg-gold px-3 text-xs font-bold text-brand shadow-sm hover:bg-gold-dark"
            >
              {generating ? <IconLoader2 size={15} className="animate-spin" /> : <IconSparkles size={15} />}
              {generating ? "Génération…" : "✨ Générer avec Groq IA"}
            </Button>
          </div>
        </div>

        {genNotice ? (
          <p className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            genNotice.includes("dégradé")
              ? "border-gold/40 bg-gold-50 text-gold-dark"
              : "border-brand/25 bg-brand-50 text-brand",
          )}>
            {genNotice}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Secteur d&apos;activité</Label>
            <Select value={form.sector} onValueChange={(v) => setForm((f) => ({ ...f, sector: v }))}>
              <SelectTrigger><SelectValue placeholder="Choisir un secteur" /></SelectTrigger>
              <SelectContent>
                {sectorOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ville</Label>
            <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
              <SelectTrigger><SelectValue placeholder="Choisir une ville" /></SelectTrigger>
              <SelectContent>
                {cityOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Durée</Label>
            <Select value={form.duration} onValueChange={(v) => setForm((f) => ({ ...f, duration: v }))}>
              <SelectTrigger><SelectValue placeholder="Durée du stage" /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mode de travail</Label>
            <Select value={form.workMode} onValueChange={(v) => setForm((f) => ({ ...f, workMode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SUR_SITE">Sur site</SelectItem>
                <SelectItem value="HYBRIDE">Hybride</SelectItem>
                <SelectItem value="TELETRAVAIL">Télétravail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type de stage</Label>
            <Select value={form.contractType} onValueChange={(v) => setForm((f) => ({ ...f, contractType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STAGE_ACADEMIQUE">Stage académique</SelectItem>
                <SelectItem value="PRE_EMBAUCHE">Pré-embauche</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-grat">Gratification (optionnel)</Label>
            <Input
              id="offer-grat"
              value={form.gratification}
              onChange={(e) => setForm((f) => ({ ...f, gratification: e.target.value }))}
              placeholder="60 000 FCFA / mois"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="offer-desc">Description</Label>
          <Textarea
            id="offer-desc"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="Accroche motivante du poste…"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="offer-missions">Missions (une par ligne)</Label>
            <Textarea
              id="offer-missions"
              value={form.missions}
              onChange={(e) => setForm((f) => ({ ...f, missions: e.target.value }))}
              rows={5}
              placeholder={"Développer des composants React\nConnecter l'API REST\nÉcrire des tests"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-skills">Compétences requises (une par ligne)</Label>
            <Textarea
              id="offer-skills"
              value={form.skills}
              onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
              rows={5}
              placeholder={"React\nTypeScript\nGit"}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Publication</Label>
          <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIEE">Publier immédiatement</SelectItem>
              <SelectItem value="BROUILLON">Enregistrer en brouillon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Annuler
          </Button>
          <Button type="submit" disabled={isPending} className="gap-2 rounded-xl bg-brand hover:bg-brand-dark">
            {isPending && <IconLoader2 size={15} className="animate-spin" />}
            Créer l&apos;offre
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function OffersClient({
  offers,
  autoOpen,
}: {
  offers: OfferRow[];
  autoOpen: boolean;
}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(autoOpen);
  const [, startTransition] = useTransition();

  const counts = useMemo(() => {
    const publiees = offers.filter((o) => o.status === "PUBLIEE").length;
    const candidatures = offers.reduce((sum, o) => sum + o.candidateCount, 0);
    return { publiees, candidatures, total: offers.length };
  }, [offers]);

  const changeStatus = (offer: OfferRow, status: "PUBLIEE" | "BROUILLON" | "POURVUE") => {
    startTransition(async () => {
      const result = await updateOfferStatus(offer.id, status);
      if (result.ok) {
        toast({ title: "Statut mis à jour", description: `« ${offer.title} » est désormais ${STATUS_LABEL[status].toLowerCase()}.` });
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    });
  };

  const remove = (offer: OfferRow) => {
    startTransition(async () => {
      const result = await deleteOffer(offer.id);
      if (result.ok) {
        toast({ title: "Offre supprimée", description: `« ${offer.title} » a été supprimée.` });
      } else {
        toast({ title: "Suppression refusée", description: result.error, variant: "destructive" });
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Offres de stage</h1>
          <p className="mt-1 text-sm text-body">
            {counts.publiees} publiée(s) · {counts.candidatures} candidature(s) reçue(s) sur {counts.total} offre(s)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 gap-2 rounded-xl bg-brand px-4 text-sm font-semibold hover:bg-brand-dark">
              <IconPlus size={17} />
              Nouvelle offre
            </Button>
          </DialogTrigger>
          <CreateOfferDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </Dialog>
      </div>

      <Card className="border-slate-200/80 rounded-xl bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="min-w-[240px] text-xs font-bold uppercase tracking-wide text-slate-500">Offre</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wide text-slate-500">Secteur</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wide text-slate-500">Localisation</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wide text-slate-500">Durée</TableHead>
                  <TableHead className="text-center text-xs font-bold uppercase tracking-wide text-slate-500">Candidats</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wide text-slate-500">Statut</TableHead>
                  <TableHead className="w-12" aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-body">
                      Aucune offre pour le moment. Cliquez sur « Nouvelle offre » pour publier votre premier stage.
                    </TableCell>
                  </TableRow>
                ) : (
                  offers.map((offer) => (
                    <TableRow key={offer.id} className="hover:bg-slate-50/60">
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <div>
                            <p className="font-semibold text-ink">{offer.title}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-body">
                              <span>{CONTRACT_LABEL[offer.contractType] ?? offer.contractType}</span>
                              <span>·</span>
                              <span>{WORK_MODE_LABEL[offer.workMode] ?? offer.workMode}</span>
                              {offer.gratification ? (
                                <>
                                  <span>·</span>
                                  <span>{offer.gratification}</span>
                                </>
                              ) : null}
                            </p>
                          </div>
                          {offer.aiGenerated ? (
                            <Badge variant="outline" className="shrink-0 border-gold/40 bg-gold-50 text-[10px] font-bold text-gold-dark">
                              IA
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-body">{offer.sector}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm text-body">
                          <IconMapPin size={13} className="text-brand" />
                          {offer.city}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-body">{offer.duration}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                          <IconUsers size={14} className="text-brand" />
                          {offer.candidateCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={cn("text-[11px] font-bold", STATUS_CLASS[offer.status])}>
                            {STATUS_LABEL[offer.status] ?? offer.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-body" aria-label={`Actions pour ${offer.title}`}>
                              <IconDotsVertical size={15} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => changeStatus(offer, "PUBLIEE")} className="gap-2">
                              <IconBrandSpeedtest size={14} />
                              Publier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeStatus(offer, "POURVUE")} className="gap-2">
                              <IconUsers size={14} />
                              Marquer pourvue
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeStatus(offer, "BROUILLON")} className="gap-2">
                              <IconEditOff size={14} />
                              Repasser en brouillon
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => remove(offer)} className="gap-2 text-destructive focus:text-destructive">
                              <IconTrash size={14} />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
