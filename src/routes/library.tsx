import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AITutor } from "@/components/AITutor";
import { supabase } from "@/integrations/supabase/client";
import { getLesson } from "@/lib/learning-data";
import { Bookmark, Save, Trash2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [{ title: "Your Library — Cellow" }] }),
  component: LibraryPage,
});

interface Bookmark { id: string; lesson_id: string; created_at: string }
interface SavedFormula { id: string; name: string; formula: string; description: string | null; created_at: string }

function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [formulas, setFormulas] = useState<SavedFormula[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAuthed(false); setLoading(false); return; }
    setAuthed(true);
    const [{ data: b }, { data: f }] = await Promise.all([
      supabase.from("bookmarks").select("*").order("created_at", { ascending: false }),
      supabase.from("saved_formulas").select("*").order("created_at", { ascending: false }),
    ]);
    setBookmarks((b ?? []) as Bookmark[]);
    setFormulas((f ?? []) as SavedFormula[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const removeBookmark = async (id: string, lessonId: string) => {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) return toast.error("Couldn't remove bookmark");
    track("bookmark_removed", { lesson_id: lessonId });
    setBookmarks((s) => s.filter((x) => x.id !== id));
  };

  const removeFormula = async (id: string) => {
    const { error } = await supabase.from("saved_formulas").delete().eq("id", id);
    if (error) return toast.error("Couldn't delete formula");
    setFormulas((s) => s.filter((x) => x.id !== id));
  };

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center"><Sparkles className="h-6 w-6 animate-pulse text-primary" /></div>;
  }

  if (!authed) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="surface-card max-w-md p-8 text-center">
            <h1 className="font-display text-2xl font-bold">Sign in to use your library</h1>
            <p className="mt-2 text-sm text-muted-foreground">Save formulas and bookmark lessons to revisit later.</p>
            <Link to="/auth" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">Sign in <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-surface-2/40 py-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Your library</h1>
            <p className="mt-1.5 text-muted-foreground">Bookmarked lessons and saved formulas, all in one place.</p>
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 md:grid-cols-2">
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <Bookmark className="h-5 w-5 text-primary" /> Bookmarked lessons
              </h2>
              <div className="mt-4 space-y-2">
                {bookmarks.length === 0 ? (
                  <p className="surface-card p-6 text-sm text-muted-foreground">No bookmarks yet. Tap the bookmark icon on any lesson to save it.</p>
                ) : (
                  bookmarks.map((b) => {
                    const info = getLesson(b.lesson_id);
                    return (
                      <div key={b.id} className="surface-card flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{info?.lesson.title ?? b.lesson_id}</div>
                          <div className="truncate text-xs text-muted-foreground">{info?.path.title}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {info && (
                            <Button asChild size="sm" variant="ghost">
                              <Link to="/lessons/$lessonId" params={{ lessonId: b.lesson_id }}>Open</Link>
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => removeBookmark(b.id, b.lesson_id)} aria-label="Remove">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <Save className="h-5 w-5 text-primary" /> Saved formulas
              </h2>
              <div className="mt-4 space-y-2">
                {formulas.length === 0 ? (
                  <p className="surface-card p-6 text-sm text-muted-foreground">No saved formulas yet. Open a formula and tap "Save" to add it here.</p>
                ) : (
                  formulas.map((f) => (
                    <div key={f.id} className="surface-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-display font-semibold">{f.name}</div>
                          {f.description && <div className="text-xs text-muted-foreground">{f.description}</div>}
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeFormula(f.id)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <code className="mt-2 block overflow-x-auto rounded-md bg-surface-2 px-2 py-1.5 font-mono text-xs">{f.formula}</code>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <AITutor />
    </div>
  );
}
