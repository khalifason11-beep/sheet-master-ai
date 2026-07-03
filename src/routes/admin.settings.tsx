import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Settings" description="App configuration — AI daily limits, XP multipliers." />,
});
