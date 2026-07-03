import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Subscriptions" description="Read-only view of Free vs Premium subscribers." />,
});
