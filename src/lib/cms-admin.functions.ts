/**
 * Admin-only CMS server functions. Every handler verifies the caller is an admin
 * via has_role() before mutating.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

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
    const { data: row, error } = await context.supabase
      .from("lessons")
      .upsert(data, { onConflict: "id" })
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
      await context.supabase.rpc("increment_xp", { _uid: context.userId, _xp: data.xp }).catch(() => {});
    }
    return { ok: true };
  });
