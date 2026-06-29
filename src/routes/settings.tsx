import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowRight, Upload, FileSpreadsheet, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Cellow" }] }),
  component: SettingsPage,
});

const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv",
];
const ALLOWED_EXT = /\.(xlsx|xls|csv)$/i;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const profileSchema = z.object({
  full_name: z.string().trim().max(80).optional().nullable(),
});

interface Settings { email_notifications: boolean; weekly_digest: boolean; theme: string }
interface PracticeFile { name: string; updated_at: string | null }

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [settings, setSettings] = useState<Settings>({ email_notifications: true, weekly_digest: true, theme: "system" });
  const [files, setFiles] = useState<PracticeFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadFiles = async (uid: string) => {
    const { data } = await supabase.storage.from("practice-files").list(uid, { limit: 100, sortBy: { column: "updated_at", order: "desc" } });
    setFiles(((data ?? []) as unknown) as PracticeFile[]);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthed(false); setLoading(false); return; }
      setAuthed(true); setUserId(user.id);
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setFullName(p?.full_name ?? "");
      if (s) setSettings({ email_notifications: s.email_notifications, weekly_digest: s.weekly_digest, theme: s.theme });
      await loadFiles(user.id);
      setLoading(false);
    })();
  }, []);

  const saveProfile = async () => {
    const parsed = profileSchema.safeParse({ full_name: fullName });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { error } = await supabase.from("profiles").update({ full_name: fullName || null }).eq("id", userId);
    if (error) return toast.error("Couldn't save profile");
    toast.success("Profile saved");
    track("settings_updated", { kind: "profile" });
  };

  const saveSettings = async (next: Settings) => {
    setSettings(next);
    const { error } = await supabase.from("user_settings").upsert({ user_id: userId, ...next }, { onConflict: "user_id" });
    if (error) return toast.error("Couldn't save preferences");
    track("settings_updated", { kind: "notifications" });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > MAX_BYTES) return toast.error("File too large (max 10MB).");
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.test(file.name)) {
      return toast.error("Only .xlsx, .xls or .csv files are allowed.");
    }
    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${userId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from("practice-files").upload(path, file, { upsert: false, contentType: file.type || undefined });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("File uploaded");
    track("file_uploaded", { size: file.size, type: file.type });
    await loadFiles(userId);
  };

  const deleteFile = async (name: string) => {
    const { error } = await supabase.storage.from("practice-files").remove([`${userId}/${name}`]);
    if (error) return toast.error("Couldn't delete file");
    await loadFiles(userId);
  };

  const downloadFile = async (name: string) => {
    const { data, error } = await supabase.storage.from("practice-files").createSignedUrl(`${userId}/${name}`, 60);
    if (error || !data) return toast.error("Couldn't generate link");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Sparkles className="h-6 w-6 animate-pulse text-primary" /></div>;

  if (!authed) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="surface-card max-w-md p-8 text-center">
            <h1 className="font-display text-2xl font-bold">Sign in to manage your settings</h1>
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
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
            <p className="mt-1.5 text-muted-foreground">Manage your profile, preferences and practice files.</p>
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-3xl space-y-8 px-4 sm:px-6">
            <div className="surface-card p-6">
              <h2 className="font-display text-lg font-bold">Profile</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="fn">Display name</Label>
                  <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} className="mt-1.5" />
                </div>
                <Button onClick={saveProfile} size="sm" className="bg-gradient-brand text-primary-foreground">Save profile</Button>
              </div>
            </div>

            <div className="surface-card p-6">
              <h2 className="font-display text-lg font-bold">Notifications</h2>
              <div className="mt-4 space-y-4">
                <Row label="Product emails" desc="Updates about new lessons and features.">
                  <Switch checked={settings.email_notifications} onCheckedChange={(v) => saveSettings({ ...settings, email_notifications: v })} />
                </Row>
                <Row label="Weekly digest" desc="A short summary of your progress every Monday.">
                  <Switch checked={settings.weekly_digest} onCheckedChange={(v) => saveSettings({ ...settings, weekly_digest: v })} />
                </Row>
              </div>
            </div>

            <div className="surface-card p-6">
              <h2 className="font-display text-lg font-bold">Practice files</h2>
              <p className="mt-1 text-sm text-muted-foreground">Upload .xlsx, .xls or .csv files (max 10MB) to keep your practice data with you.</p>
              <div className="mt-4">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload file"}
                  <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
              <div className="mt-4 space-y-2">
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No files yet.</p>
                ) : files.map((f) => (
                  <div key={f.name} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                      <button onClick={() => downloadFile(f.name)} className="truncate text-sm hover:underline">{f.name.replace(/^\d+_/, "")}</button>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteFile(f.name)} aria-label="Delete file">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {children}
    </div>
  );
}
