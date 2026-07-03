import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageHeader } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { LessonEditor, type LessonContent } from "@/components/admin/LessonEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { adminGetLesson, upsertLesson, adminListQuizzes, upsertQuiz } from "@/lib/cms-admin.functions";
import { HelpCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/lessons/$lessonId")({
  head: () => ({ meta: [{ title: "Edit lesson — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: EditLessonPage,
});

type LessonRow = {
  id: string; module_id: string; slug: string; title: string;
  summary: string | null; objectives: string[] | null; content: unknown;
  estimated_min: number; xp_reward: number; status: "draft" | "published" | "archived";
};

function EditLessonPage() {
  const { lessonId } = Route.useParams();
  const qc = useQueryClient();
  const getLesson = useServerFn(adminGetLesson);
  const save = useServerFn(upsertLesson);
  const listQuizzes = useServerFn(adminListQuizzes);
  const createQuiz = useServerFn(upsertQuiz);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["admin", "lesson", lessonId],
    queryFn: () => getLesson({ data: { id: lessonId } }),
  });

  const [meta, setMeta] = useState({
    title: "", slug: "", summary: "", objectives: "", estimated_min: 10, xp_reward: 20,
    status: "draft" as "draft" | "published" | "archived",
  });

  useEffect(() => {
    if (!lesson) return;
    const l = lesson as LessonRow;
    setMeta({
      title: l.title, slug: l.slug, summary: l.summary ?? "",
      objectives: (l.objectives ?? []).join("\n"),
      estimated_min: l.estimated_min, xp_reward: l.xp_reward, status: l.status,
    });
  }, [lesson]);

  const { data: quizzes } = useQuery({
    queryKey: ["admin", "quizzes", "lesson", lessonId],
    queryFn: () => listQuizzes({ data: { lessonId } }),
    enabled: !!lesson,
  });

  async function saveContent(content: LessonContent) {
    const l = lesson as LessonRow;
    await save({ data: {
      id: l.id, module_id: l.module_id, slug: l.slug, title: l.title, content,
    } });
  }

  async function saveMeta() {
    if (!lesson) return;
    const l = lesson as LessonRow;
    await save({ data: {
      id: l.id, module_id: l.module_id,
      slug: meta.slug, title: meta.title, summary: meta.summary || null,
      objectives: meta.objectives.split("\n").map((s) => s.trim()).filter(Boolean),
      estimated_min: Number(meta.estimated_min), xp_reward: Number(meta.xp_reward),
      status: meta.status, content: l.content as never,
    } });
    toast.success("Lesson updated");
    qc.invalidateQueries({ queryKey: ["admin", "lesson", lessonId] });
    qc.invalidateQueries({ queryKey: ["admin", "lessons"] });
  }

  if (isLoading) return <PageLoader label="Loading lesson" />;
  if (!lesson) return (
    <>
      <AdminPageHeader title="Lesson not found" />
      <Link to="/admin" className="text-sm text-primary underline">← Back to admin</Link>
    </>
  );

  const l = lesson as LessonRow;

  return (
    <>
      <AdminPageHeader
        title={l.title || "Untitled lesson"}
        description="Rich content saves automatically. Use metadata below to change slug, status, XP, and objectives."
        actions={
          <>
            <Badge variant={l.status === "published" ? "default" : "secondary"}>{l.status}</Badge>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin" className="gap-1"><ExternalLink className="h-3 w-3" /> Back</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <LessonEditor
          initialContent={(l.content as LessonContent) ?? null}
          onChange={saveContent}
        />

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="text-sm font-semibold">Metadata</h3>
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Slug</Label>
                <Input value={meta.slug} onChange={(e) => setMeta({ ...meta, slug: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Summary</Label>
                <Textarea rows={2} value={meta.summary} onChange={(e) => setMeta({ ...meta, summary: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Objectives (one per line)</Label>
                <Textarea rows={3} value={meta.objectives} onChange={(e) => setMeta({ ...meta, objectives: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Est. min</Label>
                  <Input type="number" value={meta.estimated_min} onChange={(e) => setMeta({ ...meta, estimated_min: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">XP</Label>
                  <Input type="number" value={meta.xp_reward} onChange={(e) => setMeta({ ...meta, xp_reward: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value as "draft" | "published" | "archived" })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <Button className="w-full" onClick={saveMeta}>Save metadata</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Quizzes</h3>
                <Button size="sm" variant="outline"
                  onClick={async () => {
                    const q = await createQuiz({ data: { lesson_id: lessonId, title: "New quiz", pass_score: 70, xp_reward: 30 } }) as { id: string };
                    qc.invalidateQueries({ queryKey: ["admin", "quizzes", "lesson", lessonId] });
                    window.location.href = `/admin/quizzes/${q.id}`;
                  }}
                ><HelpCircle className="mr-1 h-3 w-3" /> New quiz</Button>
              </div>
              {(quizzes as { id: string; title: string; status: string }[] | undefined ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No quizzes attached. Add one to test the learner's understanding.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {(quizzes as { id: string; title: string; status: string }[]).map((q) => (
                    <li key={q.id}>
                      <Link to="/admin/quizzes/$quizId" params={{ quizId: q.id }} className="flex items-center justify-between rounded border px-2 py-1.5 hover:bg-accent">
                        <span className="truncate">{q.title}</span>
                        <Badge variant={q.status === "published" ? "default" : "secondary"} className="ml-2">{q.status}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
