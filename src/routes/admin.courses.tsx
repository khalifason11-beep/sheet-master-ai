import { createFileRoute, redirect } from "@tanstack/react-router";

// The Dashboard already lists and manages courses. Alias /admin/courses → /admin.
export const Route = createFileRoute("/admin/courses")({
  beforeLoad: () => { throw redirect({ to: "/admin" }); },
});
