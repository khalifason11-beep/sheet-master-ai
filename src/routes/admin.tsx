import { useEffect } from "react";
import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { useIsAdmin, useSuperAdminExists } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { claimFirstAdmin } from "@/lib/cms-admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Cellow" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouter();
  const { loading, canWrite, isSuperAdmin, userId } = useIsAdmin();
  const { loading: loadingExists, exists: superAdminExists } = useSuperAdminExists();
  const claim = useServerFn(claimFirstAdmin);

  // Silently bounce anyone who has no reason to be here.
  useEffect(() => {
    if (loading || loadingExists) return;
    if (!userId) { router.navigate({ to: "/auth" }); return; }
    if (!canWrite && superAdminExists) { router.navigate({ to: "/" }); return; }
  }, [loading, loadingExists, userId, canWrite, superAdminExists, router]);

  if (loading || loadingExists) return <PageLoader label="Checking access" />;

  // Fresh install: no super_admin yet — allow the signed-in user to claim it.
  if (!canWrite && !superAdminExists && userId) {
    return (
      <div className="min-h-dvh bg-background">
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">Claim Super Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No Super Admin exists yet. Claim the role now to bootstrap the platform. This can only be done once.
          </p>
          <Button
            className="mt-6"
            onClick={async () => {
              try {
                const r = await claim();
                if ((r as { claimed: boolean }).claimed) { toast.success("You are the Super Admin."); window.location.reload(); }
                else toast.error("A Super Admin already exists.");
              } catch (e) { toast.error((e as Error).message ?? "Failed"); }
            }}
          >
            Claim Super Admin
          </Button>
        </main>
      </div>
    );
  }

  if (!canWrite) return null;

  return (
    <AdminShell isSuperAdmin={isSuperAdmin}>
      <Outlet />
    </AdminShell>
  );
}
