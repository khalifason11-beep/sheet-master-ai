import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageHeader } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { adminListCourses, upsertCourse, deleteCourse } from "@/lib/cms-admin.functions";
import { Plus, Trash2, BookOpen, Layers, FileText } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin dashboard — Cellow" }, { name: "robots", content: "noindex" }] }),
  component: AdminIndex,
});

function AdminIndex() {
  const qc = useQueryClient();
  const list = useServerFn(adminListCourses);
  const upsert = useServerFn(upsertCourse);
  const del = useServerFn(deleteCourse);

  const [form, setForm] = useState({ slug: "", title: "", description: "", category: "", difficulty: "beginner" as const, estimated_min: 30, xp_reward: 50 });
  const [creating, setCreating] = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => list(),
  });

  const stats = {
    total: courses?.length ?? 0,
    published: (courses ?? []).filter((c: { status: string }) => c.status === "published").length,
    drafts: (courses ?? []).filter((c: { status: string }) => c.status === "draft").length,
  };

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Manage every course, module, and lesson in your learning platform."
        actions={<Button onClick={() => setCreating((v) => !v)}><Plus className="mr-1 h-4 w-4" /> New course</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Courses" value={stats.total} icon={BookOpen} />
        <StatCard label="Published" value={stats.published} icon={Layers} />
        <StatCard label="Drafts" value={stats.drafts} icon={FileText} />
      </div>

      {creating && (
        <Card className="mb-6">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            <Input placeholder="Slug (e.g. excel-basics)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Category (e.g. Excel, SQL, Python)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input type="number" placeholder="Estimated minutes" value={form.estimated_min} onChange={(e) => setForm({ ...form, estimated_min: Number(e.target.value) })} />
            <Textarea className="sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="flex gap-2 sm:col-span-2">
              <Button
                onClick={async () => {
                  if (!form.slug || !form.title) return toast.error("Slug and title required");
                  try {
                    await upsert({ data: form });
                    toast.success("Course created");
                    setForm({ slug: "", title: "", description: "", category: "", difficulty: "beginner", estimated_min: 30, xp_reward: 50 });
                    setCreating(false);
                    qc.invalidateQueries({ queryKey: ["admin", "courses"] });
                  } catch (e) { toast.error((e as Error).message ?? "Failed"); }
                }}
              >Create course</Button>
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading ? <PageLoader label="Loading courses" /> :
          (courses ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No courses yet. Create your first course above.
            </div>
          ) : (courses as { id: string; title: string; slug: string; status: string; category: string | null; difficulty: string }[]).map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{c.title}</div>
                    <Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">/{c.slug} · {c.category ?? "uncategorized"} · {c.difficulty}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/admin/courses/$courseId" params={{ courseId: c.id }}>Manage</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const next = c.status === "published" ? "draft" : "published";
                      await upsert({ data: { ...(c as Record<string, unknown>), status: next } as never });
                      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
                    }}
                  >{c.status === "published" ? "Unpublish" : "Publish"}</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm(`Delete course "${c.title}"?`)) return;
                      await del({ data: { id: c.id } });
                      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
                    }}
                  ><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-bold">{value}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
