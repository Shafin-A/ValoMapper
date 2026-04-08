import React, { Suspense } from "react";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { StrategyData } from "@/lib/types";
import { buildLocationPath } from "@/lib/utils";
import { TreeView } from "./tree-view";

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

interface FolderTreePickerProps {
  flatData: Record<string, StrategyData>;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  isLoading?: boolean;
  showSameLocationWarning?: boolean;
}

export const FolderTreePicker = ({
  flatData,
  selectedLocation,
  setSelectedLocation,
  isLoading = false,
  showSameLocationWarning = false,
}: FolderTreePickerProps) => {
  const locationPath = buildLocationPath(selectedLocation, flatData);

  return (
    <>
      {showSameLocationWarning && (
        <p className="text-xs text-muted-foreground">
          This strategy is already in the selected location.
        </p>
      )}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>{renderBreadcrumbs(locationPath)}</BreadcrumbList>
      </Breadcrumb>
      <ScrollArea className="h-[300px] border rounded-md">
        <Suspense fallback={<FolderTreeLoadingSkeleton />}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TreeView
              flatData={flatData}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
            />
          )}
        </Suspense>
      </ScrollArea>
    </>
  );
};

const FolderTreeLoadingSkeleton = () => (
  <div className="flex items-center justify-center h-full">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);
