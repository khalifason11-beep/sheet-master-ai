@@
-import { supabase } from "@/integrations/supabase/client";
-// NOTE: We keep the Lovable integration file in the repo for rollback, but
-// initiate Google OAuth using Supabase directly from the client.
-import { toast } from "sonner";
+import { supabase } from "@/integrations/supabase/client";
+import { toast } from "sonner";
@@
-  const handleGoogle = async () => {
-    setLoading(true);
-    try {
-      // Initiate Supabase native OAuth flow and redirect to our callback route
-      await supabase.auth.signInWithOAuth({
-        provider: "google",
-        options: { redirectTo: `${window.location.origin}/auth/callback` },
-      });
-      // The SDK initiates a full-page redirect, so we don't handle the
-      // post-sign-in navigation here. If the SDK returns without redirecting
-      // it will also set the session and the onAuthStateChange listener will
-      // navigate to dashboard via normal flow.
-    } catch (err: any) {
-      toast.error(err?.message || "Google sign-in failed");
-      setLoading(false);
-    }
-  };
+  const handleGoogle = async () => {
+    setLoading(true);
+    // We no longer use the Lovable broker for initiating OAuth. Start the
+    // Supabase native OAuth flow and point redirects to /auth/callback.
+    await supabase.auth.signInWithOAuth({
+      provider: "google",
+      options: { redirectTo: `${window.location.origin}/auth/callback` },
+    });
+  };
@@
