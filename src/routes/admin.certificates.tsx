import { useState } from "react";
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
import { Trash2, Plus } from "lucide-react";
import {
  adminListCertificates,
  adminUpsertCertificateTemplate,
  adminDeleteCertificateTemplate,
} from "@/lib/cms-super.functions";

export const Route = createFileRoute("/admin/certificates")({
  head: () => ({ meta: [{ title: "Certificates — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListCertificates);
  const upsert = useServerFn(adminUpsertCertificateTemplate);
  const del = useServerFn(adminDeleteCertificateTemplate);

  const { data, isLoading } = useQuery({ queryKey: ["admin", "certs"], queryFn: () => list() });
  const [form, setForm] = useState({ course_id: "", title: "", body_template: "This certifies that {{full_name}} has completed {{course_title}} on {{date}}." });

  if (isLoading || !data) return <PageLoader label="Loading certificates" />;

  const courseName = (id: string) => (data.courses.find((c: any) => c.id === id)?.title as string) ?? id;

  return (
    <>
      <AdminPageHeader title="Certificates" description="Templates awarded on course completion. Available placeholders: {{full_name}}, {{course_title}}, {{date}}." />

      <Card className="mb-6"><CardContent className="grid gap-3 p-4">
        <div className="text-sm font-medium">New template</div>
        <select
          className="rounded-md border bg-transparent px-3 py-2 text-sm"
          value={form.course_id}
          onChange={(e) => setForm({ ...form, course_id: e.target.value })}
        >
          <option value="">Select a course…</option>
          {data.courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <Input placeholder="Template title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea rows={4} value={form.body_template} onChange={(e) => setForm({ ...form, body_template: e.target.value })} />
        <div>
          <Button onClick={async () => {
            if (!form.course_id || !form.title) return toast.error("Course and title required");
            try {
              await upsert({ data: form });
              toast.success("Template saved");
              setForm({ ...form, title: "", course_id: "" });
              qc.invalidateQueries({ queryKey: ["admin", "certs"] });
            } catch (e) { toast.error((e as Error).message ?? "Failed"); }
          }}><Plus className="mr-1 h-4 w-4" /> Save template</Button>
        </div>
      </CardContent></Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-0">
          <div className="border-b p-4 text-sm font-medium">Templates</div>
          <div className="divide-y">
            {data.templates.map((t: any) => (
              <div key={t.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{courseName(t.course_id)}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.body_template}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm(`Delete template "${t.title}"?`)) return;
                  await del({ data: { id: t.id } });
                  qc.invalidateQueries({ queryKey: ["admin", "certs"] });
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {data.templates.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No templates yet.</div>}
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-0">
          <div className="border-b p-4 text-sm font-medium">Recently issued</div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {data.issued.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs">{c.serial}</div>
                  <div className="truncate text-xs text-muted-foreground">{courseName(c.course_id)}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(c.issued_at).toLocaleDateString()}</div>
              </div>
            ))}
            {data.issued.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No certificates issued yet.</div>}
          </div>
        </CardContent></Card>
      </div>
    </>
  );
}
