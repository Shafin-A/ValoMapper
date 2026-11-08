import type { ReactNode } from "react";
import { BackToHomeButton } from "@/components/shared/back-to-home-button";

interface CenteredPageShellProps {
  children: ReactNode;
  /** Max-width utility for the centered content column. */
  maxWidth?: string;
}

export const CenteredPageShell = ({
  children,
  maxWidth = "max-w-sm",
}: CenteredPageShellProps) => (
  <div className="flex min-h-svh w-full flex-col items-center justify-center p-6 md:p-10">
    <div className={`w-full ${maxWidth}`}>
      <BackToHomeButton className="mb-4" />
      {children}
    </div>
  </div>
);
