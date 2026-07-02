import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side check for Super Admin access.
 * The server always re-verifies via has_role() — this is only for UI gating.
 */
export function useIsAdmin() {
  const [state, setState] = useState<{ loading: boolean; isAdmin: boolean; userId: string | null }>({
    loading: true,
    isAdmin: false,
    userId: null,
  });

  useEffect(() => {
    let alive = true;
    async function check() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      if (!uid) {
        if (alive) setState({ loading: false, isAdmin: false, userId: null });
        return;
      }
      const { data, error } = await supabase
        .from("user_roles" as never)
        .select("role")
        .eq("user_id", uid)
        .eq("role", "super_admin")
        .maybeSingle();
      if (alive) setState({ loading: false, isAdmin: !error && !!data, userId: uid });
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/**
 * Detects whether a super_admin exists anywhere in the system.
 * Used to reveal the one-time "claim" UI on a fresh install.
 */
export function useSuperAdminExists() {
  const [state, setState] = useState<{ loading: boolean; exists: boolean }>({ loading: true, exists: true });
  useEffect(() => {
    let alive = true;
    (async () => {
      const { count } = await supabase
        .from("user_roles" as never)
        .select("*", { count: "exact", head: true })
        .eq("role", "super_admin");
      if (alive) setState({ loading: false, exists: (count ?? 0) > 0 });
    })();
    return () => { alive = false; };
  }, []);
  return state;
}
