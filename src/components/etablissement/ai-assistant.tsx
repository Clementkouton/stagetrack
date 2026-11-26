"use client";

/**
 * Copilote IA Académique — tiroir latéral (Sheet) accessible depuis tout
 * le dashboard établissement. Chat Groq + prompts rapides en 1 clic.
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ETAB_QUICK_PROMPTS } from "@/lib/groq-etablissement";
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
    "Bonjour ! Je suis votre **Copilote IA Académique** StageTrack. Je peux vous aider à :\n\n- **analyser les conventions** en attente de visa ou de signature ;\n- **rédiger une note** aux entreprises partenaires ;\n- définir les **critères de validation** d'un sujet L3 / M2 ;\n- piloter l'**insertion en stage** de vos cohortes.\n\nChoisissez une action rapide ci-dessous ou posez votre question.",
};

export function CopiloteSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
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
      const res = await fetch("/api/etablissement/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
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
              <SheetTitle className="text-left text-base font-bold text-white">Copilote IA Académique</SheetTitle>
              <SheetDescription className="text-left text-xs text-white/70">
                Propulsé par Groq — gpt-oss &amp; llama
              </SheetDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            className="mt-3 h-8 w-fit gap-1.5 border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/15 hover:text-white"
          >
            <IconRefresh size={14} />
            Nouvelle conversation
          </Button>
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
                          m.fallback ? "border-gold/40 bg-gold-50 text-gold-dark" : "border-brand/20 bg-brand-50 text-brand"
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
                Le copilote rédige une réponse…
              </div>
            ) : null}
            {messages.length === 1 ? (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Actions rapides</p>
                <div className="grid gap-2">
                  {ETAB_QUICK_PROMPTS.map((qp) => (
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
              placeholder="Posez une question académique ou de visa…"
              rows={2}
              className="min-h-[44px] flex-1 resize-none text-sm"
              aria-label="Message pour le copilote académique"
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
