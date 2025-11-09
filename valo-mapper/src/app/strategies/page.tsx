"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FolderCard } from "@/components/strategies/folder-card";
import { StrategyItem } from "@/components/strategies/strategy-item";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CreateFolderPopover } from "@/components/strategies/create-folder-popover";
import { StrategyData } from "@/lib/types";
import { useFolders } from "@/hooks/api/use-folder";
import { buildTree } from "@/lib/utils";

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

  if (isLoading) return <p className="p-8">Loading folders...</p>;
  if (isError)
    return <p className="p-8 text-destructive">Failed to load data.</p>;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 mb-4 h-8">
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                onClick={() => router.push("/")}
              >
                <Home className="size-8" />
              </Button>
              <Separator orientation="vertical" />
              <FolderOpen className="w-8 h-8" />
              <h1 className="text-3xl font-bold text-white">
                {navigationPath[navigationPath.length - 1].name}
              </h1>
            </div>
            <CreateFolderPopover
              parentFolderId={currentFolderId}
              onSuccess={refetch}
            />
          </div>

          <Breadcrumb>
            <BreadcrumbList>
              {navigationPath.map((crumb, index) => (
                <div key={crumb.id} className="contents">
                  <BreadcrumbItem>
                    {index === navigationPath.length - 1 ? (
                      <BreadcrumbPage className="font-medium">
                        {crumb.name}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        onClick={() => navigateToBreadcrumb(index)}
                        className="cursor-pointer"
                      >
                        {crumb.name}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < navigationPath.length - 1 && <BreadcrumbSeparator />}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Content Section */}
        {currentItems.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpen />
              </EmptyMedia>
              <EmptyTitle>This folder is empty</EmptyTitle>
              <EmptyDescription>
                Create a new strategy or folder to get started
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-wrap gap-6">
            {currentItems.map((item) =>
              item.type === "folder" ? (
                <FolderCard
                  key={item.id}
                  name={item.name}
                  onClick={() => navigateToFolder(item.id, item.name)}
                  onMenuClick={() => console.log("Folder menu:", item.id)}
                />
              ) : (
                <StrategyItem
                  key={item.id}
                  name={item.name}
                  selectedMapId={item.selectedMapId ?? ""}
                  updatedAt={item.updatedAt ?? new Date()}
                  onClick={() => console.log("Open strategy:", item.id)}
                  onMenuClick={() => console.log("Strategy menu:", item.id)}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStrategiesPage;
