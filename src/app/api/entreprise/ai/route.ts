/**
 * API IA du Dashboard Entreprise — POST /api/entreprise/ai
 * Modes : chat | offre | missions | candidat | appreciation
 * Utilise Groq (openai/gpt-oss-120b / 20b) avec fallback local sécurisé.
 */
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";
import {
  groqChat,
  buildSystemMessage,
  offerPrompt,
  missionsPrompt,
  candidatePrompt,
  appreciationPrompt,
  GROQ_MODELS,
  type GroqTask,
} from "@/lib/groq";
import {
  offerFallback,
  missionsFallback,
  candidateFallback,
  appreciationFallback,
  CHAT_FALLBACK_NOTICE,
} from "@/lib/groq-fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chatSchema = z.object({
  mode: z.literal("chat"),
  model: z.string().min(2).max(80).optional(),
  message: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) }))
    .max(20)
    .optional(),
});

const offreSchema = z.object({
  mode: z.literal("offre"),
  payload: z.object({
    title: z.string().min(3).max(120),
    sector: z.string().max(60).optional(),
    city: z.string().max(60).optional(),
    duration: z.string().max(40).optional(),
  }),
});

const missionsSchema = z.object({
  mode: z.literal("missions"),
  payload: z.object({
    internName: z.string().min(2).max(80),
    position: z.string().min(2).max(120),
    currentWeek: z.number().int().min(1).max(52),
    totalWeeks: z.number().int().min(1).max(52),
  }),
});

const candidatSchema = z.object({
  mode: z.literal("candidat"),
  payload: z.object({
    studentName: z.string().min(2).max(80),
    position: z.string().min(2).max(120),
    university: z.string().min(2).max(80),
    matricule: z.string().min(2).max(40),
    cvSummary: z.string().min(2).max(2000),
    coverLetter: z.string().max(4000).nullable().optional(),
  }),
});

const appreciationSchema = z.object({
  mode: z.literal("appreciation"),
  payload: z.object({
    internName: z.string().min(2).max(80),
    position: z.string().min(2).max(120),
    university: z.string().min(2).max(80),
    technique: z.number().int().min(0).max(5),
    ponctualite: z.number().int().min(0).max(5),
    autonomie: z.number().int().min(0).max(5),
    espritEquipe: z.number().int().min(0).max(5),
  }),
});

const bodySchema = z.discriminatedUnion("mode", [
  chatSchema,
  offreSchema,
  missionsSchema,
  candidatSchema,
  appreciationSchema,
]);

/* ---------------------- Parsing des réponses ------------------------ */

const parseBlocks = (raw: string) => {
  const lines = raw.split("\n");
  const grab = (start: string, next?: string) => {
    const from = lines.findIndex((l) => l.trim().toUpperCase().startsWith(start));
    if (from === -1) return null;
    const to = next ? lines.findIndex((l, i) => i > from && l.trim().toUpperCase().startsWith(next)) : lines.length;
    return lines.slice(from + 1, to === -1 ? lines.length : to).join("\n").trim();
  };
  return {
    description: grab("DESCRIPTION:", "MISSIONS:"),
    missions: grab("MISSIONS:", "COMPETENCES:"),
    skills: grab("COMPETENCES:"),
    score: grab("SCORE:", "POINTS_FORTS:"),
    summary: grab("POINTS_FORTS:", "QUESTIONS:"),
    questions: grab("QUESTIONS:"),
  };
};

const toLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);

const toTasks = (raw: string) => {
  const lines = raw.split("\n");
  const tasks: Array<{ title: string; description: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.toUpperCase().startsWith("TITRE:") && i + 1 < lines.length) {
      const title = lines[i + 1].trim();
      const tIdx = lines.findIndex((l, j) => j > i + 1 && l.trim().toUpperCase().startsWith("TACHE:"));
      const description = tIdx > -1 && lines[tIdx + 1] ? lines[tIdx + 1].trim() : "";
      tasks.push({ title, description });
      i = tIdx > i ? tIdx : i + 1;
    }
  }
  return tasks;
};

/* ------------------------------ Route ------------------------------- */

