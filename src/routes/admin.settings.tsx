import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageHeader } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { adminGetAppConfig, adminSetAppConfig } from "@/lib/cms-super.functions";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

type Row = { key: string; value: unknown; updated_at?: string };

function SettingsPage() {
  const qc = useQueryClient();
  const get = useServerFn(adminGetAppConfig);
  const set = useServerFn(adminSetAppConfig);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "config"], queryFn: () => get() });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    if (!data) return;
    const d: Record<string, string> = {};
    for (const r of data as Row[]) d[r.key] = JSON.stringify(r.value, null, 2);
    setDrafts(d);
  }, [data]);

  if (isLoading || !data) return <PageLoader label="Loading settings" />;

  async function save(key: string) {
    try {
      const parsed = JSON.parse(drafts[key]);
      await set({ data: { key, value: parsed } });
      toast.success(`Saved ${key}`);
      qc.invalidateQueries({ queryKey: ["admin", "config"] });
    } catch (e) { toast.error(`Invalid JSON: ${(e as Error).message}`); }
  }

  async function create() {
    if (!newKey) return toast.error("Key required");
    try {
      const parsed = JSON.parse(newValue || "null");
      await set({ data: { key: newKey, value: parsed } });
      toast.success("Config added");
      setNewKey(""); setNewValue("");
      qc.invalidateQueries({ queryKey: ["admin", "config"] });
    } catch (e) { toast.error(`Invalid JSON: ${(e as Error).message}`); }
  }

  return (
    <>
      <AdminPageHeader title="Platform settings" description="Values are JSON. Known keys: ai_daily_limit_free, ai_daily_limit_premium." />
      <div className="space-y-3">
        {(data as Row[]).map((r) => (
          <Card key={r.key}><CardContent className="grid gap-2 p-4 sm:grid-cols-[220px_1fr_auto] sm:items-start">
            <div>
              <div className="font-mono text-sm font-medium">{r.key}</div>
              {r.updated_at && <div className="text-[10px] text-muted-foreground">updated {new Date(r.updated_at).toLocaleString()}</div>}
            </div>
            <Textarea
              rows={3}
              className="font-mono text-xs"
              value={drafts[r.key] ?? ""}
              onChange={(e) => setDrafts({ ...drafts, [r.key]: e.target.value })}
            />
            <Button size="sm" onClick={() => save(r.key)}>Save</Button>
          </CardContent></Card>
        ))}
      </div>
      <Card className="mt-6"><CardContent className="grid gap-2 p-4 sm:grid-cols-[220px_1fr_auto]">
        <Input placeholder="new_key" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="font-mono" />
        <Textarea rows={2} placeholder='JSON value, e.g. 100 or "text" or {"a":1}' value={newValue} onChange={(e) => setNewValue(e.target.value)} className="font-mono text-xs" />
        <Button size="sm" onClick={create}>Add</Button>
      </CardContent></Card>
    </>
  );
}
