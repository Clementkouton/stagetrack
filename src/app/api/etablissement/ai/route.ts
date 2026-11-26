/**
 * API IA du Dashboard Établissement — POST /api/etablissement/ai
 * Modes : chat (Copilote IA Académique) | fit (adéquation pédagogique) | cohort (rapport de synthèse)
 * Utilise Groq (openai/gpt-oss-120b / 20b) avec bascule automatique vers les
 * modèles de repli officiels Groq, puis vers un mode dégradé local sans clé.
 */
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";
import { groqChat, type GroqTask } from "@/lib/groq";
import {
  ETABLISSEMENT_SYSTEM_BASE,
  fitPrompt,
  fitFallback,
  cohortPrompt,
  cohortFallback,
  thesisPrompt,
  thesisFallback,
  copilotFallbackAnswer,
  COPILOT_FALLBACK_NOTICE,
  type FitPayload,
  type CohortPayload,
  type ThesisPayload,
} from "@/lib/groq-etablissement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chatSchema = z.object({
  mode: z.literal("chat"),
  message: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) }))
    .max(24)
    .optional(),
});

const fitSchema = z.object({
  mode: z.literal("fit"),
  payload: z.object({
    studentName: z.string().min(2).max(80),
    departmentName: z.string().min(2).max(120),
    specialty: z.string().min(2).max(80),
    level: z.string().min(2).max(40),
    position: z.string().min(2).max(140),
    companyName: z.string().min(1).max(90),
    missions: z.string().max(2000).optional(),
  }),
});

const cohortSchema = z.object({
  mode: z.literal("cohort"),
  payload: z.object({
    scopeLabel: z.string().min(2).max(140),
    departmentLabel: z.string().max(120).nullable().optional(),
    students: z.number().int().min(0).max(100000),
    placed: z.number().int().min(0).max(100000),
    searching: z.number().int().min(0).max(100000),
    activeInterns: z.number().int().min(0).max(100000),
    finishedInterns: z.number().int().min(0).max(100000),
    pendingVisas: z.number().int().min(0).max(100000),
    pendingSignatures: z.number().int().min(0).max(100000),
    averageEvaluation: z.number().min(0).max(5).nullable().optional(),
    rows: z
      .array(z.object({ label: z.string().max(60), placed: z.number().int().min(0), searching: z.number().int().min(0) }))
      .max(20),
  }),
});

const thesisSchema = z.object({
  mode: z.literal("thesis"),
  payload: z.object({
    studentName: z.string().min(2).max(80),
    level: z.string().max(40).optional(),
    specialty: z.string().min(2).max(80),
    companyName: z.string().min(1).max(90),
    position: z.string().max(140).optional(),
    thesisTitle: z.string().min(2).max(300),
    thesisTopic: z.string().min(2).max(4000),
    thesisPlan: z.string().max(4000).optional(),
  }),
});

const bodySchema = z.discriminatedUnion("mode", [chatSchema, fitSchema, cohortSchema, thesisSchema]);

/* --------------------------- Aides de parsing --------------------------- */

const grabBlock = (raw: string, header: string, next?: string): string | null => {
  const lines = raw.split("\n");
  const from = lines.findIndex((l) => l.trim().toUpperCase().startsWith(header));
  if (from === -1) return null;
  const to = next
    ? lines.findIndex((l, i) => i > from && l.trim().toUpperCase().startsWith(next))
    : lines.length;
  return lines
    .slice(from + 1, to === -1 ? lines.length : to)
    .join("\n")
    .trim();
};

const toLines = (text: string): string[] =>
  text
    .split("\n")
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);

/* -------------------------------- Route -------------------------------- */

