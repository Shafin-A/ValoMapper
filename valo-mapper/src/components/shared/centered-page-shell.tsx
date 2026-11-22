import type { ReactNode } from "react";
import { BackToHomeButton } from "@/components/shared/back-to-home-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

interface CenteredPageShellProps {
  children: ReactNode;
  maxWidth?: string;
  showLanguageSwitcher?: boolean;
}

export const CenteredPageShell = ({
  children,
  maxWidth = "max-w-sm",
  showLanguageSwitcher = false,
}: CenteredPageShellProps) => (
  <main
    id="main-content"
    tabIndex={-1}
    className="flex min-h-svh w-full flex-col items-center justify-center p-6 md:p-10"
  >
    <div className={`w-full ${maxWidth}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <BackToHomeButton />
        {showLanguageSwitcher && <LanguageSwitcher />}
      </div>
      {children}
    </div>
  </main>
);
