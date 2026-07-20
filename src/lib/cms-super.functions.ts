/**
 * Super-admin server functions. Every handler verifies the caller is a
 * super_admin via has_role() before touching privileged data. Uses the
 * service-role client (dynamic import — never at module scope) to read across
 * users for admin dashboards.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  // Use the service-role client to call this RPC because the database
  // explicitly grants EXECUTE only to the service role (see migrations).
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("is_super_admin", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// ---- Users & roles ----
type Role = "editor" | "admin" | "super_admin";

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { page?: number; perPage?: number; search?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const page = data.page ?? 1;
    const perPage = data.perPage ?? 50;
    const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const ids = usersData.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, avatar_url, plan, xp, level, last_active").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const roleMap = new Map<string, string[]>();
    for (const r of (roles ?? []) as { user_id: string; role: string }[]) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    let rows = usersData.users.map((u) => {
      const p = profileMap.get(u.id) as any;
      return {
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        plan: p?.plan ?? "free",
        xp: p?.xp ?? 0,
        level: p?.level ?? 1,
        last_active: p?.last_active ?? null,
        roles: roleMap.get(u.id) ?? [],
      };
    });
    if (data.search) {
      const q = data.search.toLowerCase();
      rows = rows.filter((r) =>
        (r.email ?? "").toLowerCase().includes(q) || (r.full_name ?? "").toLowerCase().includes(q),
      );
    }
    return { users: rows, total: (usersData as any).total ?? rows.length, page, perPage };
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: Role; grant: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Safety: never let a super_admin remove their own super_admin role
    // (avoids locking the platform out).
    if (data.role === "super_admin" && !data.grant && data.userId === context.userId) {
      throw new Error("You cannot revoke your own super_admin role.");
    }
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete yourself.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Analytics ----
export const adminGetAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 14 * 86400_000).toISOString();
    const [users, courses, lessons, completions, activeSubs, recentCompletions, recentUsers] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("courses").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("lessons").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("lesson_progress").select("*", { count: "exact", head: true }).eq("completed", true),
      supabaseAdmin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("lesson_progress").select("completed_at").eq("completed", true).gte("completed_at", since),
      supabaseAdmin.from("profiles").select("created_at").gte("created_at", since),
    ]);

    const bucket = (rows: { created_at?: string; completed_at?: string }[] | null, key: "created_at" | "completed_at") => {
      const map = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
        map.set(d, 0);
      }
      for (const r of rows ?? []) {
        const v = (r as any)[key];
        if (!v) continue;
        const d = v.slice(0, 10);
        if (map.has(d)) map.set(d, (map.get(d) ?? 0) + 1);
      }
      return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
    };

    return {
      totals: {
        users: users.count ?? 0,
        courses: courses.count ?? 0,
        lessons: lessons.count ?? 0,
        completions: completions.count ?? 0,
        activeSubscriptions: activeSubs.count ?? 0,
      },
      signupsTrend: bucket(recentUsers.data as any, "created_at"),
      completionsTrend: bucket(recentCompletions.data as any, "completed_at"),
    };
  });

// ---- AI usage ----
export const adminGetAiUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number } = {}) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
    const { data: rows, error } = await supabaseAdmin
      .from("ai_usage_daily")
      .select("user_id, day, message_count")
      .gte("day", since)
      .order("day", { ascending: false });
    if (error) throw new Error(error.message);

    const byDay = new Map<string, number>();
    const byUser = new Map<string, number>();
    for (const r of (rows ?? []) as { user_id: string; day: string; message_count: number }[]) {
      byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.message_count);
      byUser.set(r.user_id, (byUser.get(r.user_id) ?? 0) + r.message_count);
    }
    const topUserIds = Array.from(byUser.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const ids = topUserIds.map(([id]) => id);
    let topUsers: { user_id: string; email: string | null; full_name: string | null; messages: number }[] = [];
    if (ids.length) {
      const [{ data: profiles }, { data: usersData }] = await Promise.all([
        supabaseAdmin.from("profiles").select("id, full_name").in("id", ids),
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      ]);
      const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
      const emailMap = new Map((usersData?.users ?? []).map((u) => [u.id, u.email ?? null]));
      topUsers = topUserIds.map(([id, count]) => ({
        user_id: id,
        email: emailMap.get(id) ?? null,
        full_name: (nameMap.get(id) as string | null) ?? null,
        messages: count,
      }));
    }
    return {
      totalMessages: Array.from(byDay.values()).reduce((a, b) => a + b, 0),
      trend: Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([day, count]) => ({ day, count })),
      topUsers,
    };
  });

// ---- Subscriptions ----nexport const adminListSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const ids = (subs ?? []).map((s: any) => s.user_id);
    let emailMap = new Map<string, string | null>();
    let nameMap = new Map<string, string | null>();
    if (ids.length) {
      const [{ data: profiles }, { data: usersData }] = await Promise.all([
        supabaseAdmin.from("profiles").select("id, full_name").in("id", ids),
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      ]);
      nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
      emailMap = new Map((usersData?.users ?? []).map((u) => [u.id, u.email ?? null]));
    }
    return (subs ?? []).map((s: any) => ({
      ...s,
      email: emailMap.get(s.user_id) ?? null,
      full_name: nameMap.get(s.user_id) ?? null,
    }));
  });

// ---- Certificates ----
export const adminListCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: templates }, { data: issued }, { data: courses }] = await Promise.all([
      supabaseAdmin.from("certificate_templates").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("issued_certificates").select("*").order("issued_at", { ascending: false }).limit(200),
      supabaseAdmin.from("courses").select("id, title, slug"),
    ]);
    return { templates: templates ?? [], issued: issued ?? [], courses: courses ?? [] };
  });

export const adminUpsertCertificateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; course_id: string; title: string; body_template: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("certificate_templates")
      .upsert(data, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteCertificateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("certificate_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- App settings ----
export const adminGetAppConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("app_config").select("*").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSetAppConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: unknown }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("app_config")
      .upsert({ key: data.key, value: data.value as any }, { onConflict: "key" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
