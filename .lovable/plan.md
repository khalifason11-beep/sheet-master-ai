## Phase 5 CMS — Delivery Plan

The existing foundation (courses / modules / lessons / quizzes / lesson_progress tables + Super Admin gate + basic admin pages) already covers ~30% of the ask. Rather than rewrite everything in one pass, I'll extend it in three focused milestones so each is reviewable.

---

### Milestone 5B — Schema hardening, Media Library, Exercises, Drag-and-drop (this turn)

**Database migration**
- Extend `courses` with `thumbnail_path`, `prerequisite_course_id`, `scheduled_publish_at`.
- New `exercises` table (lesson_id, title, instructions, expected_outcome, difficulty, hints[], file_path, sort_order, status).
- New `media_assets` table (owner_id, storage_path, bucket, mime, size, kind, original_name, alt) — canonical registry so files can be replaced without breaking lessons (lessons reference `media_id`, storage path resolved at render).
- New `editor_role` in `app_role` enum ('editor') — can edit content, cannot access settings/users/subscriptions.
- Storage buckets: `course-media` (public, images/thumbnails), `lesson-files` (private, Excel/PDF/ZIP practice files, signed URLs).
- RLS: published-only for anon; editor OR admin OR super_admin can write content; only super_admin can manage users/roles/settings. GRANTs on every new table.
- `has_cms_write()` SQL helper → true if user has any of editor/admin/super_admin.

**Server functions**
- `src/lib/cms-admin.functions.ts` — add exercise CRUD, media upload/list/delete (signed upload URLs), reorder for exercises, switch `assertAdmin` → `assertCmsWriter` (keep `assertSuperAdmin` for user/settings mutations).
- `src/lib/media.functions.ts` — issue signed upload URLs, list/paginate media, replace file (keeps same `media_id`).

**Admin UI**
- `/admin` — convert to a shell with sidebar nav (Courses · Modules · Lessons · Exercises · Quizzes · Certificates · Media · Users · Analytics · AI Usage · Subscriptions · Settings). Each section is a nested route under `/admin/*`.
- `/admin/courses/$courseId` — add thumbnail upload, prerequisite selector, drag-and-drop module reorder (@dnd-kit).
- `/admin/courses/$courseId/modules/$moduleId` — new page with drag-and-drop lesson reorder, per-lesson exercise list.
- `/admin/media` — grid view, upload, replace, delete, copy URL, filter by kind.
- Draft / Published / Archived status pills + bulk publish/unpublish everywhere.

**Deliverable:** full skeleton + media pipeline + drag-and-drop + exercises. Lesson body still uses the existing JSON block editor (upgraded in 5C).

---

### Milestone 5C — Rich Lesson Editor + Quiz Builder (next turn, after approval)

- Tiptap-based Notion-style editor (`@tiptap/react` + starter kit + table, image, code-block, task-list, youtube, callout custom nodes, formula inline mark).
- Autosave every 3s with debounced `upsertLesson`, visible "Saving… / Saved" indicator.
- Slash menu for block insertion, drag handles, image upload via media library, YouTube embed by URL.
- Quiz Builder UI: question list with add/edit/reorder, choice/true-false/multi-select/fill-in-blank types, per-question explanation + XP, quiz-level passing score and retry policy.
- Student-side quiz runner + result recording into `quiz_results` (already exists).

---

### Milestone 5D — Dashboard, Analytics, RBAC UI, Certificates, Settings

- `/admin` overview: KPI cards (users, active courses, lesson completions 7d, AI usage), recent activity.
- `/admin/users` — list, search, assign editor / admin / super_admin (super_admin only), plan override.
- `/admin/analytics` — course completion funnel, per-lesson drop-off, popular content.
- `/admin/certificates` — template editor, issued certificates browser.
- `/admin/settings` — app_config editor (AI daily limits, XP multipliers).
- `/admin/subscriptions` and `/admin/ai-usage` read-only views.
- Editor-scoped nav (hide Users / Settings / Subscriptions for editor role).

---

### Technical notes
- Uses TanStack Start `createServerFn` + `requireSupabaseAuth`; every mutation re-checks role server-side via `has_role` / `has_cms_write`.
- Media uses Supabase Storage signed upload URLs so large files don't stream through server functions.
- Drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable` (lightweight, accessible).
- No mock data; all content read from Supabase.
- Schema stays vertical-agnostic (Excel/Word/SQL/Python) — `courses.category` is a free text field, no Excel-specific columns.

---

**Proceeding with Milestone 5B now.** Reply "continue" after review to move on to 5C.
