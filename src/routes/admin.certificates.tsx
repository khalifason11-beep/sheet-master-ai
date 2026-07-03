import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/admin/certificates")({
  head: () => ({ meta: [{ title: "Certificates — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <ComingSoon title="Certificates" description="Certificate templates and issued certificates browser." />,
});
