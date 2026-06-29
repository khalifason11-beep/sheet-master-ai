import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Plan = "free" | "premium";

export function usePlan() {
  const [plan, setPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) { setPlan("free"); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle();
      if (mounted) {
        setPlan(((data?.plan as Plan) ?? "free"));
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return {
    plan,
    loading,
    isPremium: plan === "premium",
    can: (feature: "ai_unlimited" | "practice_files" | "saved_formulas") => {
      if (plan === "premium") return true;
      // Free tier capabilities
      return feature === "saved_formulas";
    },
  };
}
