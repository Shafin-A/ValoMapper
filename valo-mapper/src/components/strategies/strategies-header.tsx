import { Separator } from "@radix-ui/react-separator";
import { Home, FolderOpen } from "lucide-react";
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
import Link from "next/link";

interface StrategiesHeaderProps {
  navigationPath: { id: string; name: string }[];
  currentFolderId: number | null;
  refetch: () => void;
  navigateToBreadcrumb: (index: number) => void;
  isUserLoading: boolean;
  hasValoMapperPro: boolean;
  hasScheduledCancellation: boolean;
  strategyCount: number;
  freeStrategyLimit: number;
  upgradeReturnToPath: string;
}

export const StrategiesHeader = ({
  navigationPath,
  currentFolderId,
  refetch,
  navigateToBreadcrumb,
  isUserLoading,
  hasValoMapperPro,
  hasScheduledCancellation,
  strategyCount,
  freeStrategyLimit,
  upgradeReturnToPath,
}: StrategiesHeaderProps) => {
  const isFreePlan = !isUserLoading && !hasValoMapperPro;
  const hasReachedFreeLimit = isFreePlan && strategyCount >= freeStrategyLimit;

  const planLabel = isUserLoading
    ? "Loading"
    : hasScheduledCancellation
      ? "Pro (Cancels at Period End)"
      : hasValoMapperPro
        ? "Pro Active"
        : "Free";

  const planBadgeVariant = isUserLoading
    ? "outline"
    : hasScheduledCancellation
      ? "secondary"
      : hasValoMapperPro
        ? "default"
        : "outline";

  const planBadgeClassName = isUserLoading
    ? "text-muted-foreground"
    : hasScheduledCancellation
      ? "text-amber-700"
      : hasValoMapperPro
        ? "bg-primary text-white"
        : "";

  const savedBadgeVariant = hasReachedFreeLimit ? "destructive" : "secondary";

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 mb-4 h-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <Home className="size-8" />
            </Link>
          </Button>
          <Separator orientation="vertical" />
          <FolderOpen className="w-8 h-8" />
          <h1 className="text-3xl font-bold text-white">
            {navigationPath[navigationPath.length - 1].name}
          </h1>
        </div>
        <CreateFolderPopover
          parentFolderId={currentFolderId}
          onSuccess={refetch}
        />
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
          <span className="text-muted-foreground">Plan:</span>
          <Badge variant={planBadgeVariant} className={planBadgeClassName}>
            {planLabel}
          </Badge>
        </div>

        {isFreePlan && (
          <>
            <Badge variant={savedBadgeVariant}>
              Saved {strategyCount}/{freeStrategyLimit}
            </Badge>
            <CheckoutPlanDialog
              returnToPath={upgradeReturnToPath}
              trigger={<Button size="sm">Upgrade to Pro</Button>}
            />
          </>
        )}
      </div>
    </div>
  );
};
