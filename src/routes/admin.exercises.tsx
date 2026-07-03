import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/admin/exercises")({
  head: () => ({ meta: [{ title: "Exercises — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Exercises" description="Manage practice exercises directly from within each lesson." />,
});
