/**
 * LessonEditor — Tiptap-based rich editor used in the CMS.
 * Stores Tiptap JSON in `lessons.content` (jsonb). Includes toolbar for
 * headings, formatting, lists, blockquote, code block, tables, images
 * (from media library), YouTube embeds, callouts, and downloadable files.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link as LinkExt } from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Youtube } from "@tiptap/extension-youtube";
import { Placeholder } from "@tiptap/extension-placeholder";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Table as TableIcon, Image as ImageIcon,
  Youtube as YoutubeIcon, Link2, Undo, Redo, Upload, FileText,
} from "lucide-react";
import { toast } from "sonner";

export type LessonContent = JSONContent;

function ToolbarBtn({
  onClick, active, disabled, title, children,
}: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button" title={title} onClick={onClick} disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 ${active ? "bg-accent text-foreground" : ""}`}
    >{children}</button>
  );
}

async function uploadToStorage(file: File, kind: "image" | "file"): Promise<{ publicUrl: string; storagePath: string; bucket: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not signed in");
  const bucket = kind === "image" ? "course-media" : "lesson-files";
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined, upsert: false,
  });
  if (error) throw error;
  // Register in media_assets so it shows in the library.
  await supabase.from("media_assets").insert({
    owner_id: uid, bucket, storage_path: path, mime: file.type || null,
    size_bytes: file.size, kind, original_name: file.name,
  }).then(() => undefined, () => undefined);
  if (bucket === "course-media") {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { publicUrl: data.publicUrl, storagePath: path, bucket };
  }
  const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  return { publicUrl: signed?.signedUrl ?? "", storagePath: path, bucket };
}

export function LessonEditor({
  initialContent, onChange, autosaveMs = 2000,
}: {
  initialContent: LessonContent | null;
  onChange: (json: LessonContent) => void | Promise<void>;
  autosaveMs?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: "rounded-md bg-muted p-3 font-mono text-sm" } } }),
      Placeholder.configure({ placeholder: "Start writing your lesson… Use the toolbar to add headings, images, tables, videos, and downloadable files." }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg my-4" } }),
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "my-4 w-full border-collapse text-sm" } }),
      TableRow, TableHeader, TableCell,
      Youtube.configure({ HTMLAttributes: { class: "my-4 aspect-video w-full rounded-lg" }, width: 640, height: 360 }),
    ],
    content: initialContent ?? { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[400px] px-4 py-4",
      },
    },
    onUpdate({ editor: ed }) {
      const json = ed.getJSON();
      setSaving("saving");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        try { await onChange(json); setSaving("saved"); }
        catch (e) { toast.error((e as Error).message ?? "Save failed"); setSaving("idle"); }
      }, autosaveMs);
    },
  });

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const insertImage = useCallback(async (file: File) => {
    if (!editor) return;
    try {
      const { publicUrl } = await uploadToStorage(file, "image");
      editor.chain().focus().setImage({ src: publicUrl, alt: file.name }).run();
    } catch (e) { toast.error((e as Error).message ?? "Upload failed"); }
  }, [editor]);

  const insertFile = useCallback(async (file: File) => {
    if (!editor) return;
    try {
      const { publicUrl } = await uploadToStorage(file, "file");
      const label = `📎 ${file.name}`;
      editor.chain().focus()
        .insertContent({ type: "paragraph", content: [
          { type: "text", text: label, marks: [{ type: "link", attrs: { href: publicUrl, target: "_blank" } }] },
        ] }).run();
    } catch (e) { toast.error((e as Error).message ?? "Upload failed"); }
  }, [editor]);

  const insertYoutube = useCallback(() => {
    if (!editor) return;
    const url = prompt("YouTube URL");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  const insertLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (!url) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!mounted) return <div className="rounded-lg border p-8 text-sm text-muted-foreground">Loading editor…</div>;

  return (
    <div className="rounded-lg border bg-background">
      <Toolbar
        editor={editor}
        onImage={() => imgInputRef.current?.click()}
        onFile={() => fileInputRef.current?.click()}
        onYoutube={insertYoutube}
        onLink={insertLink}
      />
      <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ""; }} />
      <input ref={fileInputRef} type="file" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) insertFile(f); e.target.value = ""; }} />
      <EditorContent editor={editor} />
      <div className="flex items-center justify-end border-t px-3 py-1.5 text-xs text-muted-foreground">
        {saving === "saving" ? "Saving…" : saving === "saved" ? "Saved" : "Ready"}
      </div>
    </div>
  );
}

function Toolbar({
  editor, onImage, onFile, onYoutube, onLink,
}: {
  editor: Editor | null;
  onImage: () => void; onFile: () => void; onYoutube: () => void; onLink: () => void;
}) {
  if (!editor) return null;
  const insertCallout = () => {
    editor.chain().focus().insertContent({
      type: "blockquote",
      content: [{ type: "paragraph", content: [{ type: "text", text: "💡 Tip: " }] }],
    }).run();
  };
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1.5">
      <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo className="h-4 w-4" /></ToolbarBtn>
      <Divider />
      <ToolbarBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolbarBtn>
      <Divider />
      <ToolbarBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Strike" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="h-4 w-4" /></ToolbarBtn>
      <Divider />
      <ToolbarBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Callout / quote" active={editor.isActive("blockquote")} onClick={insertCallout}><Quote className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarBtn>
      <Divider />
      <ToolbarBtn title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Link" active={editor.isActive("link")} onClick={onLink}><Link2 className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Insert image" onClick={onImage}><ImageIcon className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Embed YouTube" onClick={onYoutube}><YoutubeIcon className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn title="Upload downloadable file" onClick={onFile}><FileText className="h-4 w-4" /></ToolbarBtn>
      <div className="ml-auto flex items-center gap-1 pr-1 text-xs text-muted-foreground">
        <Upload className="h-3 w-3" /> auto-save
      </div>
    </div>
  );
}

function Divider() { return <div className="mx-1 h-5 w-px bg-border" />; }
