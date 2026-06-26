import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface-2/50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
              <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="font-display text-base font-bold">Cellow</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Learn Excel by doing — with an AI tutor by your side.</p>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold">Learn</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/paths" className="hover:text-foreground">Learning paths</Link></li>
            <li><Link to="/formulas" className="hover:text-foreground">Formula library</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>AI Tutor</li>
            <li>Practice challenges</li>
            <li>Certificates</li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>About</li>
            <li>Privacy</li>
            <li>Terms</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Cellow. Excel is a registered trademark of Microsoft.
      </div>
    </footer>
  );
}
