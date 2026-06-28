import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AiUsage {
  used: number;
  limit: number;
  plan: "free" | "premium";
  remaining: number;
}

export function useAiUsage() {
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUsage(null);
      setLoading(false);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: profile }, { data: usageRow }, { data: cfgRows }] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
      supabase
        .from("ai_usage_daily")
        .select("message_count")
        .eq("user_id", user.id)
        .eq("day", today)
        .maybeSingle(),
      supabase
        .from("app_config")
        .select("key,value")
        .in("key", ["ai_daily_limit_free", "ai_daily_limit_premium"]),
    ]);
    const plan = ((profile?.plan as string) ?? "free") as "free" | "premium";
    const cfg = Object.fromEntries((cfgRows ?? []).map((r) => [r.key as string, r.value as number]));
    const limit =
      plan === "premium"
        ? ((cfg.ai_daily_limit_premium as number) ?? 100)
        : ((cfg.ai_daily_limit_free as number) ?? 10);
    const used = (usageRow?.message_count as number) ?? 0;
    setUsage({ used, limit, plan, remaining: Math.max(0, limit - used) });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { usage, loading, refresh };
}
