import Link from "next/link";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <CenteredPageShell>
      <div className="rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/">Go to ValoMapper</Link>
        </Button>
      </div>
    </CenteredPageShell>
  );
}
