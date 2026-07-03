import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/admin/lessons")({
  head: () => ({ meta: [{ title: "Lessons — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Lessons" description="Manage lessons inside each course from the Courses section." />,
});
