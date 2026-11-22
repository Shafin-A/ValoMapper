import React, { useEffect, useState } from "react";

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFolders } from "@/hooks/api/use-folder";
import {
  buildFolderFlatData,
  buildLocationPath,
  convertFolderOrStrategyId,
  getFolderOrStrategyId,
} from "@/lib/strategy-tree";
import { FolderTreePicker } from "./folder-tree-picker";
import { useUpdateStrategy } from "@/hooks/api/use-update-strategy";
import { useTranslations } from "next-intl";

interface MoveStrategyDialogContentProps {
  strategyId: string;
  strategyName: string;
  currentLocationId: string;
  setOpen: (open: boolean) => void;
}

export const MoveStrategyDialogContent = ({
  strategyId,
  strategyName,
  currentLocationId,
  setOpen,
}: MoveStrategyDialogContentProps) => {
  const t = useTranslations("strategies");
  const [selectedLocation, setSelectedLocation] = useState<string>("root");

  const { data, isLoading, isError, refetch } = useFolders();
  const { mutate: updateStrategy, isPending } = useUpdateStrategy();

  const flatData = buildFolderFlatData(data || []);

  const safeCurrentLocationId = flatData[currentLocationId]
    ? currentLocationId
    : "root";

  useEffect(() => {
    setSelectedLocation(safeCurrentLocationId);
  }, [safeCurrentLocationId]);

  const currentLocationPath = buildLocationPath(
    safeCurrentLocationId,
    flatData,
  );
  const currentLocationLabel = currentLocationPath
    .map((part) => part.name)
    .join(" > ");

  const isSameLocation = selectedLocation === safeCurrentLocationId;

  const handleMove = () => {
    if (isSameLocation) {
      return;
    }

    const folderId = getFolderOrStrategyId(selectedLocation, "folder");

    updateStrategy(
      {
        strategyId: convertFolderOrStrategyId(strategyId, "strategy"),
        folderId: folderId ?? null,
        includeFolderId: true,
      },
      {
        onSuccess: () => {
          setOpen(false);
        },
      },
    );
  };

  if (isError) {
    return (
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("moveTitle")}</DialogTitle>
          <DialogDescription>{t("moveDescription")}</DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            {t("loadFoldersFailed")}
          </p>
          <Button onClick={() => refetch()} variant="outline">
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
        <DialogTitle>{t("moveTitle")}</DialogTitle>
        <DialogDescription>
          {t("moveDescriptionNamed", { name: strategyName })}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="text-sm text-muted-foreground">
          {t("currentLocation")}{" "}
          <span className="font-medium">{currentLocationLabel}</span>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">{t("newLocation")}</div>
          <FolderTreePicker
            flatData={flatData}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            isLoading={isLoading || isPending}
            showSameLocationWarning={isSameLocation}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
        <Button
          onClick={handleMove}
          disabled={isLoading || isPending || isSameLocation}
        >
          {t("moveStrategy")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default MoveStrategyDialogContent;
