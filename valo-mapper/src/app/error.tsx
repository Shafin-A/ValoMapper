"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <CenteredPageShell>
      <div className="rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
          {t("errorLabel")}
        </p>
        <h1 className="mt-2 text-2xl font-bold">{t("errorTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("errorDescription")}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            {t("errorId", { id: error.digest })}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <Button onClick={() => reset()} className="flex-1">
            {t("tryAgain")}
          </Button>
          <Button asChild variant="outline">
            <Link href="/">{t("home")}</Link>
          </Button>
        </div>
      </div>
    </CenteredPageShell>
  );
}
