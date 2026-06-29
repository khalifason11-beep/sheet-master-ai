import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/use-plan";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Cellow" },
      { name: "description", content: "Free forever for core lessons. Premium unlocks unlimited AI tutoring, practice files, and more." },
      { property: "og:title", content: "Cellow Pricing — Free & Premium plans" },
      { property: "og:description", content: "Pick the plan that fits your Excel learning goals." },
    ],
  }),
  component: PricingPage,
});

interface Tier {
  id: "free" | "premium";
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

const tiers: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    tagline: "Everything you need to get started.",
    features: [
      "All core lessons & learning paths",
      "Formula library with smart search",
      "10 AI Tutor messages per day",
      "Save formulas & bookmark lessons",
      "Progress tracking & XP",
    ],
    cta: "Get started",
  },
  {
    id: "premium",
    name: "Premium",
    price: "$9",
    cadence: "per month",
    tagline: "For serious learners who want unlimited practice.",
    features: [
      "Everything in Free",
      "100 AI Tutor messages per day",
      "Practice file uploads (.xlsx, .csv)",
      "Priority AI responses",
      "Certificates of completion",
      "Early access to new paths",
    ],
    cta: "Upgrade to Premium",
    highlight: true,
  },
];

function PricingPage() {
  const router = useRouter();
  const { plan, loading } = usePlan();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSelect = async (tier: Tier) => {
    track("formula_viewed", { context: "pricing_click", tier: tier.id });
    if (!authed) {
      router.navigate({ to: "/auth" });
      return;
    }
    if (tier.id === "free") {
      router.navigate({ to: "/dashboard" });
      return;
    }
    if (plan === "premium") {
      toast.success("You're already on Premium ✨");
      return;
    }
    toast("Payments are coming soon", {
      description: "We'll email you the moment Premium upgrades are live.",
    });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-surface-2/40 py-14">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Simple, honest pricing
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Learn free. Go further with <span className="text-gradient-brand">Premium</span>.
            </h1>
            <p className="mt-4 text-muted-foreground sm:text-lg">
              Start with everything you need to get great at Excel. Upgrade when you want unlimited AI help and pro tools.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-2 sm:px-6">
            {tiers.map((tier) => {
              const isCurrent = !loading && plan === tier.id && authed;
              return (
                <div
                  key={tier.id}
                  className={`surface-card relative flex flex-col p-7 ${tier.highlight ? "border-primary/40 shadow-elevated" : ""}`}
                >
                  {tier.highlight && (
                    <span className="absolute -top-3 left-7 rounded-full bg-gradient-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground shadow-glow">
                      Most popular
                    </span>
                  )}
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-display text-2xl font-bold">{tier.name}</h2>
                    {isCurrent && (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">
                        Current plan
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-bold">{tier.price}</span>
                    <span className="text-sm text-muted-foreground">/ {tier.cadence}</span>
                  </div>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleSelect(tier)}
                    disabled={isCurrent}
                    size="lg"
                    className={`mt-7 ${tier.highlight ? "bg-gradient-brand text-primary-foreground hover:opacity-95" : ""}`}
                    variant={tier.highlight ? "default" : "outline"}
                  >
                    {isCurrent ? "You're on this plan" : tier.cta}
                    {!isCurrent && <ArrowRight className="ml-1.5 h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="mx-auto mt-12 max-w-3xl px-4 text-center sm:px-6">
            <p className="text-sm text-muted-foreground">
              Questions about plans?{" "}
              <Link to="/" className="text-primary hover:underline">
                Get in touch
              </Link>
              . Cancel anytime — no contracts, no surprises.
            </p>
          </div>
        </section>

        <section className="border-t border-border bg-surface-2/30 py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <Zap className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Still deciding?</h2>
            <p className="mt-2 text-muted-foreground">
              Every account starts on Free. Try the AI Tutor, complete a lesson, and upgrade only if you need more.
            </p>
            <Button asChild size="lg" className="mt-6 bg-gradient-brand text-primary-foreground hover:opacity-95">
              <Link to={authed ? "/dashboard" : "/auth"}>
                {authed ? "Go to dashboard" : "Create your free account"} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
