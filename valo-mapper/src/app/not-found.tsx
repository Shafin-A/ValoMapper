import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <CenteredPageShell>
      <div className="rounded-lg border bg-card p-8 text-center text-card-foreground shadow-sm">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {t("notFoundLabel")}
        </p>
        <h1 className="mt-2 text-2xl font-bold">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("notFoundDescription")}
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/">{t("goHome")}</Link>
        </Button>
      </div>
    </CenteredPageShell>
  );
}
