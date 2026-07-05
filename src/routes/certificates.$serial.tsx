import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageLoader } from "@/components/PageLoader";
import { getCertificateBySerial } from "@/lib/learn.functions";
import { Award, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/certificates/$serial")({
  head: ({ params }) => ({ meta: [{ title: `Certificate ${params.serial} — Cellow` }] }),
  component: CertificatePage,
});

function CertificatePage() {
  const { serial } = Route.useParams();
  const fn = useServerFn(getCertificateBySerial);
  const { data, isLoading } = useQuery({
    queryKey: ["cert", serial],
    queryFn: () => fn({ data: { serial } }),
  });

  if (isLoading) return <PageLoader label="Loading certificate" />;
  if (!data) return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Certificate not found</h1>
      </main>
      <SiteFooter />
    </div>
  );

  const { cert, course, profile, template } = data as any;
  const name = profile?.full_name ?? "Learner";
  const title = course?.title ?? "Course";
  const body = (template?.body_template as string | undefined)
    ?.replaceAll("{{full_name}}", name)
    ?.replaceAll("{{course_title}}", title);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex justify-end print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
        <div className="rounded-3xl border-4 border-primary/40 bg-gradient-to-br from-background to-accent/20 p-12 text-center shadow-xl">
          <Award className="mx-auto h-16 w-16 text-primary" />
          <div className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {template?.title ?? "Certificate of Completion"}
          </div>
          <div className="mt-6 text-sm text-muted-foreground">This certifies that</div>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">{name}</h1>
          <div className="mt-6 text-sm text-muted-foreground">has successfully completed</div>
          <h2 className="mt-2 font-display text-2xl font-semibold">{title}</h2>
          {body && <p className="mx-auto mt-6 max-w-xl text-sm text-muted-foreground whitespace-pre-wrap">{body}</p>}
          <div className="mt-10 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
            <span>Issued {new Date(cert.issued_at).toLocaleDateString()}</span>
            <span>Serial: {cert.serial}</span>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
