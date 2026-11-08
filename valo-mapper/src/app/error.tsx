"use client";

import Link from "next/link";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <CenteredPageShell>
      <div className="rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
          Something went wrong
        </p>
        <h1 className="mt-2 text-2xl font-bold">Unexpected error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try again, or head back to the home page.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <Button onClick={() => reset()} className="flex-1">
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </CenteredPageShell>
  );
}
