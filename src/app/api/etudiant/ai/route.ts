/**
 * API IA du Dashboard Étudiant — POST /api/etudiant/ai
 * Modes : chat (Coach Carrière) | cv | lettre | entretien | relance | journal
 * Utilise Groq (openai/gpt-oss-120b / 20b) avec bascule automatique vers les
 * modèles de repli officiels Groq, puis vers un mode dégradé local sans clé.
 */
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";
import { groqChat, type GroqTask } from "@/lib/groq";
import {
  STUDENT_SYSTEM_BASE,
  cvPrompt,
  lettrePrompt,
  entretienSystemPrompt,
  relancePrompt,
  journalPrompt,
  cvFallback,
  lettreFallback,
  relanceFallback,
  journalFallback,
  COACH_FALLBACK_NOTICE,
  ENTRETIEN_STARTER_FALLBACK,
  entretienFeedbackFallback,
  entretienFinalFallback,
  type CvPayload,
  type LettrePayload,
  type RelancePayload,
  type JournalPayload,
} from "@/lib/groq-etudiant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chatSchema = z.object({
  mode: z.literal("chat"),
  model: z.string().min(2).max(80).optional(),
  message: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) }))
    .max(24)
    .optional(),
});

const entretienSchema = z.object({
  mode: z.literal("entretien"),
  payload: z.object({
    company: z.string().min(1).max(80),
    position: z.string().min(2).max(120),
    studentSkills: z.array(z.string().max(40)).max(15),
  }),
  message: z.string().max(4000).optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) }))
    .max(24)
    .optional(),
});

const cvSchema = z.object({
  mode: z.literal("cv"),
  payload: z.object({
    offerTitle: z.string().min(2).max(120),
    company: z.string().min(1).max(80),
    offerSkills: z.string().max(1200),
    studentSkills: z.array(z.string().max(40)).max(15),
    fieldOfStudy: z.string().max(80),
    level: z.string().max(40),
    schoolName: z.string().max(120),
  }),
});

const lettreSchema = z.object({
  mode: z.literal("lettre"),
  payload: z.object({
    company: z.string().min(1).max(80),
    position: z.string().min(2).max(120),
    city: z.string().max(60),
    studentName: z.string().min(2).max(80),
    schoolName: z.string().max(120),
    fieldOfStudy: z.string().max(80),
    level: z.string().max(40),
    skills: z.array(z.string().max(40)).max(15),
    offerMissions: z.string().max(1500),
  }),
});

const relanceSchema = z.object({
  mode: z.literal("relance"),
  payload: z.object({
    company: z.string().min(1).max(80),
    position: z.string().min(2).max(120),
    statusLabel: z.string().min(2).max(40),
    daysSince: z.number().int().min(0).max(365),
    studentName: z.string().min(2).max(80),
  }),
});

const journalSchema = z.object({
  mode: z.literal("journal"),
  payload: z.object({
    week: z.number().int().min(1).max(52),
    totalWeeks: z.number().int().min(1).max(52),
    position: z.string().min(2).max(120),
    rawNotes: z.string().min(5).max(3000),
  }),
});

const bodySchema = z.discriminatedUnion("mode", [
  chatSchema,
  entretienSchema,
  cvSchema,
  lettreSchema,
  relanceSchema,
  journalSchema,
]);

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

