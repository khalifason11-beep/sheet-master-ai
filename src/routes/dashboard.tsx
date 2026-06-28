import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AITutor } from "@/components/AITutor";
import { supabase } from "@/integrations/supabase/client";
import { learningPaths, getLesson } from "@/lib/learning-data";
import { Flame, Trophy, Target, BookOpen, ArrowRight, Sparkles, Bot } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAiUsage } from "@/hooks/use-ai-usage";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Your Dashboard — Cellow" }] }),
  component: DashboardPage,
});

interface Profile { id: string; full_name: string | null; xp: number; level: number; streak_days: number; }
interface ProgressRow { lesson_id: string; path_id: string | null; completed: boolean; xp_earned: number; completed_at: string | null; }

function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const { usage } = useAiUsage();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }
      setUserEmail(user.email ?? "");
      const [{ data: p }, { data: pr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("lesson_progress").select("*").eq("user_id", user.id),
      ]);
      if (mounted) {
        setProfile(p as Profile | null);
        setProgress((pr ?? []) as ProgressRow[]);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center"><Sparkles className="h-6 w-6 animate-pulse text-primary" /></div>;
  }

  if (!profile) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="surface-card max-w-md p-8 text-center">
            <h1 className="font-display text-2xl font-bold">Sign in to see your dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Track XP, streaks, certificates and your full learning history.</p>
            <Link to="/auth" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground">Sign in <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </main>
      </div>
    );
  }

  const totalXp = progress.reduce((s, p) => s + (p.xp_earned ?? 0), 0) + (profile.xp ?? 0);
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));
  const totalLessons = learningPaths.reduce((s, p) => s + p.lessons.length, 0);
  const overallPct = Math.round((completedIds.size / totalLessons) * 100);

  const recent = progress
    .filter((p) => p.completed_at)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    .slice(0, 5);

  const nextLesson = (() => {
    for (const p of learningPaths) {
      for (const l of p.lessons) if (!completedIds.has(l.id)) return { lesson: l, path: p };
    }
    return null;
  })();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-surface-2/40 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {profile.full_name?.split(" ")[0] || userEmail.split("@")[0]} 👋</h1>
            <p className="mt-1.5 text-muted-foreground">Here's where you are on your Excel journey.</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <StatCard icon={<Trophy className="h-5 w-5" />} label="Total XP" value={totalXp.toString()} accent />
              <StatCard icon={<Flame className="h-5 w-5" />} label="Day streak" value={String(profile.streak_days ?? 0)} />
              <StatCard icon={<BookOpen className="h-5 w-5" />} label="Lessons done" value={`${completedIds.size}/${totalLessons}`} />
              <StatCard icon={<Target className="h-5 w-5" />} label="Level" value={String(profile.level ?? 1)} />
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {nextLesson && (
                <div className="surface-card overflow-hidden p-0">
                  <div className="bg-gradient-brand p-6 text-primary-foreground">
                    <span className="text-xs font-medium uppercase tracking-wider opacity-90">Continue learning</span>
                    <h2 className="mt-1 font-display text-2xl font-bold">{nextLesson.lesson.title}</h2>
                    <p className="mt-1 opacity-90">{nextLesson.lesson.summary}</p>
                    <Link to="/lessons/$lessonId" params={{ lessonId: nextLesson.lesson.id }} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25">
                      Resume lesson <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}

              <div>
                <h2 className="font-display text-xl font-bold">Your paths</h2>
                <div className="mt-4 space-y-3">
                  {learningPaths.map((p) => {
                    const total = p.lessons.length;
                    const done = p.lessons.filter((l) => completedIds.has(l.id)).length;
                    const pct = Math.round((done / total) * 100);
                    return (
                      <Link key={p.id} to="/paths/$pathId" params={{ pathId: p.id }} className="surface-card flex items-center gap-4 p-4 transition hover:-translate-y-0.5">
                        <div className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ${p.color}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-display font-semibold truncate">{p.title}</div>
                            <span className="shrink-0 text-xs text-muted-foreground">{done}/{total}</span>
                          </div>
                          <Progress value={pct} className="mt-2 h-1.5" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="surface-card p-5">
                <h3 className="font-display font-semibold">Overall progress</h3>
                <div className="mt-3 flex items-end justify-between">
                  <span className="font-display text-4xl font-bold">{overallPct}%</span>
                  <span className="text-xs text-muted-foreground">{completedIds.size} of {totalLessons} lessons</span>
                </div>
                <Progress value={overallPct} className="mt-3 h-2" />
              </div>

              {usage && (
                <div className="surface-card p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-display font-semibold">
                      <Bot className="h-4 w-4 text-primary" /> AI Tutor today
                    </h3>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">
                      {usage.plan}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="font-display text-3xl font-bold">{usage.remaining}</span>
                    <span className="text-xs text-muted-foreground">of {usage.limit} messages left</span>
                  </div>
                  <Progress value={(usage.used / usage.limit) * 100} className="mt-3 h-2" />
                  {usage.plan === "free" && usage.remaining <= 3 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Running low? Premium unlocks {100} messages/day.
                    </p>
                  )}
                </div>
              )}

              <div className="surface-card p-5">
                <h3 className="font-display font-semibold">Recent activity</h3>
                {recent.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No activity yet — start a lesson to fill this in.</p>
                ) : (
                  <ul className="mt-3 space-y-2.5 text-sm">
                    {recent.map((r) => {
                      const info = getLesson(r.lesson_id);
                      return (
                        <li key={r.lesson_id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{info?.lesson.title ?? r.lesson_id}</span>
                          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">+{r.xp_earned} XP</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
      <AITutor />
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`surface-card flex items-center gap-3 p-4 ${accent ? "border-primary/30" : ""}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent ? "bg-gradient-brand text-primary-foreground" : "bg-accent text-accent-foreground"}`}>{icon}</div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-display text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}
