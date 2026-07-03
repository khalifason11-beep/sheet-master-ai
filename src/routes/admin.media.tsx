import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Trash2, Copy, FileText, Image as ImageIcon, FileSpreadsheet } from "lucide-react";
import {
  adminListMedia, registerMediaAsset, deleteMediaAsset, signMediaUrl,
} from "@/lib/cms-admin.functions";

export const Route = createFileRoute("/admin/media")({
  head: () => ({ meta: [{ title: "Media library — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: MediaLibrary,
});

type MediaRow = {
  id: string; bucket: string; storage_path: string; mime: string | null;
  size_bytes: number | null; kind: string; original_name: string | null; alt: string | null;
  created_at: string;
};

function kindFromMime(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return "spreadsheet";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

function bucketFor(kind: string): "course-media" | "lesson-files" {
  return kind === "image" ? "course-media" : "lesson-files";
}

function KindIcon({ kind }: { kind: string }) {
  if (kind === "image") return <ImageIcon className="h-5 w-5" />;
  if (kind === "spreadsheet") return <FileSpreadsheet className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

function MediaLibrary() {
  const qc = useQueryClient();
  const list = useServerFn(adminListMedia);
  const register = useServerFn(registerMediaAsset);
  const del = useServerFn(deleteMediaAsset);
  const sign = useServerFn(signMediaUrl);
  const [kindFilter, setKindFilter] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: media, isLoading } = useQuery({
    queryKey: ["admin", "media", kindFilter],
    queryFn: () => list({ data: { kind: kindFilter || undefined } }),
  });

  async function handleUpload(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      for (const file of Array.from(files)) {
        const kind = kindFromMime(file.type || "");
        const bucket = bucketFor(kind);
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
          contentType: file.type || undefined, upsert: false,
        });
        if (upErr) throw upErr;
        await register({ data: {
          bucket, storage_path: path, mime: file.type || null, size_bytes: file.size,
          kind, original_name: file.name,
        } });
      }
      toast.success(`Uploaded ${files.length} file${files.length > 1 ? "s" : ""}`);
      qc.invalidateQueries({ queryKey: ["admin", "media"] });
    } catch (e) { toast.error((e as Error).message ?? "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function copyUrl(row: MediaRow) {
    try {
      if (row.bucket === "course-media") {
        const { data } = supabase.storage.from(row.bucket).getPublicUrl(row.storage_path);
        await navigator.clipboard.writeText(data.publicUrl);
      } else {
        const r = await sign({ data: { bucket: row.bucket, path: row.storage_path, expiresIn: 3600 } });
        await navigator.clipboard.writeText((r as { url: string }).url);
      }
      toast.success("URL copied");
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
  }

  return (
    <>
      <AdminPageHeader
        title="Media library"
        description="Upload course thumbnails, exercise Excel files, PDFs, and videos. Files are stored in Lovable Cloud and can be reused across lessons."
        actions={
          <>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
            >
              <option value="">All types</option>
              <option value="image">Images</option>
              <option value="spreadsheet">Spreadsheets</option>
              <option value="pdf">PDFs</option>
              <option value="video">Videos</option>
              <option value="other">Other</option>
            </select>
            <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> {uploading ? "Uploading…" : "Upload files"}
            </Button>
            <Input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </>
        }
      />

      {isLoading ? <PageLoader label="Loading media" /> :
        (media ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center text-sm text-muted-foreground">
            No media yet. Upload your first file above.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(media as MediaRow[]).map((m) => (
              <Card key={m.id} className="overflow-hidden">
                <div className="flex h-32 items-center justify-center bg-accent/50">
                  {m.kind === "image" ? (
                    <img
                      src={supabase.storage.from(m.bucket).getPublicUrl(m.storage_path).data.publicUrl}
                      alt={m.alt ?? m.original_name ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <KindIcon kind={m.kind} />
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{m.original_name ?? m.storage_path}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{m.kind}</Badge>
                        {m.size_bytes ? <span>· {(m.size_bytes / 1024).toFixed(0)} KB</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => copyUrl(m)}>
                      <Copy className="mr-1 h-3 w-3" /> URL
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Delete "${m.original_name ?? m.storage_path}"?`)) return;
                        await del({ data: { id: m.id } });
                        qc.invalidateQueries({ queryKey: ["admin", "media"] });
                      }}
                    ><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }
    </>
  );
}
