import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
        .eq("role", "admin")
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
