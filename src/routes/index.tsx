import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, BookOpen, Code2, Trophy, GraduationCap, CheckCircle2, Zap, Brain, Target } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AITutor } from "@/components/AITutor";
import { Button } from "@/components/ui/button";
import { learningPaths, platformStats, formulas } from "@/lib/learning-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cellow — Learn Excel by doing, with an AI tutor" },
      { name: "description", content: "Interactive lessons, live spreadsheet practice and an AI Excel mentor. Master VLOOKUP, XLOOKUP, Pivot Tables, LAMBDA and more." },
      { property: "og:title", content: "Cellow — The future of learning Excel" },
      { property: "og:description", content: "Interactive lessons, live spreadsheet practice and an AI Excel mentor." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Features />
        <PathsPreview />
        <FormulasPreview />
        <CTA />
      </main>
      <SiteFooter />
      <AITutor />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-cells opacity-60" aria-hidden />
      <div className="absolute inset-x-0 top-0 -z-0 h-full bg-gradient-to-b from-transparent via-transparent to-background" aria-hidden />
      <div className="absolute left-1/2 top-1/3 -z-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI Tutor included · Built for spreadsheet lovers
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Become an Excel{" "}
            <span className="text-gradient-brand">power user</span>
            <br className="hidden sm:block" />
            without watching a single tutorial.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Cellow teaches Microsoft Excel through interactive lessons, live spreadsheet practice and an AI mentor that adapts to your level — beginner to LAMBDA wizard.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-95">
              <Link to="/paths"><Zap className="mr-2 h-4 w-4" /> Start learning free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/formulas">Explore formulas <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> No credit card</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Beginner to advanced</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Certificates included</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <HeroSpreadsheet />
        </motion.div>
      </div>
    </section>
  );
}

function HeroSpreadsheet() {
  const cells = [
    ["Region", "Q1", "Q2", "Q3", "Total"],
    ["North", 1240, 1880, 2210, "=SUM"],
    ["South", 980, 1540, 1890, "+22%"],
    ["East", 1670, 2010, 2440, "↑"],
    ["West", 1450, 1720, 1950, "🏆"],
  ];
  return (
    <div className="surface-card overflow-hidden p-2 shadow-elevated">
      <div className="mb-2 flex items-center gap-1.5 px-2 pt-1">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        <span className="ml-2 font-mono text-[11px] text-muted-foreground">Sales-Q3.xlsx — Cellow Workspace</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-xs">
          <tbody>
            {cells.map((row, r) => (
              <tr key={r} className={r === 0 ? "bg-surface-2 font-semibold" : ""}>
                <td className="w-8 border-r border-border bg-surface-2 px-2 py-2 text-center text-[10px] font-medium text-muted-foreground">{r === 0 ? "" : r}</td>
                {row.map((c, i) => (
                  <td key={i} className={`border-r border-b border-border px-3 py-2 font-mono ${typeof c === "number" ? "text-right" : ""} ${i === 4 && r > 0 ? "bg-accent/30 text-primary" : ""}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stats() {
  const items = [
    { v: platformStats.lessons, l: "Lessons" },
    { v: platformStats.exercises, l: "Practice exercises" },
    { v: platformStats.projects, l: "Real projects" },
    { v: platformStats.formulas + "+", l: "Excel functions" },
    { v: platformStats.users, l: "Learners" },
  ];
  return (
    <section className="border-y border-border bg-surface-2/40 py-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:grid-cols-5 sm:px-6">
        {items.map((s) => (
          <div key={s.l} className="text-center">
            <div className="font-display text-3xl font-bold text-gradient-brand">{s.v}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: BookOpen, t: "Structured paths", d: "From the ribbon to LAMBDA — clear roadmaps for every level." },
    { icon: Code2, t: "Live spreadsheet", d: "Write formulas, see results instantly. Every lesson is hands-on." },
    { icon: Brain, t: "AI Excel tutor", d: "Stuck? Ask Cellow. It explains, debugs and writes formulas with you." },
    { icon: Trophy, t: "Real projects", d: "Build dashboards, invoices, budgets — portfolio-worthy work." },
    { icon: Target, t: "Smart practice", d: "Daily challenges adapt to what you've already mastered." },
    { icon: GraduationCap, t: "Certificates", d: "Earn shareable proof of every skill you unlock." },
  ];
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Everything you need to actually learn Excel</h2>
          <p className="mt-3 text-muted-foreground">Built like the SaaS tools you love — but obsessed with one thing: helping spreadsheets click.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <div key={f.t} className="surface-card group p-6 transition hover:-translate-y-0.5 hover:shadow-elevated">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition group-hover:bg-gradient-brand group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PathsPreview() {
  return (
    <section className="border-t border-border bg-surface-2/30 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Pick your path</h2>
            <p className="mt-2 text-muted-foreground">From your first formula to dashboards and LAMBDA.</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/paths">View all <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {learningPaths.map((p) => (
            <Link
              key={p.id}
              to="/paths/$pathId"
              params={{ pathId: p.id }}
              className="surface-card group flex flex-col overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className={`h-2 w-full bg-gradient-to-r ${p.color}`} />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">{p.difficulty}</span>
                  <span className="text-xs text-muted-foreground">{p.duration}</span>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold">{p.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.lessons.length} lessons</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FormulasPreview() {
  const featured = formulas.slice(0, 6);
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Searchable formula library</h2>
            <p className="mt-2 text-muted-foreground">Type "merge text" — get TEXTJOIN. Search by intent, not just name.</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/formulas">Browse all <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((f) => (
            <Link
              key={f.name}
              to="/formulas/$name"
              params={{ name: f.name }}
              className="surface-card group p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="flex items-center justify-between">
                <code className="font-mono text-base font-bold text-primary">{f.name}</code>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{f.category}</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{f.purpose}</p>
              <code className="mt-3 block truncate rounded-md bg-surface-2 px-2 py-1.5 font-mono text-[11px] text-muted-foreground">{f.syntax}</code>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-4 pb-24 pt-4 sm:px-6">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border bg-gradient-brand p-10 text-center text-primary-foreground shadow-elevated sm:p-16">
        <div className="absolute inset-0 bg-grid-cells opacity-20" aria-hidden />
        <div className="relative">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Start your Excel journey in two clicks.</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">Free forever for core lessons. Earn XP, build a streak, and unlock certificates as you go.</p>
          <Button asChild size="lg" variant="secondary" className="mt-8 bg-background text-foreground hover:bg-background/90">
            <Link to="/auth">Create your free account <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
