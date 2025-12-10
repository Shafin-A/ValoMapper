"use client";

import { StrategiesContent } from "@/components/strategies/strategies-content";
import { StrategiesHeader } from "@/components/strategies/strategies-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFolders } from "@/hooks/api/use-folder";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { StrategyData } from "@/lib/types";
import { AlertCircle, Home, Loader2 } from "lucide-react";
import { Suspense, useState } from "react";
import { convertFolderOrStrategyId } from "@/lib/utils";
import Link from "next/link";

const MyStrategiesPage = () => {
  const { user, loading: authLoading } = useFirebaseAuth();
  const { data, isLoading, isError, error, refetch } = useFolders();

  const [navigationPath, setNavigationPath] = useState<
    { id: string; name: string }[]
  >([{ id: "root", name: "My Strategies" }]);

  const treeData = data || [];

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
          "folder"
        );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="icon" asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              <p>
                You must be logged in to access your strategies. Please sign in
                to continue.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

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
            <Button variant="outline" size="icon" asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load data</AlertTitle>
            <AlertDescription>
              <p>
                There was an error loading your folders. Please try refreshing
                the page or try again later. {error?.message}.
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
        <Suspense fallback={<StrategiesSkeleton />}>
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
