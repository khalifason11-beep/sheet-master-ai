import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { PageLoader } from "@/components/PageLoader";
import { useIsAdmin, useSuperAdminExists } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListCourses,
  upsertCourse,
  deleteCourse,
  claimFirstAdmin,
} from "@/lib/cms-admin.functions";
import { Plus, Trash2, Shield } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Cellow" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { loading, isAdmin, userId } = useIsAdmin();
  const { loading: loadingExists, exists: superAdminExists } = useSuperAdminExists();
  const list = useServerFn(adminListCourses);
  const upsert = useServerFn(upsertCourse);
  const del = useServerFn(deleteCourse);
  const claim = useServerFn(claimFirstAdmin);

  // Hard gate: signed-out users → /auth. Signed-in non-super-admins on an
  // already-provisioned system → silently bounced to home. The admin surface
  // is hidden — no error page, no clue it exists.
  useEffect(() => {
    if (loading || loadingExists) return;
    if (!userId) { router.navigate({ to: "/auth" }); return; }
    if (!isAdmin && superAdminExists) { router.navigate({ to: "/" }); return; }
  }, [loading, loadingExists, userId, isAdmin, superAdminExists, router]);

  const [form, setForm] = useState({ slug: "", title: "", description: "", category: "", difficulty: "beginner" as const, estimated_min: 30, xp_reward: 50 });
  const [creating, setCreating] = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => list(),
    enabled: isAdmin,
  });

  if (loading || loadingExists) return <PageLoader label="Checking access" />;

  // Fresh install: no super_admin yet — allow the signed-in user to claim it.
  if (!isAdmin && !superAdminExists && userId) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
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
                if ((r as any).claimed) { toast.success("You are the Super Admin."); window.location.reload(); }
                else toast.error("A Super Admin already exists.");
              } catch (e: any) { toast.error(e.message ?? "Failed"); }
            }}
          >
            Claim Super Admin
          </Button>
        </main>
      </div>
    );
  }

  // While the redirect effect runs, render nothing so unauthorized users
  // never see the admin UI, even for a frame.
  if (!isAdmin) return null;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Admin · Courses</h1>
          <Button onClick={() => setCreating((v) => !v)}><Plus className="mr-1 h-4 w-4" /> New course</Button>
        </div>

        {creating && (
          <Card className="mt-6">
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
              <Input placeholder="Slug (e.g. excel-basics)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <Input type="number" placeholder="Estimated minutes" value={form.estimated_min} onChange={(e) => setForm({ ...form, estimated_min: Number(e.target.value) })} />
              <Textarea className="sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Button
                className="sm:col-span-2"
                onClick={async () => {
                  if (!form.slug || !form.title) return toast.error("Slug and title required");
                  try {
                    await upsert({ data: form as any });
                    toast.success("Course created");
                    setForm({ slug: "", title: "", description: "", category: "", difficulty: "beginner", estimated_min: 30, xp_reward: 50 });
                    setCreating(false);
                    qc.invalidateQueries({ queryKey: ["admin", "courses"] });
                  } catch (e: any) { toast.error(e.message ?? "Failed"); }
                }}
              >Create</Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 space-y-3">
          {isLoading ? <PageLoader label="Loading courses" /> :
            (courses ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No courses yet. Create your first course above.</div>
            ) : (courses as any[]).map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{c.title}</div>
                      <Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">/{c.slug} · {c.category ?? "uncategorized"} · {c.difficulty}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" asChild><Link to="/admin/courses/$courseId" params={{ courseId: c.id }}>Manage</Link></Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const next = c.status === "published" ? "draft" : "published";
                        await upsert({ data: { ...c, status: next } as any });
                        qc.invalidateQueries({ queryKey: ["admin", "courses"] });
                      }}
                    >{c.status === "published" ? "Unpublish" : "Publish"}</Button>
                    <Button size="sm" variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Delete course "${c.title}"?`)) return;
                        await del({ data: { id: c.id } as any });
                        qc.invalidateQueries({ queryKey: ["admin", "courses"] });
                      }}
                    ><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </main>
    </div>
  );
}
