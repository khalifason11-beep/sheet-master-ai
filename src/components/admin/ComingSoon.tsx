import { AdminPageHeader } from "@/components/AdminShell";
import { Sparkles } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <AdminPageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          This section is scaffolded and will be built out in the next milestone.
        </p>
      </div>
    </>
  );
}
