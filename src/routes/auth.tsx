import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Cellow" },
      { name: "description", content: "Sign in or create your Cellow account to track progress, earn XP and unlock certificates." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created!", { description: "Check your inbox to confirm — or just sign in." });
        setTab("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.invalidate();
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error("Google sign-in failed: " + error.message);
        setLoading(false);
      }
    } catch (err: any) {
      toast.error("Google sign-in error: " + (err.message || "Unknown error"));
      setLoading(false);
    }
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
            <h1 className="mt-4 font-display text-2xl font-bold">Welcome to Cellow</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track your progress, earn XP, unlock certificates.</p>
          </div>

          <div className="mt-8 surface-card p-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5">
                <form onSubmit={handleEmail} className="space-y-3">
                  <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link to="/auth/forgot" className="text-xs text-muted-foreground hover:text-primary">Forgot?</Link>
                    </div>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-primary-foreground">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-5">
                <form onSubmit={handleEmail} className="space-y-3">
                  <div><Label htmlFor="name">Name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div><Label htmlFor="email2">Email</Label><Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label htmlFor="password2">Password</Label><Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-primary-foreground">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span><div className="h-px flex-1 bg-border" />
            </div>

            <Button onClick={handleGoogle} variant="outline" className="w-full" disabled={loading}>
              <GoogleIcon /> Continue with Google
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 24c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 24 12 24Z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 4.47 2.18 8.93l3.66 2.84c.87-2.6 3.3-4.39 6.16-4.39Z"/></svg>
  );
}
