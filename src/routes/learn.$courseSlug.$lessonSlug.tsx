import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { getLessonBySlug } from "@/lib/cms.functions";
import { markLessonComplete } from "@/lib/cms-admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/learn/$courseSlug/$lessonSlug")({
  component: LessonPage,
});

import { LessonContentView } from "@/components/LessonContentView";

function LessonPage() {
  const { courseSlug, lessonSlug } = Route.useParams();
  const fn = useServerFn(getLessonBySlug);
  const complete = useServerFn(markLessonComplete);
  const { data, isLoading } = useQuery({
    queryKey: ["cms", "lesson", courseSlug, lessonSlug],
    queryFn: () => fn({ data: { courseSlug, lessonSlug } as any }),
  });

  useEffect(() => {
    if (!data) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { lesson, course } = data as any;
      try {
        await complete({ data: { lesson_id: lesson.id, course_id: course.id, module_id: lesson.module_id, xp: lesson.xp_reward } as any });
      } catch { /* silent */ }
    })();
  }, [data, complete]);

  if (isLoading) return <PageLoader label="Loading lesson" />;
  if (!data) return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Lesson not found</h1>
        <Link to="/learn/$courseSlug" params={{ courseSlug }} className="mt-6 inline-block text-primary underline">Back to course</Link>
      </main>
      <SiteFooter />
    </div>
  );

  const { lesson, prev, next } = data as any;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/learn/$courseSlug" params={{ courseSlug }} className="text-sm text-muted-foreground hover:text-foreground">← Back to course</Link>
        <h1 className="mt-4 font-display text-3xl font-bold">{lesson.title}</h1>
        {lesson.summary && <p className="mt-2 text-muted-foreground">{lesson.summary}</p>}

        {lesson.objectives?.length ? (
          <div className="mt-6 rounded-xl border bg-accent/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objectives</div>
            <ul className="mt-2 list-disc pl-5 text-sm">{lesson.objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}</ul>
          </div>
        ) : null}

        <article className="prose prose-sm max-w-none dark:prose-invert">
          {blocks.map(renderBlock)}
        </article>

        <div className="mt-10 flex items-center justify-between border-t pt-6">
          {prev ? (
            <Button asChild variant="outline"><Link to="/learn/$courseSlug/$lessonSlug" params={{ courseSlug, lessonSlug: prev.slug }}><ArrowLeft className="mr-1 h-4 w-4" /> Previous</Link></Button>
          ) : <div />}
          <Button
            variant="ghost"
            onClick={async () => {
              const { data: u } = await supabase.auth.getUser();
              if (!u.user) { toast.error("Sign in to save progress"); return; }
              await complete({ data: { lesson_id: lesson.id, course_id: (data as any).course.id, module_id: lesson.module_id, xp: lesson.xp_reward } as any });
              toast.success("Lesson complete!");
            }}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Mark complete
          </Button>
          {next ? (
            <Button asChild><Link to="/learn/$courseSlug/$lessonSlug" params={{ courseSlug, lessonSlug: next.slug }}>Next <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          ) : <div />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
