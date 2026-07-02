import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RoleState = {
  loading: boolean;
  userId: string | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;   // super_admin OR admin
  canWrite: boolean;  // editor, admin, or super_admin
  roles: string[];
};

/**
 * Client-side role check. Server ALWAYS re-verifies via has_role() /
 * has_cms_write() — this is only for UI gating.
 */
export function useIsAdmin() {
  const [state, setState] = useState<RoleState>({
    loading: true, userId: null, isSuperAdmin: false, isAdmin: false, canWrite: false, roles: [],
  });

  useEffect(() => {
    let alive = true;
    async function check() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      if (!uid) {
        if (alive) setState({ loading: false, userId: null, isSuperAdmin: false, isAdmin: false, canWrite: false, roles: [] });
        return;
      }
      const { data } = await supabase
        .from("user_roles" as never)
        .select("role")
        .eq("user_id", uid);
      const roles = ((data ?? []) as { role: string }[]).map((r) => r.role);
      const isSuperAdmin = roles.includes("super_admin");
      const isAdmin = isSuperAdmin || roles.includes("admin");
      const canWrite = isAdmin || roles.includes("editor");
      if (alive) setState({ loading: false, userId: uid, isSuperAdmin, isAdmin, canWrite, roles });
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}

/** Detects whether a super_admin exists anywhere — used to reveal the one-time claim UI. */
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
