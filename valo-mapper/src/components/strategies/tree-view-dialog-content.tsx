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
} from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import Link from "next/link";
import { FREE_STRATEGY_LIMIT } from "@/lib/consts";
import { CheckoutPlanDialog } from "@/components/billing/checkout-plan-dialog";
import { useUpdateStrategy } from "@/hooks/api/use-update-strategy";

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
    ? "Update Saved Strategy"
    : "Save Strategy";
  const dialogDescription = isExistingStrategy
    ? "Move this saved strategy to another location or rename it"
    : "Choose a location to save your new strategy";

  if (isError) {
    return (
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Failed to load folders. Please try again.
          </p>
          <Button onClick={() => refetchFolders()} variant="outline">
            Retry
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
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
          <AlertTitle>Strategy already saved</AlertTitle>
          <AlertDescription>
            <p>
              This strategy is already saved as &quot;{existingStrategy.name}
              &quot;. You can move it to a different location.
            </p>
            <p>
              Current location:{" "}
              <span className="font-medium">{existingLocationLabel}</span>
            </p>
            <p>
              You can still manage saved strategies anytime in{" "}
              <Link className="underline" href="/strategies">
                My Strategies
              </Link>
              .
            </p>
          </AlertDescription>
        </Alert>
      )}

      {!isExistingStrategy && isFreeUserAtStrategyLimit && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Free plan limit reached</AlertTitle>
          <AlertDescription>
            <p>
              You currently have {strategyCount} saved strategies. Free users
              can keep up to {FREE_STRATEGY_LIMIT}.
            </p>
            <p>ValoMapper Premium unlocks unlimited saved strategies.</p>
            <p>
              Delete a saved strategy in{" "}
              <Link className="underline" href="/strategies">
                My Strategies
              </Link>{" "}
              or{" "}
              <CheckoutPlanDialog
                returnToPath={returnToPath}
                trigger={
                  <button
                    type="button"
                    className="underline font-medium inline-flex items-center gap-1"
                  >
                    upgrade to ValoMapper Premium
                  </button>
                }
              />
              .
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Strategy Name</Label>
          <Input
            id="name"
            placeholder="eg. B Site Rush"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            disabled={isLoading || isPending || isUserLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Save Location</div>
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
          Cancel
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
          {isExistingStrategy ? "Update Strategy" : "Save Strategy"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default TreeViewDialogContent;
