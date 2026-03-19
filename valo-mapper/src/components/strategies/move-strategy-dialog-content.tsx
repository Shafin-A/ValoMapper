import React, { Suspense, useEffect, useState } from "react";

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFolders } from "@/hooks/api/use-folder";
import {
  buildLocationPath,
  convertFolderOrStrategyId,
  flattenData,
  getFolderOrStrategyId,
} from "@/lib/utils";
import { StrategyData } from "@/lib/types";
import { TreeView } from "./tree-view";
import { useUpdateStrategy } from "@/hooks/api/use-update-strategy";

interface MoveStrategyDialogContentProps {
  strategyId: string;
  strategyName: string;
  currentLocationId: string;
  setOpen: (open: boolean) => void;
}

const renderBreadcrumbs = (parts: Array<{ id: string; name: string }>) => {
  if (parts.length === 0) {
    return (
      <BreadcrumbItem className="h-5 flex items-center">
        <BreadcrumbPage className="text-muted-foreground">
          My Strategies
        </BreadcrumbPage>
      </BreadcrumbItem>
    );
  }

  if (parts.length > 3) {
    const hiddenParts = parts.slice(1, -1);

    return (
      <>
        <BreadcrumbItem className="h-5 flex items-center">
          <BreadcrumbPage className="text-muted-foreground">
            {parts[0].name}
          </BreadcrumbPage>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="h-5 flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <BreadcrumbEllipsis />
              </TooltipTrigger>
              <TooltipContent>
                <div>{hiddenParts.map((part) => part.name).join(" > ")}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="h-5 flex items-center">
          <BreadcrumbPage className="text-muted-foreground">
            {parts[parts.length - 1].name}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </>
    );
  }

  return parts.map((part, index) => (
    <React.Fragment key={part.id}>
      <BreadcrumbItem className="h-5 flex items-center">
        <BreadcrumbPage className="text-muted-foreground">
          {part.name}
        </BreadcrumbPage>
      </BreadcrumbItem>
      {index < parts.length - 1 && <BreadcrumbSeparator />}
    </React.Fragment>
  ));
};

export const MoveStrategyDialogContent = ({
  strategyId,
  strategyName,
  currentLocationId,
  setOpen,
}: MoveStrategyDialogContentProps) => {
  const [selectedLocation, setSelectedLocation] = useState<string>("root");

  const { data, isLoading, isError, refetch } = useFolders();
  const { mutate: updateStrategy, isPending } = useUpdateStrategy();

  const strategyDataWithoutParent: Record<string, StrategyData> = {
    root: {
      id: "root",
      name: "My Strategies",
      type: "folder",
      children: data || [],
    },
  };

  const strategyData = {
    _virtual_root: {
      id: "_virtual_root",
      name: "Virtual Root",
      type: "folder" as const,
      children: [strategyDataWithoutParent.root],
    },
    ...strategyDataWithoutParent,
  };

  const flatData = flattenData(strategyData._virtual_root);

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

  const locationPath = buildLocationPath(selectedLocation, flatData);
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
          {isSameLocation && (
            <p className="text-xs text-muted-foreground">
              This strategy is already in the selected location. Choose another
              folder to move it.
            </p>
          )}
          <Breadcrumb className="mb-4">
            <BreadcrumbList>{renderBreadcrumbs(locationPath)}</BreadcrumbList>
          </Breadcrumb>
          <ScrollArea className="h-[300px] border rounded-md">
            <Suspense fallback={<MoveTreeLoadingSkeleton />}>
              {isLoading || isPending ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : data && data.length >= 0 ? (
                <TreeView
                  flatData={flatData}
                  selectedLocation={selectedLocation}
                  setSelectedLocation={setSelectedLocation}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No folders yet
                </div>
              )}
            </Suspense>
          </ScrollArea>
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

const MoveTreeLoadingSkeleton = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
};

export default MoveStrategyDialogContent;
