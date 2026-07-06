import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout for /admin/courses/*. Must render <Outlet /> so child routes like
// /admin/courses/$courseId can mount. The bare /admin/courses index is
// aliased to the dashboard in admin.courses.index.tsx.
export const Route = createFileRoute("/admin/courses")({
  component: () => <Outlet />,
});
