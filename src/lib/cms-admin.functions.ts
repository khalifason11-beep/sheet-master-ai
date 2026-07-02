/**
 * CMS server functions. Content mutations require an editor/admin/super_admin
 * role (has_cms_write). System-level operations (roles, app settings) require
 * super_admin. Every handler re-verifies role server-side before mutating.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertCmsWriter(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_cms_write", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// Alias so all existing call sites keep working. Content writers include editors.
const assertAdmin = assertCmsWriter;

// ---- Bootstrap ----
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_first_admin");
    if (error) throw new Error(error.message);
    return { claimed: !!data };
  });

// ---- Courses ----
export const adminListCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("courses")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    slug: string;
    title: string;
    description?: string | null;
    category?: string | null;
    difficulty?: "beginner" | "intermediate" | "advanced";
    estimated_min?: number;
    xp_reward?: number;
    cover_url?: string | null;
    thumbnail_path?: string | null;
    prerequisite_course_id?: string | null;
    scheduled_publish_at?: string | null;
    status?: "draft" | "published" | "archived";
    sort_order?: number;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload: any = { ...data, created_by: context.userId };
    if (data.status === "published") payload.published_at = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("courses")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("courses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Modules ----
export const adminListModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { courseId: string }) => ({ courseId: String(d.courseId) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("modules")
      .select("*")
      .eq("course_id", data.courseId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    course_id: string;
    slug: string;
    title: string;
    description?: string | null;
    sort_order?: number;
    status?: "draft" | "published" | "archived";
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("modules")
      .upsert(data, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("modules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Lessons ----
export const adminListLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { moduleId: string }) => ({ moduleId: String(d.moduleId) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("lessons")
      .select("*")
      .eq("module_id", data.moduleId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminGetLesson = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("lessons")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const upsertLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    module_id: string;
    slug: string;
    title: string;
    summary?: string | null;
    objectives?: string[];
    content?: unknown;
    estimated_min?: number;
    xp_reward?: number;
    sort_order?: number;
    status?: "draft" | "published" | "archived";
    prerequisite_lesson_id?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { ...data, content: (data.content ?? []) as any };
    const { data: row, error } = await context.supabase
      .from("lessons")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: "courses" | "modules" | "lessons"; ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const updates = data.ids.map((id, i) =>
      context.supabase.from(data.table).update({ sort_order: i }).eq("id", id),
    );
    const results = await Promise.all(updates);
    for (const r of results) if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

// ---- Learning progress ----
export const markLessonComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lesson_id: string; course_id?: string | null; module_id?: string | null; xp?: number }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lesson_progress").upsert(
      {
        user_id: context.userId,
        lesson_id: data.lesson_id,
        course_id: data.course_id ?? null,
        module_id: data.module_id ?? null,
        completed: true,
        completed_at: new Date().toISOString(),
        xp_earned: data.xp ?? 0,
      },
      { onConflict: "user_id,lesson_id" },
    );
    if (error) throw new Error(error.message);
    if (data.xp && data.xp > 0) {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("xp")
        .eq("id", context.userId)
        .maybeSingle();
      const current = (prof as { xp?: number } | null)?.xp ?? 0;
      await context.supabase.from("profiles").update({ xp: current + data.xp }).eq("id", context.userId);
    }
    return { ok: true };
  });

// ---- Exercises ----
export const adminListExercises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lessonId: string }) => ({ lessonId: String(d.lessonId) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("exercises")
      .select("*")
      .eq("lesson_id", data.lessonId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    lesson_id: string;
    title: string;
    instructions?: string | null;
    expected_outcome?: string | null;
    difficulty?: "beginner" | "intermediate" | "advanced";
    hints?: string[];
    file_path?: string | null;
    sort_order?: number;
    status?: "draft" | "published" | "archived";
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("exercises")
      .upsert(data, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("exercises").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Media library ----
export const adminListMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind?: string; limit?: number } = {}) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase.from("media_assets").select("*").order("created_at", { ascending: false }).limit(data.limit ?? 100);
    if (data.kind) q = q.eq("kind", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const registerMediaAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    bucket: string;
    storage_path: string;
    mime?: string | null;
    size_bytes?: number | null;
    kind?: string;
    original_name?: string | null;
    alt?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("media_assets")
      .upsert(
        { ...data, kind: data.kind ?? "other", owner_id: context.userId },
        { onConflict: "bucket,storage_path" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMediaAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("media_assets")
      .select("bucket, storage_path")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    // Best-effort remove from storage; ignore missing objects.
    await context.supabase.storage.from(row.bucket).remove([row.storage_path]);
    const { error: delErr } = await context.supabase.from("media_assets").delete().eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });

export const signMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bucket: string; path: string; expiresIn?: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: signed, error } = await context.supabase.storage
      .from(data.bucket)
      .createSignedUrl(data.path, data.expiresIn ?? 3600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
