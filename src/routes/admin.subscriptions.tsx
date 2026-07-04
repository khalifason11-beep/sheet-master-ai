import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageHeader } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminListSubscriptions } from "@/lib/cms-super.functions";

export const Route = createFileRoute("/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: SubsPage,
});

function SubsPage() {
  const get = useServerFn(adminListSubscriptions);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "subs"], queryFn: () => get() });

  if (isLoading) return <PageLoader label="Loading subscriptions" />;
  const rows = data ?? [];
  const active = rows.filter((s: any) => s.status === "active").length;

  return (
    <>
      <AdminPageHeader title="Subscriptions" description="All Stripe subscriptions synced to the platform." />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Total</div>
          <div className="mt-1 font-display text-2xl font-bold">{rows.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Active</div>
          <div className="mt-1 font-display text-2xl font-bold">{active}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Churned / other</div>
          <div className="mt-1 font-display text-2xl font-bold">{rows.length - active}</div>
        </CardContent></Card>
      </div>
      <Card><CardContent className="p-0">
        <div className="divide-y">
          {rows.map((s: any) => (
            <div key={s.stripe_subscription_id ?? s.user_id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{s.full_name ?? "Unnamed"}</div>
                <div className="truncate text-xs text-muted-foreground">{s.email ?? s.user_id}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{s.plan}</Badge>
                <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                <span className="hidden text-xs text-muted-foreground sm:inline">{s.billing_interval ?? "—"}</span>
                <span className="hidden text-xs text-muted-foreground md:inline">
                  {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : ""}
                </span>
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No subscriptions yet.</div>}
        </div>
      </CardContent></Card>
    </>
  );
}
