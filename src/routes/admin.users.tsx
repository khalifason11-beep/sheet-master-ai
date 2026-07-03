import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Users" description="Assign editor, admin, and super_admin roles. Coming in the next milestone." />,
});
