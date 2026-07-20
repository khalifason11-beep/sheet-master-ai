@@
     if (data.xp && data.xp > 0) {
-      const { data: prof } = await context.supabase
-        .from("profiles")
-        .select("xp")
-        .eq("id", context.userId)
-        .maybeSingle();
-      const current = (prof as { xp?: number } | null)?.xp ?? 0;
-      await context.supabase.from("profiles").update({ xp: current + data.xp }).eq("id", context.userId);
+      // Atomically increment XP using the secure RPC which uses auth.uid() internally.
+      const { error: rpcErr } = await context.supabase.rpc("increment_profile_xp", {
+        _xp: data.xp,
+      });
+      if (rpcErr) throw new Error(rpcErr.message || "Failed to increment xp");
     }
*** End Patch (unified) ***