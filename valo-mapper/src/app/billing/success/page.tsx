import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import {
  getBillingReturnDestination,
  normalizeBillingReturnPath,
} from "@/lib/billing-return-path";
import { PREMIUM_TRIAL_DAYS } from "@/lib/consts";
import { getTranslations } from "next-intl/server";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("billingPages");
  return {
    title: t("successMeta"),
    robots: { index: false, follow: false },
  };
};

type BillingSuccessPageProps = {
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
};

const getSearchParamValue = (value: string | string[] | undefined) => {
  return Array.isArray(value) ? value[0] : value;
};

const BillingSuccessPage = async ({
  searchParams,
}: BillingSuccessPageProps) => {
  const resolvedSearchParams = await searchParams;
  const returnToPath = normalizeBillingReturnPath(
    getSearchParamValue(resolvedSearchParams?.returnTo),
    "/strategies",
  );
  const t = await getTranslations("billingPages");
  const destination = getBillingReturnDestination(returnToPath);
  const returnLabel =
    destination === "home"
      ? t("successBackHome")
      : destination === "strategies"
        ? t("successBackStrategies")
        : destination === "profile"
          ? t("successBackProfile")
          : destination === "strategy"
            ? t("successBackStrategy")
            : t("successBackContinue");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-svh w-full items-center justify-center p-6 md:p-10"
    >
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center text-card-foreground shadow-sm space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t("successTitle")}</h1>
          <p className="text-foreground/85">{t("successDescription")}</p>
          <p className="text-sm text-foreground/70">
            {t("successTrial", { days: PREMIUM_TRIAL_DAYS })}
          </p>
          <p className="text-sm text-foreground/70">{t("successRefresh")}</p>
        </div>
        <Button asChild>
          <Link href={returnToPath}>{returnLabel}</Link>
        </Button>
      </div>
    </main>
  );
};

export default BillingSuccessPage;
