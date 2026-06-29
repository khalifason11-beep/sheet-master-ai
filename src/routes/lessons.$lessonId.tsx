import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AITutor } from "@/components/AITutor";
import { Spreadsheet } from "@/components/Spreadsheet";
import { Button } from "@/components/ui/button";
import { getLesson, getPath } from "@/lib/learning-data";
import { ChevronLeft, Target, AlertTriangle, Lightbulb, Briefcase, CheckCircle2, ArrowRight, Sparkles, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookmarkButton } from "@/components/BookmarkButton";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/lessons/$lessonId")({
  loader: ({ params }) => {
    const found = getLesson(params.lessonId);
    if (!found) throw notFound();
    return found;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.lesson.title} — Cellow` },
      { name: "description", content: loaderData?.lesson.summary },
    ],
  }),
  component: LessonPage,
  notFoundComponent: () => <div className="flex min-h-dvh items-center justify-center"><p>Lesson not found.</p></div>,
});

function LessonPage() {
  const { lesson, path } = Route.useLoaderData();
  const [solved, setSolved] = useState(false);

  const lessonIndex = path.lessons.findIndex((l: any) => l.id === lesson.id);
  const nextLesson = path.lessons[lessonIndex + 1];

  const handleSolved = async () => {
    if (solved) return;
    setSolved(true);
    toast.success("+50 XP", { description: "Practice solved — nice work!" });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("lesson_progress").upsert({
        user_id: user.id,
        lesson_id: lesson.id,
        path_id: path.id,
        completed: true,
        score: 100,
        xp_earned: 50,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,lesson_id" });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-surface-2/40">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
            <Link to="/paths/$pathId" params={{ pathId: path.id }} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-3.5 w-3.5" /> {path.title}
            </Link>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Lesson {lessonIndex + 1} of {path.lessons.length}</span>
                <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{lesson.title}</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">{lesson.summary}</p>
              </div>
              <span className="hidden rounded-full border border-border bg-card px-3 py-1 text-xs sm:inline">{lesson.duration}</span>
            </div>
          </div>
        </div>

        <article className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6">
          <Section icon={<Target className="h-4 w-4" />} title="Learning objectives">
            <ul className="space-y-2">
              {lesson.objectives.map((o: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Concept">
            <p className="text-base leading-relaxed">{lesson.concept}</p>
          </Section>

          <Section title="Try it" icon={<Sparkles className="h-4 w-4 text-primary" />}>
            <p className="mb-3 text-sm text-muted-foreground"><strong className="text-foreground">{lesson.practice.instructions}</strong></p>
            <Spreadsheet
              initial={lesson.practice.initialData}
              targetCell={lesson.practice.targetCell}
              expectedFormula={lesson.practice.expectedFormula}
              expectedValue={lesson.practice.expectedValue}
              onSolve={handleSolved}
            />
          </Section>

          <div className="grid gap-5 sm:grid-cols-2">
            <Section icon={<Lightbulb className="h-4 w-4 text-warning" />} title="Pro tips" compact>
              <ul className="space-y-2">
                {lesson.proTips.map((t: string, i: number) => <li key={i} className="text-sm">→ {t}</li>)}
              </ul>
            </Section>
            <Section icon={<AlertTriangle className="h-4 w-4 text-destructive" />} title="Common mistakes" compact>
              <ul className="space-y-2">
                {lesson.mistakes.map((t: string, i: number) => <li key={i} className="text-sm">⚠ {t}</li>)}
              </ul>
            </Section>
          </div>

          <Section icon={<Briefcase className="h-4 w-4" />} title="In the real world" compact>
            <p className="text-sm">{lesson.useCase}</p>
          </Section>

          <div className="surface-card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display font-semibold">{solved ? "Lesson completed!" : "Finish the practice to complete this lesson"}</div>
                <div className="text-xs text-muted-foreground">{solved ? "+50 XP earned" : "Earn 50 XP and unlock the next lesson"}</div>
              </div>
            </div>
            {nextLesson ? (
              <Button asChild className="bg-gradient-brand text-primary-foreground">
                <Link to="/lessons/$lessonId" params={{ lessonId: nextLesson.id }}>
                  Next lesson <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/paths/$pathId" params={{ pathId: path.id }}>Back to path</Link>
              </Button>
            )}
          </div>
        </article>
      </main>
      <SiteFooter />
      <AITutor context={lesson.title} />
    </div>
  );
}

function Section({ title, icon, children, compact = false }: { title: string; icon?: React.ReactNode; children: React.ReactNode; compact?: boolean }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className={compact ? "font-display text-base font-semibold" : "font-display text-xl font-bold"}>{title}</h2>
      </div>
      <div className={compact ? "surface-card p-5" : ""}>{children}</div>
    </section>
  );
}

// keep getPath referenced for type
void getPath;
