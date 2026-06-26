import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, level } = (await request.json()) as {
          messages?: UIMessage[];
          level?: "beginner" | "intermediate" | "advanced";
        };
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const persona =
          level === "advanced"
            ? "The learner is advanced. Give pro-level, concise answers and modern functions (XLOOKUP, LET, LAMBDA, dynamic arrays)."
            : level === "intermediate"
              ? "The learner is intermediate. Explain clearly and prefer modern functions."
              : "The learner is a beginner. Use very simple language and short examples.";

        const gateway = createLovableAiGatewayProvider(key);
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
          messages: convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
