"use client";

import { StrategiesContent } from "@/components/strategies/strategies-content";
import { StrategiesHeader } from "@/components/strategies/strategies-header";
import { BackToHomeButton } from "@/components/shared/back-to-home-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFolders } from "@/hooks/api/use-folder";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { FREE_STRATEGY_LIMIT } from "@/lib/consts";
import {
  getStrategyCleanupGracePeriod,
  getStrategyRetentionPreview,
  summarizeStrategyNames,
} from "@/lib/strategy-cleanup";
import { StrategyData } from "@/lib/types";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import { convertFolderOrStrategyId } from "@/lib/strategy-tree";

const countStrategies = (items: StrategyData[]): number => {
  return items.reduce((total, item) => {
    if (item.type === "strategy") {
      return total + 1;
    }

    if (!item.children || item.children.length === 0) {
      return total;
    }

    return total + countStrategies(item.children);
  }, 0);
};

const MyStrategiesPage = () => {
  const t = useTranslations("strategies");
  const format = useFormatter();
  const { user, loading: authLoading } = useFirebaseAuth();
  const { data, isLoading, isError, error, refetch } = useFolders();
  const { data: userProfile, isLoading: isUserProfileLoading } = useUser();

  const rootName = t("rootName");
  const [navigationPath, setNavigationPath] = useState<
    { id: string; name: string }[]
  >([{ id: "root", name: rootName }]);

  useEffect(() => {
    setNavigationPath((previous) => {
      if (previous[0]?.name === rootName) return previous;
      return previous.map((part, index) =>
        index === 0 ? { ...part, name: rootName } : part,
      );
    });
  }, [rootName]);

  const treeData = data || [];
  const strategyCount = countStrategies(treeData);
  const hasValoMapperPremium = Boolean(userProfile?.isSubscribed);
  const canManageFolders = !isUserProfileLoading && hasValoMapperPremium;
  const premiumTrialDaysLeft =
    typeof userProfile?.premiumTrialDaysLeft === "number" &&
    userProfile.premiumTrialDaysLeft > 0
      ? userProfile.premiumTrialDaysLeft
      : null;

  const subscriptionEndsAt = userProfile?.subscriptionEndedAt
    ? new Date(userProfile.subscriptionEndedAt)
    : null;

  const hasScheduledCancellation =
    hasValoMapperPremium &&
    subscriptionEndsAt !== null &&
    !Number.isNaN(subscriptionEndsAt.getTime()) &&
    subscriptionEndsAt.getTime() > Date.now();

  const strategyCleanupGracePeriod = getStrategyCleanupGracePeriod(
    hasValoMapperPremium,
    subscriptionEndsAt,
  );

  const { kept: keptStrategies, deleted: deletedStrategies } =
    getStrategyRetentionPreview(treeData);

  const { visibleNames: keptStrategyNames } = summarizeStrategyNames(
    keptStrategies,
    FREE_STRATEGY_LIMIT,
  );

  const {
    visibleNames: deletedStrategyNames,
    hiddenCount: hiddenDeletedStrategiesCount,
  } = summarizeStrategyNames(deletedStrategies);

  const keptStrategiesPreview = keptStrategyNames.join(", ");
  const deletedStrategiesPreview = deletedStrategyNames.join(", ");

  const getCurrentItems = (): StrategyData[] => {
    if (navigationPath.length === 1) return treeData;

    let current = treeData;
    for (let i = 1; i < navigationPath.length; i++) {
      const folder = current.find((item) => item.id === navigationPath[i].id);
      if (folder?.children) current = folder.children;
    }
    return current;
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setNavigationPath([...navigationPath, { id: folderId, name: folderName }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    setNavigationPath(navigationPath.slice(0, index + 1));
  };

  const currentItems = getCurrentItems();
  const currentFolderId =
    navigationPath.length === 1
      ? null
      : convertFolderOrStrategyId(
          navigationPath[navigationPath.length - 1].id,
          "folder",
        );

  if (authLoading) {
    return (
      <div
        id="main-content"
        role="main"
        tabIndex={-1}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        id="main-content"
        role="main"
        tabIndex={-1}
        className="min-h-screen flex items-center justify-center px-4"
      >
        <div className="max-w-md space-y-4">
          <BackToHomeButton />
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("authRequiredTitle")}</AlertTitle>
            <AlertDescription>
              <p>{t("authRequiredDescription")}</p>
            </AlertDescription>
          </Alert>
          <Button asChild className="w-full">
            <Link href="/login?redirect=%2Fstrategies">{t("login")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        id="main-content"
        role="main"
        tabIndex={-1}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">
            {t("loadingFolders")}
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        id="main-content"
        role="main"
        tabIndex={-1}
        className="min-h-screen flex items-center justify-center px-4"
      >
        <div className="max-w-md space-y-4">
          <BackToHomeButton />
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("loadFailedTitle")}</AlertTitle>
            <AlertDescription>
              <p>
                {t("loadFailedDescription")} {error?.message}
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div
        id="main-content"
        role="main"
        tabIndex={-1}
        className="max-w-[1600px] mx-auto px-8 py-8"
      >
        <Suspense fallback={<StrategiesSkeleton />}>
          <StrategiesHeader
            navigationPath={navigationPath}
            currentFolderId={currentFolderId}
            refetch={refetch}
            navigateToBreadcrumb={navigateToBreadcrumb}
            canManageFolders={canManageFolders}
            isUserLoading={isUserProfileLoading}
            hasValoMapperPremium={hasValoMapperPremium}
            hasScheduledCancellation={hasScheduledCancellation}
            subscriptionPlan={userProfile?.subscriptionPlan ?? null}
            premiumTrialDaysLeft={premiumTrialDaysLeft}
            strategyCount={strategyCount}
            freeStrategyLimit={FREE_STRATEGY_LIMIT}
            upgradeReturnToPath="/strategies"
          />

          {strategyCleanupGracePeriod && (
            <Alert className="mb-4 border-amber-200 bg-stone-50 text-stone-900 shadow-sm dark:border-amber-900/70 dark:bg-zinc-900 dark:text-zinc-100">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle>{t("cleanupTitle")}</AlertTitle>
              <AlertDescription className="space-y-1 text-stone-700 dark:text-zinc-300">
                <p>
                  {t("cleanupFreePlan", {
                    date: format.dateTime(strategyCleanupGracePeriod.endsAt, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }),
                  })}
                </p>
                <p>
                  {strategyCleanupGracePeriod.daysRemaining === 1
                    ? t("cleanupDayRemaining", {
                        limit: FREE_STRATEGY_LIMIT,
                      })
                    : t("cleanupDaysRemaining", {
                        count: strategyCleanupGracePeriod.daysRemaining,
                        limit: FREE_STRATEGY_LIMIT,
                      })}
                </p>
                {keptStrategiesPreview && (
                  <p>
                    <span className="font-medium">{t("willBeKept")}</span>{" "}
                    {keptStrategiesPreview}.
                  </p>
                )}
                {deletedStrategies.length > 0 ? (
                  <p>
                    <span className="font-medium">{t("willBeDeleted")}</span>{" "}
                    {deletedStrategiesPreview}
                    {hiddenDeletedStrategiesCount > 0
                      ? ` ${t("andMore", { count: hiddenDeletedStrategiesCount })}`
                      : ""}
                    .
                  </p>
                ) : (
                  <p>{t("nothingScheduled")}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <StrategiesContent
            currentItems={currentItems}
            currentLocationId={navigationPath[navigationPath.length - 1].id}
            navigateToFolder={navigateToFolder}
            canManageFolders={canManageFolders}
          />
        </Suspense>
      </div>
    </div>
  );
};

const StrategiesSkeleton = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Skeleton className="h-6 w-full max-w-md" />
      </div>
      <div className="flex flex-wrap gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-64 rounded-lg" />
        ))}
      </div>
    </div>
  );
};

export default MyStrategiesPage;