export async function POST(req: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof z.ZodError ? error.issues[0]?.message ?? "Requête invalide" : "Requête invalide",
      },
      { status: 400 },
    );
  }

  /* ------- Mode dégradé local (sans clé Groq ou en cas d'erreur) ------- */
  const buildFallback = (): Record<string, unknown> => {
    switch (parsed.mode) {
      case "fit": {
        const payload: FitPayload = { ...parsed.payload, missions: parsed.payload.missions ?? "" };
        const fb = fitFallback(payload);
        return { score: fb.score, avis: fb.avis, favorable: fb.favorable, reco: fb.reco };
      }
      case "cohort": {
        const payload: CohortPayload = {
          ...parsed.payload,
          departmentLabel: parsed.payload.departmentLabel ?? null,
          averageEvaluation: parsed.payload.averageEvaluation ?? null,
        };
        return { report: cohortFallback(payload) };
      }
      case "thesis": {
        const payload: ThesisPayload = {
          ...parsed.payload,
          level: parsed.payload.level ?? "Master",
          position: parsed.payload.position ?? "Stagiaire",
          thesisPlan: parsed.payload.thesisPlan ?? "",
        };
        const fb = thesisFallback(payload);
        return { avis: fb.avis, questions: fb.questions, reco: fb.reco };
      }
      case "chat":
      default: {
        const message = "message" in parsed ? parsed.message : "";
        const isNotice = message.trim().length === 0;
        return { content: isNotice ? COPILOT_FALLBACK_NOTICE : copilotFallbackAnswer(message) };
      }
    }
  };

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ ok: true, fallback: true, model: "Mode dégradé local", ...buildFallback() });
  }

  try {
    if (parsed.mode === "chat") {
      const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `${ETABLISSEMENT_SYSTEM_BASE} Vous dialoguez en direct avec un membre de l'administration universitaire (Direction des Stages ou Chef de Département). Réponses conversationnelles de moins de 300 mots.`,
        },
        ...(parsed.history ?? []).map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: parsed.message },
      ];
      const { content, model } = await groqChat("fast" satisfies GroqTask, messages);
      return NextResponse.json({ ok: true, content, model });
    }

    if (parsed.mode === "fit") {
      const payload: FitPayload = { ...parsed.payload, missions: parsed.payload.missions ?? "" };
      const fb = fitFallback(payload);
      const { content, model } = await groqChat("complex", [
        { role: "system", content: `${ETABLISSEMENT_SYSTEM_BASE} Vous analysez l'adéquation pédagogique de sujets de stage pour les Chefs de Département.` },
        { role: "user", content: fitPrompt(payload) },
      ]);
      const scoreRaw = grabBlock(content, "SCORE:", "AVIS:")?.match(/\d{1,3}/)?.[0];
      const avis = grabBlock(content, "AVIS:", "RECO:") ?? fb.avis;
      const reco = toLines(grabBlock(content, "RECO:") ?? "");
      const score = scoreRaw ? Math.min(Math.max(parseInt(scoreRaw, 10), 0), 100) : fb.score;
      if (!avis || reco.length === 0) throw new Error("Format IA inattendu");
      return NextResponse.json({
        ok: true,
        model,
        score,
        avis,
        favorable: /favorable/i.test(avis) && score >= 65,
        reco: reco.length > 0 ? reco : fb.reco,
      });
    }

    if (parsed.mode === "thesis") {
      const payload: ThesisPayload = {
        ...parsed.payload,
        level: parsed.payload.level ?? "Master",
        position: parsed.payload.position ?? "Stagiaire",
        thesisPlan: parsed.payload.thesisPlan ?? "",
      };
      const fb = thesisFallback(payload);
      const { content, model } = await groqChat("complex", [
        { role: "system", content: `${ETABLISSEMENT_SYSTEM_BASE} Vous analysez des sujets de mémoire pour les Maîtres de Mémoire (validation de thème, Bon à Soutenir).` },
        { role: "user", content: thesisPrompt(payload) },
      ]);
      const avis = grabBlock(content, "AVIS:", "QUESTIONS:") ?? fb.avis;
      const questions = toLines(grabBlock(content, "QUESTIONS:", "RECO:") ?? "");
      const reco = toLines(grabBlock(content, "RECO:") ?? "");
      if (!avis || questions.length === 0) throw new Error("Format IA inattendu");
      return NextResponse.json({
        ok: true,
        model,
        avis,
        valable: /valable/i.test(avis),
        questions: questions.length > 0 ? questions : fb.questions,
        reco: reco.length > 0 ? reco : fb.reco,
      });
    }

    // parsed.mode === "cohort"
    const cohortPayload: CohortPayload = {
      ...parsed.payload,
      departmentLabel: parsed.payload.departmentLabel ?? null,
      averageEvaluation: parsed.payload.averageEvaluation ?? null,
    };
    const { content, model } = await groqChat("complex", [
      { role: "system", content: `${ETABLISSEMENT_SYSTEM_BASE} Vous rédigez des rapports de synthèse sur l'insertion en stage des cohortes universitaires.` },
      { role: "user", content: cohortPrompt(cohortPayload) },
    ]);
    if (!content || content.length < 80) throw new Error("Rapport IA trop court");
    return NextResponse.json({ ok: true, model, report: content.trim() });
  } catch (error) {
    console.error("Groq API error (etablissement):", error instanceof Error ? error.message : error);
    return NextResponse.json({
      ok: true,
      fallback: true,
      model: "Mode dégradé local (Groq indisponible)",
      ...buildFallback(),
    });
  }
}
