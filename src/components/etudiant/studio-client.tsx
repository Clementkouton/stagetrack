"use client";

/**
 * Module 4 (client) — Studio Carrière IA avec 3 onglets :
 *  1. Optimiseur de CV (analyse d'adéquation + résumé optimisé)
 *  2. Générateur de lettre de motivation (copiable en 1 clic)
 *  3. Simulateur d'entretien IA (chat interactif + évaluation finale)
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  IconCopy,
  IconLoader2,
  IconMessageChatbot,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconUserCircle,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export interface StudioOffer {
  id: string;
  title: string;
  company: string;
  city: string;
  missions: string[];
  skills: string[];
}

interface StudioStudent {
  fullName: string;
  schoolName: string;
  fieldOfStudy: string;
  level: string;
  skills: string[];
}

interface CvResult {
  missing: string[];
  resume: string;
  reco: string[];
  model: string;
  fallback: boolean;
}

interface EntretienMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  fallback?: boolean;
}

async function postAi<T>(body: Record<string, unknown>): Promise<{ data: T | null; error?: string }> {
  try {
    const res = await fetch("/api/etudiant/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as T & { ok?: boolean; error?: string };
    if (!res.ok || data.ok === false) return { data: null, error: data.error ?? "Service IA indisponible." };
    return { data };
  } catch {
    return { data: null, error: "Erreur réseau — vérifiez votre connexion." };
  }
}

export function StudioClient({ offers, student }: { offers: StudioOffer[]; student: StudioStudent }) {
  const { toast } = useToast();
  const [offerId, setOfferId] = useState<string>(offers[0]?.id ?? "");

  /* -------- Onglet 1 : Optimiseur de CV -------- */
  const [cvResult, setCvResult] = useState<CvResult | null>(null);
  const [cvLoading, setCvLoading] = useState(false);

  const runCvAnalysis = async () => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;
    setCvLoading(true);
    setCvResult(null);
    const { data, error } = await postAi<CvResult & { ok: boolean; error?: string }>({
      mode: "cv",
      payload: {
        offerTitle: offer.title,
        company: offer.company,
        offerSkills: offer.skills.join("\n"),
        studentSkills: student.skills,
        fieldOfStudy: student.fieldOfStudy,
        level: student.level,
        schoolName: student.schoolName,
      },
    });
    if (!data?.missing) {
      toast({ title: "Analyse impossible", description: error, variant: "destructive" });
    } else {
      setCvResult({ missing: data.missing, resume: data.resume, reco: data.reco, model: data.model, fallback: Boolean(data.fallback) });
    }
    setCvLoading(false);
  };

  /* -------- Onglet 2 : Générateur de lettre -------- */
  const [letter, setLetter] = useState("");
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterModel, setLetterModel] = useState<{ model: string; fallback: boolean } | null>(null);

  const runLetter = async () => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;
    setLetterLoading(true);
    const { data, error } = await postAi<{ letter: string; model: string; fallback?: boolean }>({
      mode: "lettre",
      payload: {
        company: offer.company,
        position: offer.title,
        city: offer.city,
        studentName: student.fullName,
        schoolName: student.schoolName,
        fieldOfStudy: student.fieldOfStudy,
        level: student.level,
        skills: student.skills,
        offerMissions: offer.missions.join("\n"),
      },
    });
    if (!data?.letter) {
      toast({ title: "Génération impossible", description: error, variant: "destructive" });
    } else {
      setLetter(data.letter);
      setLetterModel({ model: data.model, fallback: Boolean(data.fallback) });
    }
    setLetterLoading(false);
  };

  const copyText = async (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast({ title: label, description: "Copié dans le presse-papiers." });
  };

  /* -------- Onglet 3 : Simulateur d'entretien -------- */
  const [entretien, setEntretien] = useState<EntretienMessage[]>([]);
  const [entretienInput, setEntretienInput] = useState("");
  const [entretienLoading, setEntretienLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const entretienOfferId = useRef<string>("");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entretien, entretienLoading]);

  const resetEntretien = () => {
    setEntretien([]);
    setEntretienInput("");
    entretienOfferId.current = "";
  };

  const startEntretien = () => {
    if (!offers.find((o) => o.id === offerId)) return;
    entretienOfferId.current = offerId;
    void sendEntretien("", true);
  };

  const sendEntretien = async (message: string, starter = false) => {
    const offer = offers.find((o) => o.id === entretienOfferId.current || o.id === offerId);
    if (!offer || entretienLoading) return;
    const history: EntretienMessage[] = entretien.length > 16 ? [...entretien.slice(-16)] : [...entretien];
    if (!starter && message.trim()) {
      setEntretien((prev) => [...prev, { role: "user", content: message }]);
    }
    setEntretienLoading(true);
    const { data, error } = await postAi<{ content: string; model: string; fallback?: boolean }>({
      mode: "entretien",
      payload: {
        company: offer.company,
        position: offer.title,
        studentSkills: student.skills,
      },
      message: starter ? undefined : message,
      history: history.map((h) => ({ role: h.role, content: h.content })),
    });
    if (!data?.content) {
      toast({ title: "Simulation indisponible", description: error, variant: "destructive" });
    } else {
      setEntretien((prev) => [...prev, { role: "assistant", content: data.content, model: data.model, fallback: Boolean(data.fallback) }]);
    }
    setEntretienLoading(false);
  };

  const onEntretienSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = entretienInput.trim();
    if (!trimmed) return;
    setEntretienInput("");
    void sendEntretien(trimmed);
  };

  const selectedOffer = offers.find((o) => o.id === offerId);

  if (offers.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="py-12 text-center">
            <IconSparkles size={30} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-ink">Aucune offre disponible pour le Studio IA</p>
            <p className="mt-1 text-xs text-body">Le Studio analyse votre profil par rapport à une offre cible — revenez dès la publication d&apos;une nouvelle offre.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">Studio Carrière IA</h1>
        <p className="text-sm text-body">CV, lettres et entretiens propulsés par Groq — entraînez-vous comme si c&apos;était le vrai.</p>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Offre cible</p>
              <Select value={offerId} onValueChange={setOfferId}>
                <SelectTrigger className="mt-1.5 h-10 w-full rounded-xl text-sm" aria-label="Choisir l'offre cible">
                  <SelectValue placeholder="Choisir une offre" />
                </SelectTrigger>
                <SelectContent>
                  {offers.map((offer) => (
                    <SelectItem key={offer.id} value={offer.id} className="text-sm">
                      {offer.title} — {offer.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOffer ? (
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {selectedOffer.skills.slice(0, 5).map((skill) => (
                  <Badge key={skill} variant="secondary" className="rounded-md bg-brand-50 text-[10px] text-brand">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cv" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
          <TabsTrigger value="cv" className="gap-1.5 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-brand data-[state=active]:text-white sm:text-sm">
            <IconRefresh size={14} /> Optimiseur de CV
          </TabsTrigger>
          <TabsTrigger value="lettre" className="gap-1.5 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-brand data-[state=active]:text-white sm:text-sm">
            <IconSparkles size={14} /> Lettre de motivation
          </TabsTrigger>
          <TabsTrigger value="entretien" className="gap-1.5 rounded-lg py-2 text-xs font-semibold data-[state=active]:bg-brand data-[state=active]:text-white sm:text-sm">
            <IconMessageChatbot size={14} /> Simulateur d&apos;entretien
          </TabsTrigger>
        </TabsList>

        {/* --------------------------- Onglet CV --------------------------- */}
        <TabsContent value="cv" className="mt-4">
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-ink sm:text-base">Optimiseur de CV</h2>
                  <p className="text-xs text-body">Analyse des compétences manquantes et résumé optimisé pour « {selectedOffer?.title} ».</p>
                </div>
                <Button onClick={() => void runCvAnalysis()} disabled={cvLoading} className="h-9 gap-1.5 rounded-xl bg-gold text-xs font-bold text-brand hover:bg-gold-dark">
                  {cvLoading ? <IconLoader2 size={15} className="animate-spin" /> : <IconSparkles size={15} />}
                  Analyser avec Groq IA
                </Button>
              </div>

              {cvResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px]", cvResult.fallback ? "border-gold/40 bg-gold-50 text-gold-dark" : "border-brand/20 bg-brand-50 text-brand")}>
                      {cvResult.fallback ? "Mode dégradé local" : cvResult.model}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Compétences manquantes à travailler</p>
                    <ul className="mt-2 space-y-1.5">
                      {cvResult.missing.map((m) => (
                        <li key={m} className="flex items-start gap-2 rounded-lg border border-gold/25 bg-gold-50/60 px-3 py-1.5 text-sm text-body">
                          <IconTargetIcon /> {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Résumé de CV optimisé</p>
                      <Button size="sm" variant="ghost" onClick={() => void copyText(cvResult.resume, "Résumé copié")} className="h-7 gap-1 rounded-lg text-[11px] text-slate-400 hover:text-ink">
                        <IconCopy size={13} /> Copier
                      </Button>
                    </div>
                    <p className="mt-2 whitespace-pre-line rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-sm leading-relaxed text-body">{cvResult.resume}</p>
                  </div>
                  {cvResult.reco.length > 0 ? (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Recommandations du coach</p>
                      <ul className="mt-2 space-y-1.5">
                        {cvResult.reco.map((r) => (
                          <li key={r} className="flex items-start gap-2 text-sm leading-relaxed text-body">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" /> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-body">
                  Sélectionnez une offre cible puis lancez l&apos;analyse : le coach compare votre profil aux compétences demandées.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------- Onglet Lettre ------------------------- */}
        <TabsContent value="lettre" className="mt-4">
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-ink sm:text-base">Générateur de lettre de motivation</h2>
                  <p className="text-xs text-body">Personnalisée selon l&apos;entreprise, le poste et vos compétences réelles.</p>
                </div>
                <Button onClick={() => void runLetter()} disabled={letterLoading} className="h-9 gap-1.5 rounded-xl bg-gold text-xs font-bold text-brand hover:bg-gold-dark">
                  {letterLoading ? <IconLoader2 size={15} className="animate-spin" /> : <IconSparkles size={15} />}
                  Générer avec Groq IA
                </Button>
              </div>
              {letterModel ? (
                <Badge variant="outline" className={cn("text-[10px]", letterModel.fallback ? "border-gold/40 bg-gold-50 text-gold-dark" : "border-brand/20 bg-brand-50 text-brand")}>
                  {letterModel.fallback ? "Mode dégradé local" : letterModel.model}
                </Badge>
              ) : null}
              <Textarea
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                rows={16}
                placeholder="Cliquez sur « Générer avec Groq IA » — la lettre apparaîtra ici et restera entièrement modifiable."
                className="resize-none text-sm leading-relaxed"
                aria-label="Lettre de motivation générée"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void copyText(letter, "Lettre copiée")} disabled={!letter.trim()} className="h-9 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark">
                  <IconCopy size={15} /> Copier en 1 clic
                </Button>
                <p className="flex items-center text-[11px] text-slate-400">Relisez toujours la lettre avant envoi : remplacez les détails que l&apos;IA a pu supposer.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------ Onglet Entretien ------------------------ */}
        <TabsContent value="entretien" className="mt-4">
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-ink sm:text-base">Simulateur d&apos;entretien IA</h2>
                  <p className="text-xs text-body">Un recruteur IA interroge votre profil pour « {selectedOffer?.title} » et évalue vos réponses.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={startEntretien} disabled={entretienLoading} className="h-9 gap-1.5 rounded-xl bg-brand text-xs font-semibold text-white hover:bg-brand-dark">
                    <IconMessageChatbot size={15} /> Démarrer
                  </Button>
                  <Button onClick={resetEntretien} variant="outline" disabled={entretienLoading} className="h-9 rounded-xl text-xs">
                    <IconRefresh size={15} /> Réinitialiser
                  </Button>
                </div>
              </div>

              <div ref={scrollRef} className="mt-4 max-h-[420px] min-h-[280px] space-y-3 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                {entretien.length === 0 && !entretienLoading ? (
                  <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
                    <IconUserCircle size={34} className="text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-ink">Prêt(e) pour un entretien blanc ?</p>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-body">
                      Le recruteur IA posera des questions techniques, RH et de mise en situation, notera vos réponses et vous donnera une évaluation finale (écrivez « terminer » pour l&apos;obtenir).
                    </p>
                  </div>
                ) : (
                  entretien.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                      <div
                        className={cn(
                          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                          m.role === "user"
                            ? "rounded-br-sm bg-brand text-white"
                            : "rounded-bl-sm border border-slate-200/80 bg-white text-body",
                        )}
                      >
                        {m.role === "assistant" ? (
                          <div className="prose-sm [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-ink [&_h1]:text-sm [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-ink [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-ink">
                            <span className="sr-only">Recruteur IA :</span>
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}
                        {m.role === "assistant" && m.model ? (
                          <div className="mt-2 border-t border-slate-100 pt-1.5">
                            <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", m.fallback ? "border-gold/40 bg-gold-50 text-gold-dark" : "border-brand/20 bg-brand-50 text-brand")}>
                              {m.fallback ? "Mode dégradé local" : m.model}
                            </Badge>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
                {entretienLoading ? (
                  <div className="flex items-center gap-2 text-sm text-body">
                    <IconLoader2 size={16} className="animate-spin text-brand" /> Le recruteur analyse votre réponse…
                  </div>
                ) : null}
              </div>

              <form onSubmit={onEntretienSubmit} className="mt-3 flex items-end gap-2">
                <Textarea
                  value={entretienInput}
                  onChange={(e) => setEntretienInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onEntretienSubmit(e);
                    }
                  }}
                  rows={2}
                  placeholder="Répondez au recruteur… (écrivez « terminer » pour l'évaluation finale)"
                  className="min-h-[44px] flex-1 resize-none text-sm"
                  aria-label="Réponse à l'entretien simulé"
                />
                <Button type="submit" size="icon" disabled={entretienLoading || !entretienInput.trim()} className="h-11 w-11 shrink-0 rounded-xl bg-brand hover:bg-brand-dark" aria-label="Envoyer la réponse">
                  {entretienLoading ? <IconLoader2 size={17} className="animate-spin" /> : <IconSend size={17} />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IconTargetIcon() {
  return <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-dark" aria-hidden />;
}
