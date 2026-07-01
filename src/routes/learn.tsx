import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageLoader } from "@/components/PageLoader";
import { listPublishedCourses } from "@/lib/cms.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/learn")({
  head: () => ({ meta: [{ title: "Courses — Cellow" }, { name: "description", content: "Browse all Cellow courses." }] }),
  component: LearnPage,
});

function LearnPage() {
  const fn = useServerFn(listPublishedCourses);
  const { data: courses, isLoading } = useQuery({ queryKey: ["cms", "courses"], queryFn: () => fn() });

  if (isLoading) return <PageLoader label="Loading courses" />;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Courses</h1>
        <p className="mt-2 text-muted-foreground">Structured learning paths, published by our team.</p>

        {(!courses || courses.length === 0) ? (
          <div className="mt-10 rounded-2xl border border-dashed p-10 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No published courses yet. Check back soon.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c: any) => (
              <Link key={c.id} to="/learn/$courseSlug" params={{ courseSlug: c.slug }}>
                <Card className="h-full transition hover:border-primary/60">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2">
                      {c.category && <Badge variant="secondary">{c.category}</Badge>}
                      <Badge>{c.difficulty}</Badge>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold">{c.title}</h3>
                    {c.description && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{c.description}</p>}
                    <div className="mt-3 text-xs text-muted-foreground">
                      {c.estimated_min} min • {c.xp_reward} XP
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
