import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageLoader } from "@/components/PageLoader";
import { getCourseBySlug } from "@/lib/cms.functions";
import { getCourseProgress, issueCertificate } from "@/lib/learn.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, CheckCircle2, Lock, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/learn/$courseSlug")({
  head: ({ params }) => ({ meta: [{ title: `${params.courseSlug} — Cellow` }] }),
  component: CoursePage,
});

function CoursePage() {
  const { courseSlug } = Route.useParams();
  const nav = useNavigate();
  const fn = useServerFn(getCourseBySlug);
  const progressFn = useServerFn(getCourseProgress);
  const issue = useServerFn(issueCertificate);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["cms", "course", courseSlug],
    queryFn: () => fn({ data: { slug: courseSlug } }),
  });

  const courseId = (data as any)?.course?.id as string | undefined;
  const { data: progress } = useQuery({
    queryKey: ["progress", courseId],
    queryFn: () => progressFn({ data: { course_id: courseId! } }),
    enabled: !!courseId && signedIn,
  });

  if (isLoading) return <PageLoader label="Loading course" />;
  if (!data) return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Course not found</h1>
        <p className="mt-2 text-muted-foreground">This course may not be published yet.</p>
        <Link to="/learn" className="mt-6 inline-block text-primary underline">Back to courses</Link>
      </main>
      <SiteFooter />
    </div>
  );

  const { course, modules, lessons } = data as any;
  const completed = new Set(progress?.completed_lesson_ids ?? []);
  const orderedLessons = [...modules].flatMap((m: any) =>
    lessons.filter((l: any) => l.module_id === m.id).sort((a: any, b: any) => a.sort_order - b.sort_order),
  );
  const totalLessons = orderedLessons.length;
  const doneCount = orderedLessons.filter((l: any) => completed.has(l.id)).length;
  const pct = totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0;
  const allDone = totalLessons > 0 && doneCount === totalLessons;

  const isLocked = (lessonId: string) => {
    const idx = orderedLessons.findIndex((l: any) => l.id === lessonId);
    if (idx <= 0) return false;
    const prev = orderedLessons[idx - 1];
    return !completed.has(prev.id);
  };

  const handleIssue = async () => {
    if (!signedIn) { toast.error("Sign in to claim your certificate"); return; }
    try {
      const cert = await issue({ data: { course_id: course.id } });
      toast.success("Certificate issued!");
      nav({ to: "/certificates/$serial", params: { serial: (cert as any).serial } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold">{course.title}</h1>
        {course.description && <p className="mt-2 text-muted-foreground">{course.description}</p>}

        {signedIn && totalLessons > 0 && (
          <div className="mt-6 rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Your progress</span>
              <span className="text-muted-foreground">{doneCount} / {totalLessons} lessons</span>
            </div>
            <Progress value={pct} className="mt-2 h-2" />
            {allDone && (
              <Button className="mt-4" onClick={handleIssue}>
                <Award className="mr-2 h-4 w-4" /> Claim your certificate
              </Button>
            )}
          </div>
        )}

        <div className="mt-8 space-y-6">
          {modules.map((m: any) => {
            const ml = lessons.filter((l: any) => l.module_id === m.id);
            return (
              <div key={m.id}>
                <h2 className="font-display text-xl font-semibold">{m.title}</h2>
                {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                <div className="mt-3 space-y-2">
                  {ml.map((l: any) => {
                    const done = completed.has(l.id);
                    const locked = signedIn && isLocked(l.id) && !done;
                    const inner = (
                      <Card className={`transition ${locked ? "opacity-60" : "hover:border-primary/60"}`}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-start gap-3">
                            {done ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                            ) : locked ? (
                              <Lock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                            ) : (
                              <div className="mt-0.5 h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                            )}
                            <div>
                              <div className="font-medium">{l.title}</div>
                              {l.summary && <div className="text-xs text-muted-foreground">{l.summary}</div>}
                              <div className="mt-1 text-xs text-muted-foreground">{l.estimated_min} min • {l.xp_reward} XP</div>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    );
                    return locked ? (
                      <div key={l.id} title="Complete the previous lesson to unlock">{inner}</div>
                    ) : (
                      <Link key={l.id} to="/learn/$courseSlug/$lessonSlug" params={{ courseSlug, lessonSlug: l.slug }}>
                        {inner}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
