import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/forgot")({
  head: () => ({
    meta: [
      { title: "Reset your password — Cellow" },
      { name: "description", content: "Forgot your password? Get a secure reset link by email." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold">Forgot your password?</h1>
            <p className="mt-1 text-sm text-muted-foreground">We'll email you a secure reset link.</p>
          </div>

          <div className="mt-8 surface-card p-6">
            {sent ? (
              <div className="text-center">
                <p className="text-sm">Check <span className="font-semibold">{email}</span> for a reset link. It expires in 1 hour.</p>
                <Link to="/auth" className="mt-4 inline-block text-sm font-semibold text-primary">Back to sign in</Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-primary-foreground">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
                </Button>
                <Link to="/auth" className="block text-center text-xs text-muted-foreground hover:text-foreground">
                  Back to sign in
                </Link>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
