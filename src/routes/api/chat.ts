import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

// Minimal in-process per-IP burst limiter (defence-in-depth on top of per-user daily limit).
// Resets when the Worker isolate cycles, which is acceptable for burst control.
const ipHits = new Map<string, { count: number; resetAt: number }>();
const IP_WINDOW_MS = 60_000;
const IP_MAX_PER_WINDOW = 20;

function ipAllowed(ip: string) {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }
  if (entry.count >= IP_MAX_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}

function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ---- Env ----
        const apiKey = process.env.LOVABLE_API_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!apiKey || !supabaseUrl || !serviceKey) {
          return new Response("Server misconfigured", { status: 500 });
        }

        // ---- IP burst limit ----
        const ip = getClientIp(request);
        if (!ipAllowed(ip)) {
          return new Response("Too many requests, slow down.", { status: 429 });
        }

        // ---- Require auth ----
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return new Response("Sign in to use the AI tutor.", { status: 401 });
        }

        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: userData, error: userErr } = await admin.auth.getUser(token);
        if (userErr || !userData.user) {
          return new Response("Invalid session.", { status: 401 });
        }
        const userId = userData.user.id;

        // ---- Parse + validate input ----
        let body: { messages?: unknown; level?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("messages required", { status: 400 });
        }

        // ---- Load configurable limits ----
        const [{ data: cfgRows }] = await Promise.all([
          admin
            .from("app_config")
            .select("key,value")
            .in("key", [
              "ai_daily_limit_free",
              "ai_daily_limit_premium",
              "ai_max_message_chars",
              "ai_max_messages_per_request",
            ]),
        ]);
        const cfg = Object.fromEntries(
          (cfgRows ?? []).map((r) => [r.key as string, r.value as number]),
        );
        const maxChars = (cfg.ai_max_message_chars as number) ?? 2000;
        const maxMsgs = (cfg.ai_max_messages_per_request as number) ?? 30;

        if (messages.length > maxMsgs) {
          return new Response(`Conversation too long (max ${maxMsgs} messages).`, { status: 400 });
        }
        // Find latest user message
        const lastUser = [...(messages as UIMessage[])].reverse().find((m) => m.role === "user");
        if (!lastUser) return new Response("No user message.", { status: 400 });
        const lastText = lastUser.parts
          .map((p) => (p.type === "text" ? p.text : ""))
          .join("");
        if (!lastText.trim()) return new Response("Empty message.", { status: 400 });
        if (lastText.length > maxChars) {
          return new Response(`Message too long (max ${maxChars} chars).`, { status: 400 });
        }

        // ---- Per-user daily quota ----
        const { data: planRow } = await admin
          .from("profiles")
          .select("plan")
          .eq("id", userId)
          .maybeSingle();
        const plan = (planRow?.plan as string) ?? "free";
        const dailyLimit =
          plan === "premium"
            ? ((cfg.ai_daily_limit_premium as number) ?? 100)
            : ((cfg.ai_daily_limit_free as number) ?? 10);

        const today = new Date().toISOString().slice(0, 10);
        const { data: usageRow } = await admin
          .from("ai_usage_daily")
          .select("message_count")
          .eq("user_id", userId)
          .eq("day", today)
          .maybeSingle();
        const used = usageRow?.message_count ?? 0;
        if (used >= dailyLimit) {
          return new Response(
            JSON.stringify({
              error: "daily_limit_reached",
              message:
                plan === "premium"
                  ? `You've reached today's limit of ${dailyLimit} AI messages.`
                  : `You've used your ${dailyLimit} free AI messages for today. Upgrade to Premium for more.`,
              limit: dailyLimit,
              used,
              plan,
            }),
            { status: 429, headers: { "content-type": "application/json" } },
          );
        }

        // ---- Increment counter (best-effort upsert) ----
        await admin.from("ai_usage_daily").upsert(
          { user_id: userId, day: today, message_count: used + 1, updated_at: new Date().toISOString() },
          { onConflict: "user_id,day" },
        );

        // ---- Persona ----
        const level = body.level === "advanced" || body.level === "intermediate" ? body.level : "beginner";
        const persona =
          level === "advanced"
            ? "The learner is advanced. Give pro-level, concise answers and modern functions (XLOOKUP, LET, LAMBDA, dynamic arrays)."
            : level === "intermediate"
              ? "The learner is intermediate. Explain clearly and prefer modern functions."
              : "The learner is a beginner. Use very simple language and short examples.";

        const gateway = createLovableAiGatewayProvider(apiKey);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: `You are Cellow, a friendly and expert Microsoft Excel tutor inside an interactive learning platform.
${persona}

Rules:
- Always use Markdown.
- Wrap Excel formulas in inline code, e.g. \`=SUMIF(A:A,"Food",B:B)\`.
- When suggesting a formula, also explain in one sentence what each part does.
- If the learner asks for a concept, give: short definition, tiny example, a "watch out" line.
- Never invent functions that don't exist in Excel.
- If asked about something not Excel-related, gently steer back to Excel.`,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          headers: {
            "X-AI-Daily-Used": String(used + 1),
            "X-AI-Daily-Limit": String(dailyLimit),
          },
        });
      },
    },
  },
});