export async function POST(req: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof z.ZodError ? error.issues[0]?.message ?? "Requête invalide" : "Requête invalide" },
      { status: 400 },
    );
  }

  const { mode } = parsed;

  // Fallback local déterministe — mode « secure » sans clé Groq
  const buildFallback = (): Record<string, unknown> => {
    switch (mode) {
      case "offre": {
        const fb = offerFallback(parsed.payload.title);
        return { description: fb.description, missions: fb.missions, skills: fb.skills, lines: { missions: toLines(fb.missions), skills: toLines(fb.skills) } };
      }
      case "missions": {
        const fb = missionsFallback(parsed.payload.internName, parsed.payload.position, parsed.payload.currentWeek);
        return { tasks: fb };
      }
      case "candidat": {
        const fb = candidateFallback(parsed.payload.studentName, parsed.payload.position, parsed.payload.university);
        return { score: fb.score, summary: fb.summary, questions: fb.questions, lines: { summary: toLines(fb.summary), questions: toLines(fb.questions) } };
      }
      case "appreciation": {
        const txt = appreciationFallback(parsed.payload.internName, parsed.payload.technique, parsed.payload.ponctualite, parsed.payload.autonomie, parsed.payload.espritEquipe);
        return { appreciation: txt };
      }
      case "chat":
      default:
        return { content: CHAT_FALLBACK_NOTICE };
    }
  };

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ ok: true, fallback: true, model: "Mode dégradé local", ...buildFallback() });
  }

  try {
    if (mode === "chat") {
      const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: buildSystemMessage("Vous dialoguez en direct avec le responsable RH d'une fintech à Cotonou.") },
        ...(parsed.history ?? []).map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: parsed.message },
      ];
      if (parsed.model && parsed.model !== GROQ_MODELS.complex.primary && parsed.model !== GROQ_MODELS.fast.primary) {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({ model: parsed.model, messages, temperature: 0.6, max_tokens: 1600 });
        const content = completion.choices[0]?.message?.content?.trim();
        if (!content) throw new Error("Réponse vide");
        return NextResponse.json({ ok: true, content, model: parsed.model });
      }
      const task: GroqTask = parsed.model === GROQ_MODELS.fast.primary ? "fast" : "complex";
      const { content, model } = await groqChat(task, messages);
      return NextResponse.json({ ok: true, content, model });
    }

    if (mode === "offre") {
      const { content, model } = await groqChat("complex", [
        { role: "system", content: buildSystemMessage("Vous générez des fiches d'offre de stage prêtes à publier.") },
        { role: "user", content: offerPrompt(parsed.payload) },
      ]);
      const blocks = parseBlocks(content);
      const missions = blocks.missions ?? offerFallback(parsed.payload.title).missions;
      const skills = blocks.skills ?? offerFallback(parsed.payload.title).skills;
      return NextResponse.json({
        ok: true, model,
        description: blocks.description ?? content,
        missions, skills,
        lines: { missions: toLines(missions), skills: toLines(skills) },
        raw: content,
      });
    }

    if (mode === "missions") {
      const { content, model } = await groqChat("fast", [
        { role: "system", content: buildSystemMessage("Vous générez des plans de missions hebdomadaires pour des stagiaires.") },
        { role: "user", content: missionsPrompt(parsed.payload) },
      ]);
      let tasks = toTasks(content);
      if (tasks.length === 0) tasks = missionsFallback(parsed.payload.internName, parsed.payload.position, parsed.payload.currentWeek);
      return NextResponse.json({ ok: true, model, tasks, raw: content });
    }

    if (mode === "candidat") {
      const { content, model } = await groqChat("complex", [
        { role: "system", content: buildSystemMessage("Vous analysez des candidatures de stage et produisez des scores et questions d'entretien.") },
        { role: "user", content: candidatePrompt(parsed.payload) },
      ]);
      const blocks = parseBlocks(content);
      const scoreNum = blocks.score ? parseInt(blocks.score.replace(/\D/g, ""), 10) : NaN;
      const score = Number.isFinite(scoreNum) ? Math.min(100, Math.max(0, scoreNum)) : 75;
      const summary = blocks.summary ?? content.slice(0, 400);
      const questions = blocks.questions ?? candidateFallback(parsed.payload.studentName, parsed.payload.position, parsed.payload.university).questions;
      return NextResponse.json({
        ok: true, model, score, summary, questions,
        lines: { summary: toLines(summary), questions: toLines(questions) },
        raw: content,
      });
    }

    // appreciation
    const { content, model } = await groqChat("complex", [
      { role: "system", content: buildSystemMessage("Vous rédigez les appréciations officielles de fin de stage des tuteurs.") },
      { role: "user", content: appreciationPrompt(parsed.payload) },
    ]);
    return NextResponse.json({ ok: true, model, appreciation: content.trim(), content: content.trim() });
  } catch (error) {
    // Groq indisponible (quota, réseau…) → repli local sécurisé
    console.error("Groq API error:", error instanceof Error ? error.message : error);
    return NextResponse.json({
      ok: true,
      fallback: true,
      model: "Mode dégradé local (Groq indisponible)",
      ...buildFallback(),
    });
  }
}
