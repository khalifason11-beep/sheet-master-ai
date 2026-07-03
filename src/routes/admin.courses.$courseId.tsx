import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageHeader } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { SortableList, DragHandle } from "@/components/SortableList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, ChevronRight, Dumbbell } from "lucide-react";
import {
  adminListModules, upsertModule, deleteModule,
  adminListLessons, upsertLesson, deleteLesson,
  adminListExercises, upsertExercise, deleteExercise,
  reorderItems,
} from "@/lib/cms-admin.functions";

export const Route = createFileRoute("/admin/courses/$courseId")({
  head: () => ({ meta: [{ title: "Manage course — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: ManageCoursePage,
});

type ModuleRow = { id: string; course_id: string; slug: string; title: string; status: string; sort_order: number };
type LessonRow = { id: string; module_id: string; slug: string; title: string; status: string; xp_reward: number };
type ExerciseRow = { id: string; lesson_id: string; title: string; instructions: string | null; difficulty: "beginner" | "intermediate" | "advanced"; status: "draft" | "published" | "archived" };

function ManageCoursePage() {
  const { courseId } = Route.useParams();
  const qc = useQueryClient();
  const listMods = useServerFn(adminListModules);
  const upMod = useServerFn(upsertModule);
  const delMod = useServerFn(deleteModule);
  const reorder = useServerFn(reorderItems);

  const { data: modules, isLoading } = useQuery({
    queryKey: ["admin", "modules", courseId],
    queryFn: () => listMods({ data: { courseId } }),
  });

  const [newMod, setNewMod] = useState({ slug: "", title: "" });

  return (
    <>
      <AdminPageHeader
        title="Modules & lessons"
        description="Structure this course into modules, add lessons, and attach practice exercises. Drag to reorder."
        actions={<Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← All courses</Link>}
      />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row">
          <Input placeholder="Module slug (e.g. cell-references)" value={newMod.slug} onChange={(e) => setNewMod({ ...newMod, slug: e.target.value })} />
          <Input placeholder="Module title" value={newMod.title} onChange={(e) => setNewMod({ ...newMod, title: e.target.value })} />
          <Button
            onClick={async () => {
              if (!newMod.slug || !newMod.title) return toast.error("Slug and title required");
              await upMod({ data: { course_id: courseId, slug: newMod.slug, title: newMod.title, sort_order: (modules as ModuleRow[] | undefined)?.length ?? 0 } });
              setNewMod({ slug: "", title: "" });
              qc.invalidateQueries({ queryKey: ["admin", "modules", courseId] });
            }}
          ><Plus className="mr-1 h-4 w-4" /> Add module</Button>
        </CardContent>
      </Card>

      {isLoading ? <PageLoader label="Loading modules" /> :
        !modules || (modules as ModuleRow[]).length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No modules yet. Add your first module above to start structuring this course.
          </div>
        ) : (
          <SortableList
            items={modules as ModuleRow[]}
            onReorder={async (ids) => {
              qc.setQueryData(["admin", "modules", courseId], (prev: ModuleRow[] | undefined) =>
                prev ? ids.map((id, i) => ({ ...(prev.find((p) => p.id === id) as ModuleRow), sort_order: i })) : prev
              );
              await reorder({ data: { table: "modules", ids } });
            }}
            renderItem={(m, handle) => (
              <ModuleBlock
                module={m}
                dragHandle={handle}
                onDelete={async () => {
                  if (!confirm(`Delete module "${m.title}"?`)) return;
                  await delMod({ data: { id: m.id } });
                  qc.invalidateQueries({ queryKey: ["admin", "modules", courseId] });
                }}
                onToggle={async () => {
                  const next = m.status === "published" ? "draft" : "published";
                  await upMod({ data: { ...m, status: next as "draft" | "published" } });
                  qc.invalidateQueries({ queryKey: ["admin", "modules", courseId] });
                }}
              />
            )}
          />
        )
      }
    </>
  );
}

function ModuleBlock({
  module: m, dragHandle, onDelete, onToggle,
}: {
  module: ModuleRow;
  dragHandle: React.HTMLAttributes<HTMLElement>;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const listLessons = useServerFn(adminListLessons);
  const upLesson = useServerFn(upsertLesson);
  const delLesson = useServerFn(deleteLesson);
  const reorder = useServerFn(reorderItems);
  const { data: lessons } = useQuery({
    queryKey: ["admin", "lessons", m.id],
    queryFn: () => listLessons({ data: { moduleId: m.id } }),
    enabled: expanded,
  });
  const [nl, setNl] = useState({ slug: "", title: "", summary: "" });

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <DragHandle {...dragHandle} />
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{m.title}</span>
                <Badge variant={m.status === "published" ? "default" : "secondary"}>{m.status}</Badge>
              </div>
              <div className="truncate text-xs text-muted-foreground">/{m.slug}</div>
            </div>
          </button>
          <Button size="sm" variant="ghost" onClick={onToggle}>{m.status === "published" ? "Unpublish" : "Publish"}</Button>
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 border-t pt-3 pl-2">
            {lessons && (lessons as LessonRow[]).length > 0 && (
              <SortableList
                items={lessons as LessonRow[]}
                onReorder={async (ids) => {
                  qc.setQueryData(["admin", "lessons", m.id], (prev: LessonRow[] | undefined) =>
                    prev ? ids.map((id) => prev.find((p) => p.id === id) as LessonRow) : prev
                  );
                  await reorder({ data: { table: "lessons", ids } });
                }}
                renderItem={(l, handle) => (
                  <LessonRowUI
                    lesson={l}
                    dragHandle={handle}
                    onDelete={async () => {
                      if (!confirm(`Delete lesson "${l.title}"?`)) return;
                      await delLesson({ data: { id: l.id } });
                      qc.invalidateQueries({ queryKey: ["admin", "lessons", m.id] });
                    }}
                    onToggle={async () => {
                      const next = l.status === "published" ? "draft" : "published";
                      await upLesson({ data: { ...l, status: next as "draft" | "published" } });
                      qc.invalidateQueries({ queryKey: ["admin", "lessons", m.id] });
                    }}
                  />
                )}
              />
            )}

            <div className="mt-3 rounded-md border border-dashed p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Lesson slug" value={nl.slug} onChange={(e) => setNl({ ...nl, slug: e.target.value })} />
                <Input placeholder="Lesson title" value={nl.title} onChange={(e) => setNl({ ...nl, title: e.target.value })} />
                <Textarea className="sm:col-span-2" placeholder="Summary (optional)" value={nl.summary} onChange={(e) => setNl({ ...nl, summary: e.target.value })} />
                <Button className="sm:col-span-2"
                  onClick={async () => {
                    if (!nl.slug || !nl.title) return toast.error("Slug and title required");
                    await upLesson({ data: {
                      module_id: m.id, slug: nl.slug, title: nl.title,
                      summary: nl.summary || null, content: [],
                      sort_order: (lessons as LessonRow[] | undefined)?.length ?? 0,
                    } });
                    setNl({ slug: "", title: "", summary: "" });
                    qc.invalidateQueries({ queryKey: ["admin", "lessons", m.id] });
                    toast.success("Lesson created — open Edit to write content");
                  }}
                ><Plus className="mr-1 h-4 w-4" /> Add lesson</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LessonRowUI({
  lesson: l, dragHandle, onDelete, onToggle,
}: {
  lesson: LessonRow;
  dragHandle: React.HTMLAttributes<HTMLElement>;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [openExercises, setOpenExercises] = useState(false);
  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-2 p-2 text-sm">
        <DragHandle {...dragHandle} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate">{l.title}</span>
            <Badge variant={l.status === "published" ? "default" : "secondary"}>{l.status}</Badge>
          </div>
          <div className="truncate text-xs text-muted-foreground">/{l.slug} · {l.xp_reward} XP</div>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link to="/admin/lessons/$lessonId" params={{ lessonId: l.id }}>Edit</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpenExercises((v) => !v)}>
          <Dumbbell className="mr-1 h-3 w-3" /> Exercises
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggle}>{l.status === "published" ? "Unpublish" : "Publish"}</Button>
        <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </div>
      {openExercises && <ExerciseList lessonId={l.id} />}
    </div>
  );
}

function ExerciseList({ lessonId }: { lessonId: string }) {
  const qc = useQueryClient();
  const listEx = useServerFn(adminListExercises);
  const upEx = useServerFn(upsertExercise);
  const delEx = useServerFn(deleteExercise);
  const { data: exercises } = useQuery({
    queryKey: ["admin", "exercises", lessonId],
    queryFn: () => listEx({ data: { lessonId } }),
  });
  const [ne, setNe] = useState({ title: "", instructions: "" });

  return (
    <div className="border-t bg-accent/20 p-3">
      <div className="space-y-1">
        {(exercises as ExerciseRow[] | undefined)?.map((ex) => (
          <div key={ex.id} className="flex items-center justify-between rounded border bg-background px-2 py-1.5 text-xs">
            <div className="min-w-0">
              <div className="truncate font-medium">{ex.title}</div>
              <div className="truncate text-[10px] text-muted-foreground">{ex.difficulty} · {ex.status}</div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2"
                onClick={async () => {
                  const next = ex.status === "published" ? "draft" : "published";
                  await upEx({ data: { ...ex, status: next as "draft" | "published" } });
                  qc.invalidateQueries({ queryKey: ["admin", "exercises", lessonId] });
                }}
              >{ex.status === "published" ? "Unpub" : "Pub"}</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={async () => {
                if (!confirm(`Delete "${ex.title}"?`)) return;
                await delEx({ data: { id: ex.id } });
                qc.invalidateQueries({ queryKey: ["admin", "exercises", lessonId] });
              }}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <Input placeholder="Exercise title" value={ne.title} onChange={(e) => setNe({ ...ne, title: e.target.value })} />
        <Input placeholder="Instructions" value={ne.instructions} onChange={(e) => setNe({ ...ne, instructions: e.target.value })} />
        <Button size="sm"
          onClick={async () => {
            if (!ne.title) return toast.error("Title required");
            await upEx({ data: { lesson_id: lessonId, title: ne.title, instructions: ne.instructions || null, sort_order: (exercises as ExerciseRow[] | undefined)?.length ?? 0 } });
            setNe({ title: "", instructions: "" });
            qc.invalidateQueries({ queryKey: ["admin", "exercises", lessonId] });
          }}
        ><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}
