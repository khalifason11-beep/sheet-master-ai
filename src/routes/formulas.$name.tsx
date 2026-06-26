import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AITutor } from "@/components/AITutor";
import { formulas } from "@/lib/learning-data";
import { ChevronLeft, AlertTriangle, Lightbulb, Link2 } from "lucide-react";

export const Route = createFileRoute("/formulas/$name")({
  loader: ({ params }) => {
    const f = formulas.find((x) => x.name.toLowerCase() === params.name.toLowerCase());
    if (!f) throw notFound();
    return { f };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.f.name} — Excel formula — Cellow` },
      { name: "description", content: loaderData?.f.description },
    ],
  }),
  component: FormulaPage,
  notFoundComponent: () => <div className="flex min-h-dvh items-center justify-center"><p>Formula not found.</p></div>,
});

function FormulaPage() {
  const { f } = Route.useLoaderData();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-surface-2/40 py-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <Link to="/formulas" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-3.5 w-3.5" /> Formula library
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-4xl font-bold tracking-tight text-primary sm:text-5xl">{f.name}</h1>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{f.category}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${f.difficulty === "Easy" ? "bg-success/15 text-success" : f.difficulty === "Medium" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}`}>{f.difficulty}</span>
            </div>
            <p className="mt-3 text-lg text-foreground">{f.purpose}</p>
            <code className="mt-4 block w-full overflow-x-auto rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm shadow-card">{f.syntax}</code>
          </div>
        </section>

        <article className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
          <div>
            <h2 className="font-display text-xl font-bold">What it does</h2>
            <p className="mt-2 leading-relaxed">{f.description}</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold">Arguments</h2>
            <div className="mt-3 surface-card divide-y divide-border">
              {f.args.map((a) => (
                <div key={a.name} className="grid grid-cols-[140px_1fr] gap-4 p-4 text-sm">
                  <code className="font-mono font-semibold text-primary">{a.name}</code>
                  <p className="text-muted-foreground">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold">Example</h2>
            <div className="mt-3 surface-card p-5">
              <code className="block overflow-x-auto rounded-md bg-surface-2 px-3 py-2 font-mono text-sm">{f.example.formula}</code>
              <p className="mt-3 text-sm"><strong>Returns:</strong> {f.example.result}</p>
              {f.example.note && <p className="mt-1 text-xs text-muted-foreground">{f.example.note}</p>}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="surface-card p-5">
              <h3 className="flex items-center gap-2 font-display font-semibold"><Lightbulb className="h-4 w-4 text-warning" /> Pro tips</h3>
              <ul className="mt-3 space-y-1.5 text-sm">{f.tips.map((t) => <li key={t}>→ {t}</li>)}</ul>
            </div>
            <div className="surface-card p-5">
              <h3 className="flex items-center gap-2 font-display font-semibold"><AlertTriangle className="h-4 w-4 text-destructive" /> Watch out</h3>
              <ul className="mt-3 space-y-1.5 text-sm">{f.mistakes.map((t) => <li key={t}>⚠ {t}</li>)}</ul>
            </div>
          </div>

          {f.related.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Link2 className="h-4 w-4" /> Related formulas</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {f.related.map((r) => {
                  const exists = formulas.some((x) => x.name === r);
                  return exists ? (
                    <Link key={r} to="/formulas/$name" params={{ name: r }} className="rounded-full border border-border bg-card px-3 py-1 font-mono text-xs hover:border-primary hover:text-primary">{r}</Link>
                  ) : (
                    <span key={r} className="rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">{r}</span>
                  );
                })}
              </div>
            </div>
          )}
        </article>
      </main>
      <SiteFooter />
      <AITutor context={f.name} />
    </div>
  );
}
