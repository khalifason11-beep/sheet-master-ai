import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Processing sign in — Cellow" },
      { name: "description", content: "Processing your authentication..." },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/callback" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for OAuth error from provider
        const errorParam = (search as any)?.error;
        const errorDescription = (search as any)?.error_description;
        
        if (errorParam) {
          const message = `OAuth Error: ${errorParam}${errorDescription ? ` - ${errorDescription}` : ""}`;
          setError(message);
          toast.error(message);
          
          // Redirect to auth page after showing error
          setTimeout(() => {
            navigate({ to: "/auth?error=" + encodeURIComponent(errorParam) });
          }, 2000);
          return;
        }

        // Check for hash with access token (from OAuth redirect)
        const hash = window.location.hash;
        if (hash.includes("access_token")) {
          // Supabase SDK handles hash-based auth automatically
          // Wait a bit for the SDK to process it
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            toast.success("Signed in successfully!");
            navigate({ to: "/dashboard" });
            return;
          }
        }

        // Check for code parameter (authorization code flow)
        const codeParam = (search as any)?.code;
        if (codeParam) {
          // If using authorization code flow, you would exchange it here
          // For now, wait for Supabase to handle it
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            toast.success("Signed in successfully!");
            navigate({ to: "/dashboard" });
            return;
          }
        }

        // If we reach here without a user, redirect to auth
        setError("Authentication failed. Please try again.");
        setTimeout(() => {
          navigate({ to: "/auth" });
        }, 2000);

      } catch (err: any) {
        const message = err.message || "Authentication error";
        setError(message);
        toast.error(message);
        
        setTimeout(() => {
          navigate({ to: "/auth" });
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate, search]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        {error ? (
          <>
            <h1 className="font-display text-xl font-semibold text-foreground">Authentication Failed</h1>
            <p className="mt-2 text-sm text-destructive">{error}</p>
            <p className="mt-4 text-xs text-muted-foreground">Redirecting...</p>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <h1 className="mt-4 font-display text-lg font-semibold text-foreground">Processing your sign-in</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please wait while we complete your authentication...</p>
          </>
        )}
      </div>
    </div>
  );
}
