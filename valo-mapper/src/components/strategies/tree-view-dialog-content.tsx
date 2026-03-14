import React, { Suspense, useState } from "react";

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
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AlertCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StrategyData } from "@/lib/types";
import { useFolders } from "@/hooks/api/use-folder";
import { useUser } from "@/hooks/api/use-user";
import { TreeView } from "./tree-view";
import { useCreateStrategy } from "@/hooks/api/use-create-strategy";
import { useCanvas } from "@/contexts/canvas-context";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import {
  buildLocationPath,
  flattenData,
  getFolderOrStrategyId,
} from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import Link from "next/link";
import { FREE_STRATEGY_LIMIT } from "@/lib/consts";
import { useCreateCheckoutSession } from "@/hooks/api/use-create-checkout-session";

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

interface TreeViewDialogContentProps {
  setOpen: (open: boolean) => void;
}

export const TreeViewDialogContent = ({
  setOpen,
}: TreeViewDialogContentProps) => {
  const [strategyName, setStrategyName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("root");

  const { data, isLoading, isError, refetch: refetchFolders } = useFolders();
  const { data: user, isLoading: isUserLoading } = useUser();

  const { mutate: createStrategy, isPending } = useCreateStrategy();
  const { mutate: createCheckoutSession, isPending: isCheckoutPending } =
    useCreateCheckoutSession();
  const { saveCanvasState } = useCanvas();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lobbyCode =
    typeof params?.lobbyCode === "string" ? params.lobbyCode : "";
  const searchQuery = searchParams.toString();
  const returnToPath = searchQuery ? `${pathname}?${searchQuery}` : pathname;

  const isStrategyInFolder = data?.some((s) => s.lobbyCode === lobbyCode);

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
  const strategyCount = Object.values(flatData).filter(
    (item) => item.type === "strategy",
  ).length;
  const isFreeUserAtStrategyLimit =
    !!user && !user.isSubscribed && strategyCount >= FREE_STRATEGY_LIMIT;

  const handleSave = () => {
    if (isFreeUserAtStrategyLimit || isUserLoading) {
      return;
    }

    const folderId = getFolderOrStrategyId(selectedLocation, "folder");

    saveCanvasState();
    createStrategy({
      name: strategyName,
      lobbyCode: lobbyCode || "",
      folderId: folderId,
    });

    setOpen(false);
    setStrategyName("");
    setSelectedLocation("root");
    refetchFolders();
  };

  const locationPath = buildLocationPath(selectedLocation, flatData);

  if (isError) {
    return (
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Save Strategy</DialogTitle>
          <DialogDescription>
            Choose a location to save your new strategy
          </DialogDescription>
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
        <DialogTitle>Save Strategy</DialogTitle>
        <DialogDescription>
          Choose a location to save your new strategy
        </DialogDescription>
      </DialogHeader>

      {isStrategyInFolder && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Strategy already exists</AlertTitle>
          <AlertDescription>
            <p>
              You have already saved this strategy. Please delete it first in{" "}
              <Link className="underline" href="/strategies">
                My Strategies
              </Link>{" "}
              to save to a different location.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {isFreeUserAtStrategyLimit && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Free plan limit reached</AlertTitle>
          <AlertDescription>
            <p>
              You currently have {strategyCount} saved strategies. Free users
              can keep up to {FREE_STRATEGY_LIMIT}.
            </p>
            <p>ValoMapper Pro unlocks unlimited saved strategies.</p>
            <p>
              Delete a saved strategy in{" "}
              <Link className="underline" href="/strategies">
                My Strategies
              </Link>{" "}
              or{" "}
              <button
                onClick={() =>
                  createCheckoutSession({ returnTo: returnToPath })
                }
                disabled={isCheckoutPending}
                className="underline font-medium inline-flex items-center gap-1 disabled:opacity-50"
              >
                {isCheckoutPending && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                upgrade to ValoMapper Pro
              </button>
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
          <Breadcrumb className="mb-4">
            <BreadcrumbList>{renderBreadcrumbs(locationPath)}</BreadcrumbList>
          </Breadcrumb>
          <ScrollArea className="h-[300px] border rounded-md">
            <Suspense fallback={<TreeViewLoadingSkeleton />}>
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
          onClick={handleSave}
          disabled={
            !strategyName.trim() ||
            isLoading ||
            isPending ||
            isUserLoading ||
            isStrategyInFolder ||
            isFreeUserAtStrategyLimit
          }
        >
          Save Strategy
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

const TreeViewLoadingSkeleton = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
};

export default TreeViewDialogContent;
