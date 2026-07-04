import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageHeader } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { adminGetAiUsage } from "@/lib/cms-super.functions";

export const Route = createFileRoute("/admin/ai-usage")({
  head: () => ({ meta: [{ title: "AI usage — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: AiUsagePage,
});

function AiUsagePage() {
  const get = useServerFn(adminGetAiUsage);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "ai-usage"], queryFn: () => get({ data: { days: 30 } }) });

  if (isLoading || !data) return <PageLoader label="Loading AI usage" />;
  const max = Math.max(1, ...data.trend.map((d) => d.count));

  return (
    <>
      <AdminPageHeader title="AI usage" description="Tutor messages sent by all users over the last 30 days." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total messages (30d)</div>
          <div className="mt-1 font-display text-3xl font-bold">{data.totalMessages.toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Active users</div>
          <div className="mt-1 font-display text-3xl font-bold">{data.topUsers.length}</div>
        </CardContent></Card>
      </div>

      <Card className="mb-6"><CardContent className="p-4">
        <div className="mb-3 text-sm font-medium">Daily volume</div>
        <div className="flex h-40 items-end gap-1">
          {data.trend.map((d) => (
            <div key={d.day} className="flex-1 rounded-t bg-primary/70" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} title={`${d.day}: ${d.count}`} />
          ))}
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <div className="border-b p-4 text-sm font-medium">Top users</div>
        <div className="divide-y">
          {data.topUsers.map((u) => (
            <div key={u.user_id} className="flex items-center justify-between p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{u.full_name ?? "Unnamed"}</div>
                <div className="truncate text-xs text-muted-foreground">{u.email ?? u.user_id}</div>
              </div>
              <div className="font-mono text-sm">{u.messages.toLocaleString()}</div>
            </div>
          ))}
          {data.topUsers.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No AI activity yet.</div>}
        </div>
      </CardContent></Card>
    </>
  );
}
