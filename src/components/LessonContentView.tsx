/**
 * Renders Tiptap JSON as read-only HTML for students.
 * Falls back to legacy block-array format used by early lessons.
 */
import { useMemo } from "react";
import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link as LinkExt } from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Youtube } from "@tiptap/extension-youtube";

const EXTS = [StarterKit, Image, LinkExt, Table, TableRow, TableCell, TableHeader, Youtube];

interface LegacyBlock { type: string; text?: string; url?: string; items?: string[] }

export function LessonContentView({ content }: { content: unknown }) {
  const html = useMemo(() => {
    if (!content) return "";
    // Tiptap doc
    if (typeof content === "object" && content !== null && (content as { type?: string }).type === "doc") {
      try { return generateHTML(content as JSONContent, EXTS); } catch { return ""; }
    }
    // Legacy block array
    if (Array.isArray(content)) return renderLegacy(content as LegacyBlock[]);
    return "";
  }, [content]);

  if (!html) return <p className="mt-6 text-sm text-muted-foreground">This lesson has no content yet.</p>;
  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-a:text-primary"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderLegacy(blocks: LegacyBlock[]): string {
  return blocks.map((b) => {
    switch (b.type) {
      case "heading": return `<h2>${escapeHtml(b.text ?? "")}</h2>`;
      case "paragraph": return `<p>${escapeHtml(b.text ?? "")}</p>`;
      case "bullet_list": return `<ul>${(b.items ?? []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
      case "numbered_list": return `<ol>${(b.items ?? []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ol>`;
      case "quote": return `<blockquote>${escapeHtml(b.text ?? "")}</blockquote>`;
      case "callout": case "tip": case "warning": return `<blockquote>${escapeHtml(b.text ?? "")}</blockquote>`;
      case "code": case "formula": return `<pre><code>${escapeHtml(b.text ?? "")}</code></pre>`;
      case "image": return b.url ? `<img src="${b.url}" alt="" />` : "";
      case "video": return b.url ? `<div class="aspect-video"><iframe src="${b.url}" allowfullscreen></iframe></div>` : "";
      case "divider": return "<hr />";
      default: return "";
    }
  }).join("\n");
}
