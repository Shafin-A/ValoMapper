import { FolderOpen } from "lucide-react";
import { BackToHomeButton } from "@/components/shared/back-to-home-button";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateFolderPopover } from "./create-folder-popover";
import { CheckoutPlanDialog } from "@/components/billing/checkout-plan-dialog";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useTranslations } from "next-intl";

interface StrategiesHeaderProps {
  navigationPath: { id: string; name: string }[];
  currentFolderId: number | null;
  refetch: () => void;
  navigateToBreadcrumb: (index: number) => void;
  canManageFolders: boolean;
  isUserLoading: boolean;
  hasValoMapperPremium: boolean;
  hasScheduledCancellation: boolean;
  subscriptionPlan: "monthly" | "yearly" | "stack" | null;
  premiumTrialDaysLeft: number | null;
  strategyCount: number;
  freeStrategyLimit: number;
  upgradeReturnToPath: string;
}

export const StrategiesHeader = ({
  navigationPath,
  currentFolderId,
  refetch,
  navigateToBreadcrumb,
  canManageFolders,
  isUserLoading,
  hasValoMapperPremium,
  hasScheduledCancellation,
  subscriptionPlan,
  premiumTrialDaysLeft,
  strategyCount,
  freeStrategyLimit,
  upgradeReturnToPath,
}: StrategiesHeaderProps) => {
  const t = useTranslations("strategies");
  const isFreePlan = !isUserLoading && !hasValoMapperPremium;
  const hasReachedFreeLimit = isFreePlan && strategyCount >= freeStrategyLimit;
  const hasActivePremiumTrial =
    hasValoMapperPremium &&
    subscriptionPlan === "monthly" &&
    premiumTrialDaysLeft !== null &&
    premiumTrialDaysLeft > 0;
  const trialLabelSuffix =
    premiumTrialDaysLeft === 1
      ? t("trialDayLeft", { count: 1 })
      : t("trialDaysLeft", { count: premiumTrialDaysLeft ?? 0 });

  const planLabel = isUserLoading
    ? t("planLoading")
    : hasActivePremiumTrial
      ? t("planTrial", { days: trialLabelSuffix })
      : hasScheduledCancellation
        ? t("planCancelsAtPeriodEnd")
        : hasValoMapperPremium
          ? t("planPremium")
          : t("planFree");

  const planBadgeVariant = isUserLoading
    ? "outline"
    : hasActivePremiumTrial
      ? "secondary"
      : hasScheduledCancellation
        ? "secondary"
        : hasValoMapperPremium
          ? "default"
          : "outline";

  const planBadgeClassName = isUserLoading
    ? "text-muted-foreground"
    : hasActivePremiumTrial
      ? "text-emerald-700"
      : hasScheduledCancellation
        ? "text-amber-700"
        : hasValoMapperPremium
          ? "bg-primary text-white"
          : "";

  const savedBadgeVariant = hasReachedFreeLimit ? "destructive" : "secondary";

  return (
    <div className="mb-8">
      <BackToHomeButton className="mb-4" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-8 w-8" />
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {navigationPath[navigationPath.length - 1].name}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <CreateFolderPopover
            parentFolderId={currentFolderId}
            onSuccess={refetch}
            disabled={!canManageFolders}
            disabledTooltip={t("createFolderDisabled")}
          />
        </div>
      </div>

      <Breadcrumb>
        <BreadcrumbList>
          {navigationPath.map((crumb, index) => (
            <div key={crumb.id} className="contents">
              <BreadcrumbItem>
                {index === navigationPath.length - 1 ? (
                  <BreadcrumbPage className="font-medium">
                    {crumb.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={() => navigateToBreadcrumb(index)}
                    className="cursor-pointer"
                  >
                    {crumb.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < navigationPath.length - 1 && <BreadcrumbSeparator />}
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("plan")}</span>
          <Badge variant={planBadgeVariant} className={planBadgeClassName}>
            {planLabel}
          </Badge>
        </div>

        {isFreePlan && (
          <>
            <Badge variant={savedBadgeVariant}>
              {t("saved", { count: strategyCount, limit: freeStrategyLimit })}
            </Badge>
            <CheckoutPlanDialog
              returnToPath={upgradeReturnToPath}
              trigger={<Button size="sm">{t("upgrade")}</Button>}
            />
          </>
        )}
      </div>
    </div>
  );
};
