import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageLoader } from "@/components/PageLoader";
import { getCourseBySlug } from "@/lib/cms.functions";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/learn/$courseSlug")({
  head: ({ params }) => ({ meta: [{ title: `${params.courseSlug} — Cellow` }] }),
  component: CoursePage,
});

function CoursePage() {
  const { courseSlug } = Route.useParams();
  const fn = useServerFn(getCourseBySlug);
  const { data, isLoading } = useQuery({
    queryKey: ["cms", "course", courseSlug],
    queryFn: () => fn({ data: { courseSlug } as any }),
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

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold">{course.title}</h1>
        {course.description && <p className="mt-2 text-muted-foreground">{course.description}</p>}

        <div className="mt-8 space-y-6">
          {modules.map((m: any) => {
            const ml = lessons.filter((l: any) => l.module_id === m.id);
            return (
              <div key={m.id}>
                <h2 className="font-display text-xl font-semibold">{m.title}</h2>
                {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                <div className="mt-3 space-y-2">
                  {ml.map((l: any) => (
                    <Link key={l.id} to="/learn/$courseSlug/$lessonSlug" params={{ courseSlug, lessonSlug: l.slug }}>
                      <Card className="transition hover:border-primary/60">
                        <CardContent className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-medium">{l.title}</div>
                            {l.summary && <div className="text-xs text-muted-foreground">{l.summary}</div>}
                            <div className="mt-1 text-xs text-muted-foreground">{l.estimated_min} min • {l.xp_reward} XP</div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
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
