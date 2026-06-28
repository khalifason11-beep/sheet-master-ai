import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Bot, User, Lock, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAiUsage } from "@/hooks/use-ai-usage";
import { toast } from "sonner";

const transport = new DefaultChatTransport({
  api: "/api/chat",
  fetch: async (input, init) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  },
});

interface Props {
  context?: string;
}

export function AITutor({ context }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { usage, refresh } = useAiUsage();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const initial: UIMessage[] = [
    {
      id: "welcome",
      role: "assistant",
      parts: [{
        type: "text",
        text: context
          ? `Hi 👋 I'm **Cellow**, your AI Excel tutor. I see you're learning about **${context}**. Ask me anything!`
          : "Hi 👋 I'm **Cellow**, your AI Excel tutor. Ask me about any formula, function, or problem you're stuck on.",
      }],
    } as UIMessage,
  ];

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initial,
    onFinish: () => refresh(),
    onError: async (err) => {
      // err.message contains response body when AI SDK fetch rejects
      try {
        const parsed = JSON.parse((err as Error).message);
        if (parsed?.error === "daily_limit_reached") {
          toast.error(parsed.message, {
            description: parsed.plan === "free" ? "Upgrade to Premium for 100 messages/day." : undefined,
            duration: 6000,
          });
          refresh();
          return;
        }
      } catch { /* not JSON */ }
      toast.error((err as Error).message || "AI request failed");
    },
  });

  useEffect(() => {
    if (open && authed) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, authed]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v || status === "streaming" || status === "submitted") return;
    if (v.length > 2000) {
      toast.error("Message too long (max 2000 characters).");
      return;
    }
    sendMessage({ text: v });
    setInput("");
  };

  const suggestions = [
    "Explain VLOOKUP simply",
    "Difference between SUMIF and SUMIFS?",
    "How do I remove duplicates?",
  ];

  const remaining = usage?.remaining ?? null;
  const outOfQuota = usage ? usage.remaining <= 0 : false;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow transition",
          open && "pointer-events-none opacity-0",
        )}
        aria-label="Open AI Excel tutor"
      >
        <Sparkles className="h-6 w-6" strokeWidth={2.4} />
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-primary-glow" />
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 right-5 z-50 flex h-[600px] max-h-[calc(100dvh-2.5rem)] w-[calc(100vw-2.5rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
          >
            <div className="flex items-center justify-between border-b border-border bg-gradient-brand px-4 py-3 text-primary-foreground">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold">Cellow AI</div>
                  <div className="text-[11px] opacity-90">
                    {authed && usage
                      ? `${remaining} of ${usage.limit} messages left today`
                      : "Your Excel mentor"}
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {authed === false ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-surface-2/40 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold">Sign in to chat with Cellow</h3>
                <p className="text-sm text-muted-foreground">
                  Get 10 free AI tutor messages per day with a free account.
                </p>
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <>
                <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto bg-surface-2/40 p-4">
                  {messages.map((m) => {
                    const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                    const isUser = m.role === "user";
                    return (
                      <div key={m.id} className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
                        <div className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                          isUser ? "bg-foreground text-background" : "bg-gradient-brand text-primary-foreground",
                        )}>
                          {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                        </div>
                        <div className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                          isUser
                            ? "rounded-tr-sm bg-primary text-primary-foreground"
                            : "rounded-tl-sm border border-border bg-card text-foreground",
                        )}>
                          <MiniMarkdown text={text} />
                        </div>
                      </div>
                    );
                  })}
                  {(status === "submitted" || status === "streaming") && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex items-start gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                      <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2.5">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {messages.length <= 1 && !outOfQuota && (
                  <div className="flex flex-wrap gap-1.5 border-t border-border bg-card px-3 py-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage({ text: s })}
                        className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {outOfQuota ? (
                  <div className="border-t border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      You've used today's {usage?.limit} free AI messages.
                    </p>
                    <button
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
                      onClick={() => toast.info("Premium plans launching soon — stay tuned!")}
                    >
                      <Zap className="h-3 w-3" /> Upgrade to Premium
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="flex items-center gap-2 border-t border-border bg-card p-3">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything about Excel…"
                      maxLength={2000}
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button type="submit" size="icon" className="bg-gradient-brand text-primary-foreground" disabled={!input.trim() || status === "streaming"}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => (
        <p key={i} className="whitespace-pre-wrap break-words">
          {renderInline(line)}
        </p>
      ))}
    </div>
  );
}
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) parts.push(<strong key={key++}>{t.slice(2, -2)}</strong>);
    else parts.push(<code key={key++} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">{t.slice(1, -1)}</code>);
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
