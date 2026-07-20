/**
 * Student-facing learning server functions.
 * Quiz runner, progress lookup, certificate issuance.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";

function serverPublic() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// -------------------- Quiz (public: no is_correct) --------------------
export const getLessonQuiz = createServerFn({ method: "GET" })
  .inputValidator((d: { lessonId: string }) => ({ lessonId: String(d.lessonId) }))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: quiz } = await sb
      .from("quizzes")
      .select("id, lesson_id, course_id, title, description, pass_score, xp_reward, status")
      .eq("lesson_id", data.lessonId)
      .eq("status", "published")
      .maybeSingle();
    if (!quiz) return null;

    const { data: questions } = await sb
      .from("quiz_questions")
      .select("id, kind, prompt, points, sort_order")
      .eq("quiz_id", quiz.id)
      .order("sort_order");

    const qIds = (questions ?? []).map((q) => q.id);
    let answers: Array<{ id: string; question_id: string; text: string; sort_order: number }> = [];
    if (qIds.length) {
      const { data: a } = await sb
        .from("quiz_answers")
        .select("id, question_id, text, sort_order")
        .in("question_id", qIds)
        .order("sort_order");
      answers = (a ?? []) as typeof answers;
    }
    return { quiz, questions: questions ?? [], answers };
  });

type SubmittedAnswer = {
  question_id: string;
  // For multiple_choice / true_false: one answer id.
  // For multi_select: array of answer ids.
  // For short_answer: text.
  answer_ids?: string[];
  text?: string;
};

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { quiz_id: string; answers: SubmittedAnswer[] }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: quiz, error: qErr } = await supabaseAdmin
      .from("quizzes")
      .select("id, lesson_id, course_id, pass_score, xp_reward")
      .eq("id", data.quiz_id)
      .maybeSingle();
    if (qErr) throw new Error(qErr.message);
    if (!quiz) throw new Error("Quiz not found");

    const { data: questions } = await supabaseAdmin
      .from("quiz_questions")
      .select("id, kind, points")
      .eq("quiz_id", quiz.id);
    const qIds = (questions ?? []).map((q) => q.id);
    const { data: allAnswers } = await supabaseAdmin
      .from("quiz_answers")
      .select("id, question_id, text, is_correct")
      .in("question_id", qIds.length ? qIds : ["00000000-0000-0000-0000-000000000000"]);

    let score = 0;
    let max = 0;
    const breakdown: Array<{ question_id: string; correct: boolean; points: number }> = [];
    for (const q of questions ?? []) {
      const points = q.points ?? 1;
      max += points;
      const sub = data.answers.find((a) => a.question_id === q.id);
      const correctAnswers = (allAnswers ?? []).filter((a) => a.question_id === q.id && a.is_correct);
      let correct = false;
      if (!sub) {
        correct = false;
      } else if (q.kind === "multiple_choice" || q.kind === "true_false") {
        const picked = sub.answer_ids?.[0];
        correct = !!picked && correctAnswers.some((a) => a.id === picked);
      } else if (q.kind === "multiple_select") {
        const picked = new Set(sub.answer_ids ?? []);
        const correctIds = new Set(correctAnswers.map((a) => a.id));
        correct =
          picked.size === correctIds.size && [...picked].every((id) => correctIds.has(id));
      } else if (q.kind === "short_answer") {
        const val = (sub.text ?? "").trim().toLowerCase();
        correct = !!val && correctAnswers.some((a) => a.text.trim().toLowerCase() === val);
      }
      if (correct) score += points;
      breakdown.push({ question_id: q.id, correct, points });
    }

    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
    const passed = pct >= (quiz.pass_score ?? 70);

    // Record attempt (RLS: user can insert own)
    await context.supabase.from("quiz_results").insert({
      user_id: context.userId,
      quiz_id: quiz.id,
      score,
      max_score: max,
      passed,
      answers: data.answers as unknown as never,
    });

    // Award XP once (first passing attempt)
    if (passed && (quiz.xp_reward ?? 0) > 0) {
      const { data: prior } = await context.supabase
        .from("quiz_results")
        .select("id")
        .eq("user_id", context.userId)
        .eq("quiz_id", quiz.id)
        .eq("passed", true);
      if ((prior?.length ?? 0) <= 1) {
        // Atomically increment XP using increment_profile_xp RPC (uses auth.uid() internally)
        const { error: rpcErr } = await context.supabase.rpc("increment_profile_xp", {
          _xp: quiz.xp_reward ?? 0,
        });
        if (rpcErr) throw new Error(rpcErr.message || "Failed to increment xp");
      }
    }

    return { score, max, percent: pct, passed, breakdown, pass_score: quiz.pass_score ?? 70 };
  });

// -------------------- Progress --------------------
export const getCourseProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { course_id: string }) => ({ course_id: String(d.course_id) }))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("lesson_progress")
      .select("lesson_id, completed, completed_at, xp_earned")
      .eq("user_id", context.userId)
      .eq("course_id", data.course_id);

    const { data: quizRows } = await context.supabase
      .from("quiz_results")
      .select("quiz_id, passed, score, max_score")
      .eq("user_id", context.userId);

    return {
      completed_lesson_ids: (rows ?? []).filter((r) => r.completed).map((r) => r.lesson_id),
      total_xp: (rows ?? []).reduce((s, r) => s + (r.xp_earned ?? 0), 0),
      passed_quiz_ids: (quizRows ?? []).filter((r) => r.passed).map((r) => r.quiz_id),
    };
  });

// -------------------- Certificate --------------------
export const issueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { course_id: string }) => ({ course_id: String(d.course_id) }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Already issued?
    const { data: existing } = await supabaseAdmin
      .from("issued_certificates")
      .select("id, serial, issued_at")
      .eq("user_id", context.userId)
      .eq("course_id", data.course_id)
      .maybeSingle();
    if (existing) return existing;

    // Count published lessons in course.
    const { data: modules } = await supabaseAdmin
      .from("modules").select("id").eq("course_id", data.course_id).eq("status", "published");
    const moduleIds = (modules ?? []).map((m) => m.id);
    if (!moduleIds.length) throw new Error("Course has no published modules");
    const { data: lessons } = await supabaseAdmin
      .from("lessons").select("id").in("module_id", moduleIds).eq("status", "published");
    const lessonIds = new Set((lessons ?? []).map((l) => l.id));
    if (!lessonIds.size) throw new Error("Course has no published lessons");

    const { data: progress } = await supabaseAdmin
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("user_id", context.userId)
      .eq("course_id", data.course_id);
    const completed = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id));
    for (const id of lessonIds) if (!completed.has(id)) throw new Error("Course not yet complete");

    const serial = `CL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { data: row, error } = await supabaseAdmin
      .from("issued_certificates")
      .insert({ user_id: context.userId, course_id: data.course_id, serial })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getCertificateBySerial = createServerFn({ method: "GET" })
  .inputValidator((d: { serial: string }) => ({ serial: String(d.serial) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cert } = await supabaseAdmin
      .from("issued_certificates")
      .select("id, user_id, course_id, serial, issued_at")
      .eq("serial", data.serial)
      .maybeSingle();
    if (!cert) return null;
    const [{ data: course }, { data: profile }, { data: tpl }] = await Promise.all([
      supabaseAdmin.from("courses").select("id, title, slug").eq("id", cert.course_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("full_name").eq("id", cert.user_id).maybeSingle(),
      supabaseAdmin.from("certificate_templates").select("title, body_template").eq("course_id", cert.course_id).maybeSingle(),
    ]);
    return { cert, course, profile, template: tpl };
  });
