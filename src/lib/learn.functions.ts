*** Begin Patch
*** Update File: src/lib/learn.functions.ts
@@
-      if (passed && (quiz.xp_reward ?? 0) > 0) {
-        const { data: prior } = await context.supabase
-          .from("quiz_results")
-          .select("id")
-          .eq("user_id", context.userId)
-          .eq("quiz_id", quiz.id)
-          .eq("passed", true);
-        if ((prior?.length ?? 0) <= 1) {
-          // Atomically increment XP using increment_profile_xp RPC
-          const { data: prof } = await context.supabase
-            .from("profiles").select("xp").eq("id", context.userId).maybeSingle();
-          const current = (prof as { xp?: number } | null)?.xp ?? 0;
-          await context.supabase
-            .from("profiles").update({ xp: current + (quiz.xp_reward ?? 0) }).eq("id", context.userId);
-        }
-      }
+      if (passed && (quiz.xp_reward ?? 0) > 0) {
+        const { data: prior } = await context.supabase
+          .from("quiz_results")
+          .select("id")
+          .eq("user_id", context.userId)
+          .eq("quiz_id", quiz.id)
+          .eq("passed", true);
+        if ((prior?.length ?? 0) <= 1) {
+          // Atomically increment XP using increment_profile_xp RPC (uses auth.uid() internally)
+          const { error: rpcErr } = await context.supabase.rpc("increment_profile_xp", {
+            _xp: quiz.xp_reward ?? 0,
+          });
+          if (rpcErr) throw new Error(rpcErr.message || "Failed to increment xp");
+        }
+      }
*** End Patch
