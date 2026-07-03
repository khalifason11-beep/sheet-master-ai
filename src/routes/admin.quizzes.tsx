import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/admin/quizzes")({
  head: () => ({ meta: [{ title: "Quizzes — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Quizzes" description="Quiz builder ships in Phase 5C." />,
});