const splitEmail = (raw: string): { subject: string; body: string } => {
  const normalized = raw.replace(/\*\*/g, "").trim();
  const objetIdx = normalized.toUpperCase().indexOf("OBJET");
  if (objetIdx === -1) return { subject: "Relance — candidature de stage", body: normalized };
  const afterObjet = normalized.slice(objetIdx);
  const newline = afterObjet.indexOf("\n");
  const subjectRaw = newline === -1 ? afterObjet : afterObjet.slice(0, newline);
  const subject = subjectRaw.replace(/^OBJET\s*[:\-]?\s*/i, "").trim() || "Relance — candidature de stage";
  const body = (newline === -1 ? "" : normalized.slice(objetIdx + newline + 1)).trim();
  return { subject, body: body || normalized };
};

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

  const { mode } = parsed;

  /* ------- Mode dégradé local (sans clé Groq ou en cas d'erreur) ------- */
  const buildFallback = (): Record<string, unknown> => {
    switch (mode) {
      case "cv": {
        const fb = cvFallback(parsed.payload);
        return { missing: fb.missing, resume: fb.resume, reco: fb.reco };
      }
      case "lettre":
        return { letter: lettreFallback(parsed.payload) };
      case "relance": {
        const email = relanceFallback(parsed.payload);
        return { ...splitEmail(email), email };
      }
      case "journal":
        return { report: journalFallback(parsed.payload) };
      case "entretien": {
        const history = parsed.history ?? [];
        const message = parsed.message ?? "";
        if (history.length === 0 && !message) return { content: ENTRETIEN_STARTER_FALLBACK };
        if (/termin/i.test(message)) return { content: entretienFinalFallback() };
        const userTurns = history.filter((h) => h.role === "user").length + (message ? 1 : 0);
        return { content: entretienFeedbackFallback(message, userTurns) };
      }
      case "chat":
      default:
        return { content: COACH_FALLBACK_NOTICE };
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
          content: `${STUDENT_SYSTEM_BASE} Vous dialoguez en direct avec un étudiant béninois qui prépare son stage. Réponses conversationnelles de moins de 250 mots.`,
        },
        ...(parsed.history ?? []).map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: parsed.message },
      ];
      const task: GroqTask = parsed.model === "openai/gpt-oss-20b" ? "fast" : "complex";
      const { content, model } = await groqChat(task, messages);
      return NextResponse.json({ ok: true, content, model });
    }

    if (parsed.mode === "entretien") {
      const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: entretienSystemPrompt(parsed.payload) },
        ...(parsed.history ?? []).map((h) => ({ role: h.role, content: h.content })),
        ...(parsed.message ? [{ role: "user" as const, content: parsed.message }] : []),
      ];
      const { content, model } = await groqChat("complex", messages);
      return NextResponse.json({ ok: true, content, model });
    }

    if (parsed.mode === "cv") {
      const fb = cvFallback(parsed.payload);
      const { content, model } = await groqChat("complex", [
        { role: "system", content: `${STUDENT_SYSTEM_BASE} Vous optimisez des CV étudiants pour des offres de stage précises.` },
        { role: "user", content: cvPrompt(parsed.payload) },
      ]);
      const missing = toLines(grabBlock(content, "MANQUANT:", "RESUME:") ?? "");
      const resume = grabBlock(content, "RESUME:", "RECO:") ?? content.slice(0, 600);
      const reco = toLines(grabBlock(content, "RECO:") ?? "");
      if (missing.length === 0 || reco.length === 0) throw new Error("Format IA inattendu");
      return NextResponse.json({
        ok: true, model,
        missing: missing.length > 0 ? missing : fb.missing,
        resume,
        reco: reco.length > 0 ? reco : fb.reco,
        raw: content,
      });
    }

    if (parsed.mode === "lettre") {
      const { content, model } = await groqChat("complex", [
        { role: "system", content: `${STUDENT_SYSTEM_BASE} Vous rédigez des lettres de motivation personnalisées pour des stages.` },
        { role: "user", content: lettrePrompt(parsed.payload) },
      ]);
      return NextResponse.json({ ok: true, model, letter: content.trim() });
    }

    if (parsed.mode === "relance") {
      const { content, model } = await groqChat("fast", [
        { role: "system", content: `${STUDENT_SYSTEM_BASE} Vous rédigez des emails de relance de candidature courts et professionnels.` },
        { role: "user", content: relancePrompt(parsed.payload) },
      ]);
      const emailParts = splitEmail(content);
      return NextResponse.json({
        ok: true, model,
        subject: emailParts.subject,
        body: emailParts.body,
        email: content.trim(),
      });
    }

    // parsed.mode === "journal"
    const { content, model } = await groqChat("fast", [
      { role: "system", content: `${STUDENT_SYSTEM_BASE} Vous structurez des bilans hebdomadaires de stage.` },
      { role: "user", content: journalPrompt(parsed.payload) },
    ]);
    return NextResponse.json({ ok: true, model, report: content.trim() });
  } catch (error) {
    console.error("Groq API error (etudiant):", error instanceof Error ? error.message : error);
    return NextResponse.json({
      ok: true,
      fallback: true,
      model: "Mode dégradé local (Groq indisponible)",
      ...buildFallback(),
    });
  }
}
