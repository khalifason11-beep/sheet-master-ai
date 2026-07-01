/**
 * Public read-only CMS server functions.
 * Uses server publishable client + RLS (published-only policies).
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function serverPublic() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const listPublishedCourses = createServerFn({ method: "GET" }).handler(async () => {
  const sb = serverPublic();
  const { data, error } = await sb
    .from("courses")
    .select("id, slug, title, description, category, difficulty, estimated_min, xp_reward, cover_url, sort_order")
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getCourseBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: String(d.slug) }))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: course, error } = await sb
      .from("courses")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!course) return null;

    const { data: modules } = await sb
      .from("modules")
      .select("id, slug, title, description, sort_order")
      .eq("course_id", course.id)
      .eq("status", "published")
      .order("sort_order");

    const moduleIds = (modules ?? []).map((m) => m.id);
    const { data: lessons } = moduleIds.length
      ? await sb
          .from("lessons")
          .select("id, module_id, slug, title, summary, estimated_min, xp_reward, sort_order")
          .in("module_id", moduleIds)
          .eq("status", "published")
          .order("sort_order")
      : { data: [] as unknown[] };

    return { course, modules: modules ?? [], lessons: lessons ?? [] };
  });

export const getLessonBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { courseSlug: string; lessonSlug: string }) => ({
    courseSlug: String(d.courseSlug),
    lessonSlug: String(d.lessonSlug),
  }))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: course } = await sb
      .from("courses")
      .select("id, slug, title")
      .eq("slug", data.courseSlug)
      .eq("status", "published")
      .maybeSingle();
    if (!course) return null;

    const { data: modules } = await sb
      .from("modules")
      .select("id, slug, title, sort_order")
      .eq("course_id", course.id)
      .eq("status", "published")
      .order("sort_order");
    const moduleIds = (modules ?? []).map((m) => m.id);
    if (!moduleIds.length) return null;

    const { data: allLessons } = await sb
      .from("lessons")
      .select("id, module_id, slug, title, summary, objectives, content, estimated_min, xp_reward, sort_order, prerequisite_lesson_id")
      .in("module_id", moduleIds)
      .eq("status", "published")
      .order("sort_order");

    const ordered = (allLessons ?? []).slice().sort((a: any, b: any) => {
      const ma = modules!.find((m) => m.id === a.module_id)?.sort_order ?? 0;
      const mb = modules!.find((m) => m.id === b.module_id)?.sort_order ?? 0;
      return ma - mb || a.sort_order - b.sort_order;
    });
    const idx = ordered.findIndex((l: any) => l.slug === data.lessonSlug);
    if (idx === -1) return null;
    const lesson = ordered[idx] as any;
    return {
      course,
      lesson,
      prev: idx > 0 ? ordered[idx - 1] : null,
      next: idx < ordered.length - 1 ? ordered[idx + 1] : null,
      module: modules!.find((m) => m.id === lesson.module_id) ?? null,
    };
  });
