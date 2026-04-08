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
} from "@/lib/utils";
import { FolderTreePicker } from "./folder-tree-picker";
import { useUpdateStrategy } from "@/hooks/api/use-update-strategy";

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
          <DialogTitle>Move Strategy</DialogTitle>
          <DialogDescription>
            Choose a new location for this strategy
          </DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Failed to load folders. Please try again.
          </p>
          <Button onClick={() => refetch()} variant="outline">
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
        <DialogTitle>Move Strategy</DialogTitle>
        <DialogDescription>
          Choose a new location for &quot;{strategyName}&quot;
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="text-sm text-muted-foreground">
          Current location:{" "}
          <span className="font-medium">{currentLocationLabel}</span>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">New Location</div>
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
          Cancel
        </Button>
        <Button
          onClick={handleMove}
          disabled={isLoading || isPending || isSameLocation}
        >
          Move Strategy
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default MoveStrategyDialogContent;
