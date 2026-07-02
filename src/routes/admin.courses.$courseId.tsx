import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { PageLoader } from "@/components/PageLoader";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  adminListModules, upsertModule, deleteModule,
  adminListLessons, upsertLesson, deleteLesson,
} from "@/lib/cms-admin.functions";

export const Route = createFileRoute("/admin/courses/$courseId")({
  head: () => ({ meta: [{ title: "Manage course — Cellow" }, { name: "robots", content: "noindex" }] }),
  component: ManageCoursePage,
});

function ManageCoursePage() {
  const { courseId } = Route.useParams();
  const { loading, isAdmin } = useIsAdmin();
  // Silently bounce non-super-admins away from the admin subtree.
  if (!loading && !isAdmin && typeof window !== "undefined") {
    window.location.replace("/");
  }
  const qc = useQueryClient();
  const listMods = useServerFn(adminListModules);
  const upMod = useServerFn(upsertModule);
  const delMod = useServerFn(deleteModule);

  const { data: modules, isLoading } = useQuery({
    queryKey: ["admin", "modules", courseId],
    queryFn: () => listMods({ data: { courseId } as any }),
    enabled: isAdmin,
  });

  const [newMod, setNewMod] = useState({ slug: "", title: "" });

  if (loading) return <PageLoader label="Checking access" />;
  if (!isAdmin) return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md py-16 text-center">
        <h1 className="font-display text-xl font-semibold">Admin only</h1>
        <Link to="/admin" className="mt-4 inline-block text-primary underline">Back</Link>
      </main>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin</Link>
        <h1 className="mt-3 font-display text-2xl font-bold">Modules & lessons</h1>

        <Card className="mt-6">
          <CardContent className="flex gap-2 p-4">
            <Input placeholder="Module slug" value={newMod.slug} onChange={(e) => setNewMod({ ...newMod, slug: e.target.value })} />
            <Input placeholder="Module title" value={newMod.title} onChange={(e) => setNewMod({ ...newMod, title: e.target.value })} />
            <Button
              onClick={async () => {
                if (!newMod.slug || !newMod.title) return toast.error("Slug and title required");
                await upMod({ data: { course_id: courseId, slug: newMod.slug, title: newMod.title } as any });
                setNewMod({ slug: "", title: "" });
                qc.invalidateQueries({ queryKey: ["admin", "modules", courseId] });
              }}
            ><Plus className="mr-1 h-4 w-4" /> Add module</Button>
          </CardContent>
        </Card>

        {isLoading ? <PageLoader label="Loading modules" /> : (
          <div className="mt-6 space-y-4">
            {(modules ?? []).length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No modules yet.</div>}
            {(modules as any[])?.map((m) => (
              <ModuleBlock
                key={m.id}
                module={m}
                onDelete={async () => {
                  if (!confirm(`Delete module "${m.title}"?`)) return;
                  await delMod({ data: { id: m.id } as any });
                  qc.invalidateQueries({ queryKey: ["admin", "modules", courseId] });
                }}
                onToggle={async () => {
                  const next = m.status === "published" ? "draft" : "published";
                  await upMod({ data: { ...m, status: next } as any });
                  qc.invalidateQueries({ queryKey: ["admin", "modules", courseId] });
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ModuleBlock({ module: m, onDelete, onToggle }: { module: any; onDelete: () => void; onToggle: () => void }) {
  const qc = useQueryClient();
  const listLessons = useServerFn(adminListLessons);
  const upLesson = useServerFn(upsertLesson);
  const delLesson = useServerFn(deleteLesson);
  const { data: lessons } = useQuery({
    queryKey: ["admin", "lessons", m.id],
    queryFn: () => listLessons({ data: { moduleId: m.id } as any }),
  });
  const [nl, setNl] = useState({ slug: "", title: "", summary: "", content: "[]" });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-medium">{m.title} <Badge variant={m.status === "published" ? "default" : "secondary"}>{m.status}</Badge></div>
            <div className="text-xs text-muted-foreground">/{m.slug}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onToggle}>{m.status === "published" ? "Unpublish" : "Publish"}</Button>
            <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t pt-3">
          {(lessons as any[])?.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div>
                <div className="flex items-center gap-2">{l.title} <Badge variant={l.status === "published" ? "default" : "secondary"}>{l.status}</Badge></div>
                <div className="text-xs text-muted-foreground">/{l.slug} · {l.xp_reward} XP</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost"
                  onClick={async () => {
                    const next = l.status === "published" ? "draft" : "published";
                    await upLesson({ data: { ...l, status: next } as any });
                    qc.invalidateQueries({ queryKey: ["admin", "lessons", m.id] });
                  }}
                >{l.status === "published" ? "Unpublish" : "Publish"}</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm(`Delete lesson "${l.title}"?`)) return;
                  await delLesson({ data: { id: l.id } as any });
                  qc.invalidateQueries({ queryKey: ["admin", "lessons", m.id] });
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}

          <div className="mt-3 rounded-md border border-dashed p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Lesson slug" value={nl.slug} onChange={(e) => setNl({ ...nl, slug: e.target.value })} />
              <Input placeholder="Lesson title" value={nl.title} onChange={(e) => setNl({ ...nl, title: e.target.value })} />
              <Textarea className="sm:col-span-2" placeholder="Summary" value={nl.summary} onChange={(e) => setNl({ ...nl, summary: e.target.value })} />
              <Textarea
                className="sm:col-span-2 font-mono text-xs"
                placeholder='Content JSON blocks, e.g. [{"type":"heading","text":"Intro"},{"type":"paragraph","text":"Welcome"}]'
                rows={5}
                value={nl.content}
                onChange={(e) => setNl({ ...nl, content: e.target.value })}
              />
              <Button className="sm:col-span-2"
                onClick={async () => {
                  if (!nl.slug || !nl.title) return toast.error("Slug and title required");
                  let content: unknown = [];
                  try { content = JSON.parse(nl.content || "[]"); } catch { return toast.error("Content must be valid JSON"); }
                  await upLesson({ data: { module_id: m.id, slug: nl.slug, title: nl.title, summary: nl.summary || null, content } as any });
                  setNl({ slug: "", title: "", summary: "", content: "[]" });
                  qc.invalidateQueries({ queryKey: ["admin", "lessons", m.id] });
                  toast.success("Lesson created");
                }}
              ><Plus className="mr-1 h-4 w-4" /> Add lesson</Button>
              <p className="sm:col-span-2 text-xs text-muted-foreground">Phase 5B ships a visual block editor. For now, content is a JSON array of blocks: heading, paragraph, bullet_list, numbered_list, quote, callout, code, formula, image, video, divider.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
