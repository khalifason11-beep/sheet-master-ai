import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/SiteHeader";

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-surface-2/40 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="mt-3 h-4 w-80" />
          </div>
        </section>
        <section className="py-10">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        </section>
      </main>
      <div className="sr-only" role="status" aria-live="polite">
        <Sparkles className="h-4 w-4" /> {label}
      </div>
    </div>
  );
}

export function InlineSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-live="polite">
      <Sparkles className="h-6 w-6 animate-pulse text-primary" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="surface-card max-w-md p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error?.message?.slice(0, 200) || "This page failed to load."}
          </p>
          <button
            onClick={reset}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </main>
    </div>
  );
}
