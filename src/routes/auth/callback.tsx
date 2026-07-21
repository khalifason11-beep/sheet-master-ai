import { useEffect } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in…" }] }),
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // If already signed in, go to dashboard
        const { data: current } = await supabase.auth.getUser();
        if (current.user) {
          router.invalidate();
          navigate({ to: "/dashboard" });
          return;
        }

        // Primary: PKCE authorization code flow — exchange code for session
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { data, error } = await (supabase.auth as any).exchangeCodeForSession({ code });
          if (error) throw error;
          if (data?.session) {
            router.invalidate();
            navigate({ to: "/dashboard" });
            return;
          }
        }

        // Fallback: if SDK exposes getSessionFromUrl (older/newer variations), try it
        if ((supabase.auth as any).getSessionFromUrl) {
          const { data, error } = await (supabase.auth as any).getSessionFromUrl();
          if (error) throw error;
          if (data?.session) {
            router.invalidate();
            navigate({ to: "/dashboard" });
            return;
          }
        }

        throw new Error("No session information found in the URL");
      } catch (err: any) {
        console.error("OAuth callback error", err);
        if (mounted) {
          toast.error(err?.message || "Sign-in failed");
          navigate({ to: "/auth" });
        }
      }
    })();
    return () => { mounted = false; };
  }, [navigate, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="surface-card p-6 rounded-lg">
        <p className="text-center">Signing you in…</p>
      </div>
    </div>
  );
}
