import type { ReactNode } from "react";
import { BackToHomeButton } from "@/components/shared/back-to-home-button";

interface LegalPageShellProps {
  title: string;
  children: ReactNode;
}

export const LegalPageShell = ({ title, children }: LegalPageShellProps) => (
  <div className="min-h-screen bg-background p-6 md:p-12">
    <div className="mx-auto max-w-4xl">
      <header className="mb-10 space-y-4">
        <BackToHomeButton />
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
      </header>
      {children}
    </div>
  </div>
);
