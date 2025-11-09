"use client";

import { StrategiesContent } from "@/components/strategies/strategies-content";
import { StrategiesHeader } from "@/components/strategies/strategies-header";
import { useFolders } from "@/hooks/api/use-folder";
import { StrategyData } from "@/lib/types";
import { buildTree } from "@/lib/utils";
import { useMemo, useState } from "react";

const MyStrategiesPage = () => {
  const { data, isLoading, isError, refetch } = useFolders();
  const [navigationPath, setNavigationPath] = useState<
    { id: string; name: string }[]
  >([{ id: "root", name: "My Strategies" }]);

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

  if (isLoading) return <p className="p-8">Loading folders...</p>;
  if (isError)
    return <p className="p-8 text-destructive">Failed to load data.</p>;

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
