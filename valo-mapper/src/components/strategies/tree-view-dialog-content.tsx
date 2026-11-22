import React, { useEffect, useState } from "react";

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { StrategyData } from "@/lib/types";
import { useFolders } from "@/hooks/api/use-folder";
import { useUser } from "@/hooks/api/use-user";
import { FolderTreePicker } from "./folder-tree-picker";
import { useCreateStrategy } from "@/hooks/api/use-create-strategy";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import {
  buildFolderFlatData,
  buildLocationPath,
  convertFolderOrStrategyId,
  getFolderOrStrategyId,
} from "@/lib/strategy-tree";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import Link from "next/link";
import { FREE_STRATEGY_LIMIT } from "@/lib/consts";
import { CheckoutPlanDialog } from "@/components/billing/checkout-plan-dialog";
import { useUpdateStrategy } from "@/hooks/api/use-update-strategy";
import { useTranslations } from "next-intl";

interface TreeViewDialogContentProps {
  setOpen: (open: boolean) => void;
}

const getParentFolderLocation = (
  childId: string,
  flatData: Record<string, StrategyData>,
) => {
  const parentFolder = Object.values(flatData).find(
    (item) =>
      item.type === "folder" &&
      item.children?.some((child) => child.id === childId),
  );

  return parentFolder?.id ?? "root";
};

export const TreeViewDialogContent = ({
  setOpen,
}: TreeViewDialogContentProps) => {
  const t = useTranslations("strategies");
  const [strategyName, setStrategyName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("root");

  const { data, isLoading, isError, refetch: refetchFolders } = useFolders();
  const { data: user, isLoading: isUserLoading } = useUser();

  const { mutate: createStrategy, isPending: isCreatingStrategy } =
    useCreateStrategy();
  const { mutate: updateStrategy, isPending: isUpdatingStrategy } =
    useUpdateStrategy();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lobbyCode =
    typeof params?.lobbyCode === "string" ? params.lobbyCode : "";
  const searchQuery = searchParams.toString();
  const returnToPath = searchQuery ? `${pathname}?${searchQuery}` : pathname;

  const flatData = buildFolderFlatData(data || []);
  const existingStrategy = Object.values(flatData).find(
    (item) => item.type === "strategy" && item.lobbyCode === lobbyCode,
  );
  const existingStrategyId = existingStrategy?.id;
  const existingStrategyName = existingStrategy?.name;
  const isExistingStrategy = Boolean(existingStrategy);
  const existingStrategyLocation = existingStrategy
    ? getParentFolderLocation(existingStrategy.id, flatData)
    : "root";
  const existingLocationPath = buildLocationPath(
    existingStrategyLocation,
    flatData,
  );
  const existingLocationLabel = existingLocationPath
    .map((part) => part.name)
    .join(" > ");
  const strategyCount = Object.values(flatData).filter(
    (item) => item.type === "strategy",
  ).length;
  const isFreeUserAtStrategyLimit =
    !!user && !user.isSubscribed && strategyCount >= FREE_STRATEGY_LIMIT;
  const trimmedStrategyName = strategyName.trim();
  const isPending = isCreatingStrategy || isUpdatingStrategy;
  const isSameLocationAsExisting =
    isExistingStrategy && selectedLocation === existingStrategyLocation;
  const hasNameChanged = trimmedStrategyName !== (existingStrategyName ?? "");
  const isNoOpUpdate =
    isExistingStrategy && !hasNameChanged && isSameLocationAsExisting;

  useEffect(() => {
    if (!existingStrategyName) {
      return;
    }

    setStrategyName(existingStrategyName);
    setSelectedLocation(existingStrategyLocation);
  }, [existingStrategyId, existingStrategyName, existingStrategyLocation]);

  const handleSave = async () => {
    if (!trimmedStrategyName || isUserLoading) {
      return;
    }

    if (!isExistingStrategy && isFreeUserAtStrategyLimit) {
      return;
    }

    if (isNoOpUpdate) {
      return;
    }

    const folderId = getFolderOrStrategyId(selectedLocation, "folder");

    if (existingStrategy) {
      updateStrategy({
        strategyId: convertFolderOrStrategyId(existingStrategy.id, "strategy"),
        name: trimmedStrategyName,
        folderId: folderId ?? null,
        includeFolderId: true,
      });
    } else {
      createStrategy({
        name: trimmedStrategyName,
        lobbyCode: lobbyCode || "",
        folderId: folderId,
      });
    }

    setOpen(false);
    setStrategyName("");
    setSelectedLocation("root");
  };

  const dialogTitle = isExistingStrategy
    ? t("updateSavedTitle")
    : t("saveTitle");
  const dialogDescription = isExistingStrategy
    ? t("updateSavedDescription")
    : t("saveDescription");

  if (isError) {
    return (
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            {t("loadFoldersFailed")}
          </p>
          <Button onClick={() => refetchFolders()} variant="outline">
            {t("retry")}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogDescription>{dialogDescription}</DialogDescription>
      </DialogHeader>

      {isExistingStrategy && existingStrategy && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("alreadySavedTitle")}</AlertTitle>
          <AlertDescription>
            <p>
              {t("alreadySavedDescription", { name: existingStrategy.name })}
            </p>
            <p>
              {t("currentLocation")}{" "}
              <span className="font-medium">{existingLocationLabel}</span>
            </p>
            <p>
              {t("manageSaved")}{" "}
              <Link className="underline" href="/strategies">
                {t("rootName")}
              </Link>
              .
            </p>
          </AlertDescription>
        </Alert>
      )}

      {!isExistingStrategy && isFreeUserAtStrategyLimit && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("freeLimitTitle")}</AlertTitle>
          <AlertDescription>
            <p>{t("freeLimitDescription", { count: strategyCount, limit: FREE_STRATEGY_LIMIT })}</p>
            <p>{t("premiumUnlocks")}</p>
            <p>{t("deleteOrUpgrade")}</p>
            <CheckoutPlanDialog
              returnToPath={returnToPath}
              trigger={
                <button
                  type="button"
                  className="underline font-medium inline-flex items-center gap-1"
                >
                  {t("upgrade")}
                </button>
              }
            />
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("strategyName")}</Label>
          <Input
            id="name"
            placeholder={t("strategyNamePlaceholder")}
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            disabled={isLoading || isPending || isUserLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">{t("saveLocation")}</div>
          <FolderTreePicker
            flatData={flatData}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            isLoading={isLoading || isPending}
            showSameLocationWarning={
              isExistingStrategy && isSameLocationAsExisting
            }
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
        <Button
          onClick={handleSave}
          disabled={
            !trimmedStrategyName ||
            isLoading ||
            isPending ||
            isUserLoading ||
            (!isExistingStrategy && isFreeUserAtStrategyLimit) ||
            isNoOpUpdate
          }
        >
          {isExistingStrategy ? t("updateStrategy") : t("saveTitle")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default TreeViewDialogContent;
