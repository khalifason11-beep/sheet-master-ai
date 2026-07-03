import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Analytics" description="Course completion funnels and per-lesson drop-off." />,
});
