import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageHeader } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, FileText, CheckCircle2, CreditCard } from "lucide-react";
import { adminGetAnalytics } from "@/lib/cms-super.functions";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const get = useServerFn(adminGetAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "analytics"], queryFn: () => get() });

  if (isLoading || !data) return <PageLoader label="Loading analytics" />;

  const t = data.totals;
  return (
    <>
      <AdminPageHeader title="Analytics" description="Platform-wide learning metrics for the past 14 days." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Users" value={t.users} icon={Users} />
        <Stat label="Courses" value={t.courses} icon={BookOpen} />
        <Stat label="Lessons" value={t.lessons} icon={FileText} />
        <Stat label="Completions" value={t.completions} icon={CheckCircle2} />
        <Stat label="Active subs" value={t.activeSubscriptions} icon={CreditCard} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TrendChart title="New signups" data={data.signupsTrend} />
        <TrendChart title="Lesson completions" data={data.completionsTrend} />
      </div>
    </>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-bold">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function TrendChart({ title, data }: { title: string; data: { date?: string; day?: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 text-sm font-medium">{title}</div>
        <div className="flex h-32 items-end gap-1">
          {data.map((d, i) => (
            <div key={i} className="flex-1 rounded-t bg-primary/70" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} title={`${d.date ?? d.day}: ${d.count}`} />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>{data[0]?.date ?? data[0]?.day}</span>
          <span>{data[data.length - 1]?.date ?? data[data.length - 1]?.day}</span>
        </div>
      </CardContent>
    </Card>
  );
}
