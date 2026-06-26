import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AITutor } from "@/components/AITutor";
import { learningPaths } from "@/lib/learning-data";
import { ArrowRight, Clock, BookOpen, Award } from "lucide-react";

export const Route = createFileRoute("/paths")({
  head: () => ({
    meta: [
      { title: "Learning paths — Cellow" },
      { name: "description", content: "Structured Excel learning paths: foundations, logic & lookups, power Excel, and Excel for business." },
    ],
  }),
  component: PathsPage,
});

function PathsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-surface-2/40 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Learning paths</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">Pick where you are today. Every path builds on the last — and you can switch any time.</p>
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
            {learningPaths.map((p) => (
              <Link
                key={p.id}
                to="/paths/$pathId"
                params={{ pathId: p.id }}
                className="surface-card group block overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                  <div className={`relative flex items-center justify-center bg-gradient-to-br ${p.color} p-8 text-white`}>
                    <span className="font-display text-5xl font-black">{p.id[0].toUpperCase()}</span>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">{p.difficulty}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {p.duration}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><BookOpen className="h-3 w-3" /> {p.lessons.length} lessons</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Award className="h-3 w-3" /> Certificate</span>
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-bold">{p.title}</h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">{p.description}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {p.lessons.slice(0, 6).map((l) => (
                        <span key={l.id} className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium">{l.title}</span>
                      ))}
                      {p.lessons.length > 6 && (
                        <span className="rounded-md bg-muted px-2 py-1 text-[11px]">+{p.lessons.length - 6}</span>
                      )}
                    </div>
                    <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-primary">
                      Open path <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
      <AITutor />
    </div>
  );
}
