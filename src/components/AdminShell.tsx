import { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, BookOpen, FileText, Dumbbell, HelpCircle, Award, Image as ImageIcon, Users, BarChart3, Cpu, CreditCard, Settings, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; superOnly?: boolean };

const items: Item[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutGrid },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/media", label: "Media library", icon: ImageIcon },
  { to: "/admin/exercises", label: "Exercises", icon: Dumbbell },
  { to: "/admin/quizzes", label: "Quizzes", icon: HelpCircle },
  { to: "/admin/certificates", label: "Certificates", icon: Award },
  { to: "/admin/lessons", label: "Lessons", icon: FileText },
  { to: "/admin/users", label: "Users", icon: Users, superOnly: true },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, superOnly: true },
  { to: "/admin/ai-usage", label: "AI usage", icon: Cpu, superOnly: true },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard, superOnly: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, superOnly: true },
];

export function AdminShell({ children, isSuperAdmin }: { children: ReactNode; isSuperAdmin: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border/60 bg-card/40 p-4 lg:block">
          <Link to="/" className="mb-6 flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
              <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-sm font-bold">Cellow CMS</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin console</div>
            </div>
          </Link>
          <nav className="space-y-0.5">
            {items.filter((i) => !i.superOnly || isSuperAdmin).map((it) => {
              const active = it.to === "/admin" ? pathname === "/admin" : pathname.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                    active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 border-t border-border/60 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={async () => { await supabase.auth.signOut(); window.location.replace("/"); }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">
          {/* Mobile top-nav */}
          <div className="mb-4 flex gap-1 overflow-x-auto pb-2 lg:hidden">
            {items.filter((i) => !i.superOnly || isSuperAdmin).map((it) => {
              const active = it.to === "/admin" ? pathname === "/admin" : pathname.startsWith(it.to);
              return (
                <Link key={it.to} to={it.to} className={cn("whitespace-nowrap rounded-md px-3 py-1.5 text-xs", active ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/60")}>
                  {it.label}
                </Link>
              );
            })}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
