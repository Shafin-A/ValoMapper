import type { ReactNode } from "react";
import { BackToHomeButton } from "@/components/shared/back-to-home-button";
import { getTranslations } from "next-intl/server";

interface LegalPageShellProps {
  title: string;
  children: ReactNode;
}

export const LegalPageShell = async ({
  title,
  children,
}: LegalPageShellProps) => {
  const t = await getTranslations("legal");

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 space-y-4">
          <BackToHomeButton />
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{t("notice")}</p>
        </header>
        <div dir="ltr" lang="en" className="text-start">
          {children}
        </div>
      </div>
    </div>
  );
};
