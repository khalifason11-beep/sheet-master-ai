import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AITutor } from "@/components/AITutor";
import { searchFormulas, formulas, type FormulaDoc } from "@/lib/learning-data";
import { Search, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/formulas")({
  head: () => ({
    meta: [
      { title: "Excel Formula Library — Cellow" },
      { name: "description", content: "Searchable database of Excel formulas — search by intent or name. SUMIF, XLOOKUP, TEXTJOIN, LAMBDA and more." },
    ],
  }),
  component: FormulaLibrary,
});

function FormulaLibrary() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const results = useMemo(() => {
    let r = q.trim() ? searchFormulas(q) : formulas;
    if (cat !== "All") r = r.filter((f) => f.category === cat);
    return r;
  }, [q, cat]);
  const cats = ["All", ...Array.from(new Set(formulas.map((f) => f.category)))];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-surface-2/40 py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Formula Library</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">Search by name or intent. Try <em>"add with a condition"</em> or <em>"merge text"</em>.</p>
            <div className="relative mt-6">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Try: "lookup", "count if blank", "join text"…'
                className="w-full rounded-2xl border border-input bg-card px-12 py-4 text-base shadow-card outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <p className="mb-4 text-sm text-muted-foreground">{results.length} formula{results.length !== 1 ? "s" : ""}</p>
            {results.length === 0 ? (
              <p className="surface-card p-8 text-center text-muted-foreground">No formulas match — try a different word.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {results.map((f: FormulaDoc) => (
                  <Link key={f.name} to="/formulas/$name" params={{ name: f.name }} className="surface-card group p-5 transition hover:-translate-y-0.5 hover:border-primary/40">
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-base font-bold text-primary">{f.name}</code>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{f.category}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${f.difficulty === "Easy" ? "bg-success/15 text-success" : f.difficulty === "Medium" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}`}>{f.difficulty}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{f.purpose}</p>
                    <code className="mt-3 block truncate rounded-md bg-surface-2 px-2 py-1.5 font-mono text-[11px] text-muted-foreground">{f.syntax}</code>
                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
                      Open <ArrowRight className="h-3 w-3" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
      <AITutor />
    </div>
  );
}
