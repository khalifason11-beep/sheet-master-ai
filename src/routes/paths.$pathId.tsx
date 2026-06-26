import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AITutor } from "@/components/AITutor";
import { getPath } from "@/lib/learning-data";
import { ChevronLeft, Clock, BookOpen, Award, Play, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/paths/$pathId")({
  loader: ({ params }) => {
    const path = getPath(params.pathId);
    if (!path) throw notFound();
    return { path };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.path.title} — Cellow` },
      { name: "description", content: loaderData?.path.description },
    ],
  }),
  component: PathDetail,
  notFoundComponent: () => (
    <div className="flex min-h-dvh items-center justify-center"><p>Path not found.</p></div>
  ),
});

function PathDetail() {
  const { path } = Route.useLoaderData();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className={`relative overflow-hidden bg-gradient-to-br ${path.color} py-16 text-white`}>
          <div className="absolute inset-0 bg-grid-cells opacity-20" aria-hidden />
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
            <Link to="/paths" className="inline-flex items-center gap-1.5 text-sm opacity-90 hover:opacity-100">
              <ChevronLeft className="h-4 w-4" /> All paths
            </Link>
            <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{path.title}</h1>
            <p className="mt-3 max-w-2xl text-white/90">{path.description}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur"><Clock className="h-3.5 w-3.5" /> {path.duration}</span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur"><BookOpen className="h-3.5 w-3.5" /> {path.lessons.length} lessons</span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur"><Award className="h-3.5 w-3.5" /> Certificate on completion</span>
            </div>
            <div className="mt-6 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span>Your progress</span><span>0%</span>
              </div>
              <Progress value={0} className="bg-white/20" />
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-bold">Curriculum</h2>
            <ol className="mt-6 space-y-3">
              {path.lessons.map((l, i) => (
                <li key={l.id}>
                  <Link
                    to="/lessons/$lessonId"
                    params={{ lessonId: l.id }}
                    className="surface-card group grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-display text-sm font-bold text-accent-foreground transition group-hover:bg-gradient-brand group-hover:text-primary-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-semibold">{l.title}</h3>
                      <p className="truncate text-sm text-muted-foreground">{l.summary}</p>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="hidden text-xs sm:inline">{l.duration}</span>
                      <Circle className="h-4 w-4 transition group-hover:hidden" />
                      <Play className="hidden h-4 w-4 fill-current text-primary group-hover:inline" />
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <SiteFooter />
      <AITutor context={path.title} />
    </div>
  );
}
