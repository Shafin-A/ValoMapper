"use client";

import { StrategiesContent } from "@/components/strategies/strategies-content";
import { StrategiesHeader } from "@/components/strategies/strategies-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useFolders } from "@/hooks/api/use-folder";
import { StrategyData } from "@/lib/types";
import { buildTree } from "@/lib/utils";
import { AlertCircle, Home, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const MyStrategiesPage = () => {
  const { data, isLoading, isError, refetch } = useFolders();
  const [navigationPath, setNavigationPath] = useState<
    { id: string; name: string }[]
  >([{ id: "root", name: "My Strategies" }]);

  const router = useRouter();

  const treeData = useMemo(() => {
    if (!data) return [];
    return buildTree(data.folders, data.strategies);
  }, [data]);

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
      : Number(navigationPath[navigationPath.length - 1].id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">
            Loading folders...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              size="icon"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load data</AlertTitle>
            <AlertDescription>
              <p>
                There was an error loading your folders. Please try refreshing
                the page or try again later.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <StrategiesHeader
          navigationPath={navigationPath}
          currentFolderId={currentFolderId}
          refetch={refetch}
          navigateToBreadcrumb={navigateToBreadcrumb}
        />

        <StrategiesContent
          currentItems={currentItems}
          navigateToFolder={navigateToFolder}
        />
      </div>
    </div>
  );
};

export default MyStrategiesPage;
