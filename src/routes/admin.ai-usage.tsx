import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/admin/ai-usage")({
  head: () => ({ meta: [{ title: "AI usage — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="AI usage" description="Daily AI request volume and per-user quotas." />,
});
