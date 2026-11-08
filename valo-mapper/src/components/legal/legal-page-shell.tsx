import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface LegalPageShellProps {
  title: string;
  children: ReactNode;
}

export const LegalPageShell = ({ title, children }: LegalPageShellProps) => (
  <div className="min-h-screen bg-background p-6 md:p-12">
    <div className="mx-auto max-w-4xl">
      <header className="mb-10 space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to ValoMapper
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
      </header>
      {children}
    </div>
  </div>
);
