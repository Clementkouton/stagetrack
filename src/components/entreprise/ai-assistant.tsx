"use client";

/**
 * Copilote IA RH & Tuteur — tiroir latéral (Sheet) accessible depuis tout le dashboard.
 * Chat avec sélecteur de modèle Groq + prompts rapides en 1 clic.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  IconLoader2,
  IconRefresh,
  IconRobotFace,
  IconSend,
  IconSparkles,
  IconUserCircle,
} from "@tabler/icons-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AI_MODEL_OPTIONS, QUICK_PROMPTS } from "@/lib/ai-config";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  fallback?: boolean;
}

interface ChatResponse {
  ok: boolean;
  error?: string;
  content?: string;
  model?: string;
  fallback?: boolean;
}

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Bonjour ! Je suis votre **Assistant IA RH & Tuteur** StageTrack. Je peux vous aider à :\n\n- rédiger des **offres de stage** et des questions d'entretien ;\n- générer des **plans d'onboarding** et des missions hebdomadaires ;\n- rédiger des **appréciations de fin de stage** ;\n- conseiller vos décisions RH (sélection, suivi, évaluation).\n\nChoisissez une action rapide ci-dessous ou posez votre question.",
};

export function AiAssistantSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(AI_MODEL_OPTIONS[0].value);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    const history: ChatMessage[] = messages.length > 12 ? [...messages.slice(-12)] : [...messages];
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/entreprise/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          model,
          message: trimmed,
          history: history
            .filter((m) => m !== WELCOME)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as ChatResponse;
      if (!res.ok || !data.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Erreur du service IA. Veuillez réessayer.", fallback: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content ?? "", model: data.model, fallback: data.fallback },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connexion impossible au service IA. Vérifiez le réseau puis réessayez.", fallback: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const reset = () => setMessages([WELCOME]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-slate-200/80 bg-brand px-4 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <IconRobotFace size={22} className="text-gold" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-left text-base font-bold text-white">Assistant IA RH &amp; Tuteur</SheetTitle>
              <SheetDescription className="text-left text-xs text-white/70">
                Propulsé par Groq — gpt-oss &amp; llama
              </SheetDescription>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-9 flex-1 border-white/20 bg-white/10 text-xs text-white [&>svg]:text-white/70">
                <SelectValue placeholder="Modèle Groq" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              onClick={reset}
              aria-label="Réinitialiser la conversation"
              className="h-9 w-9 shrink-0 text-white hover:bg-white/15 hover:text-white"
            >
              <IconRefresh size={16} />
            </Button>
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
          <div className="space-y-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-sm"
                      : "max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200/80 bg-white px-3.5 py-3 text-sm leading-relaxed text-body shadow-sm"
                  }
                >
                  <span className="sr-only">{m.role === "user" ? "Vous :" : "Assistant :"}</span>
                  {m.role === "assistant" ? (
                    <div className="prose-sm [&_li]:ml-4 [&_li]:list-disc [&_ol]:list-decimal [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-ink [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-ink">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                  {m.role === "assistant" && m.model ? (
                    <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                      <Badge
                        variant="outline"
                        className={`h-5 px-1.5 text-[10px] font-medium ${
                          m.fallback
                            ? "border-gold/40 bg-gold-50 text-gold-dark"
                            : "border-brand/20 bg-brand-50 text-brand"
                        }`}
                      >
                        {m.fallback ? "Mode dégradé local" : m.model}
                      </Badge>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-body">
                <IconLoader2 size={18} className="animate-spin text-brand" />
                L&apos;assistant rédige une réponse…
              </div>
            ) : null}
            {messages.length === 1 ? (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Actions rapides</p>
                <div className="grid gap-2">
                  {QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      type="button"
                      onClick={() => void send(qp.message)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-ink shadow-sm transition-colors hover:border-brand/40 hover:bg-brand-50"
                    >
                      <span className="flex items-center gap-2">
                        <IconSparkles size={15} className="shrink-0 text-gold" />
                        {qp.label}
                      </span>
                      <IconSend size={14} className="shrink-0 text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <form onSubmit={onSubmit} className="border-t border-slate-200/80 bg-white p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Posez une question RH ou de tutorat…"
              rows={2}
              className="min-h-[44px] flex-1 resize-none text-sm"
              aria-label="Message pour l'assistant IA"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || input.trim().length === 0}
              className="h-11 w-11 shrink-0 rounded-xl bg-brand hover:bg-brand-dark"
              aria-label="Envoyer le message"
            >
              {loading ? <IconLoader2 size={18} className="animate-spin" /> : <IconSend size={18} />}
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <IconUserCircle size={13} />
            Entrée pour envoyer · Maj+Entrée pour un saut de ligne
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
