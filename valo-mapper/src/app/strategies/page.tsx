"use client";

import { useState } from "react";
import { FolderCard } from "@/components/strategies/folder-card";
import { StrategyItem } from "@/components/strategies/strategy-item";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FolderOpen, Home, Plus } from "lucide-react";
import { Lobby } from "@/lib/types";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

interface StrategyData {
  id: string;
  name: string;
  type: "folder" | "strategy";
  lobby?: Lobby;
  children?: StrategyData[];
}

const mockData: StrategyData[] = [
  {
    id: "folder-1",
    name: "Attack Strategies",
    type: "folder",
    children: [
      {
        id: "folder-1-1",
        name: "A Site",
        type: "folder",
        children: [
          {
            id: "strat-1",
            name: "A Site Rush",
            type: "strategy",
            lobby: {
              updatedAt: "2025-11-05T14:30:00Z",
              canvasState: {
                selectedMap: { id: "bind", text: "", textColor: "" },
                phases: [],
                mapSide: "attack",
                currentPhaseIndex: 0,
                editedPhases: [],
              },
              lobbyCode: "",
              createdAt: "",
            },
          },
          {
            id: "strat-2",
            name: "A Site Default",
            type: "strategy",
            lobby: {
              updatedAt: "2025-11-04T10:15:00Z",
              canvasState: {
                selectedMap: { id: "haven", text: "", textColor: "" },
                phases: [],
                mapSide: "attack",
                currentPhaseIndex: 0,
                editedPhases: [],
              },
              lobbyCode: "",
              createdAt: "",
            },
          },
        ],
      },
      {
        id: "folder-1-2",
        name: "B Site",
        type: "folder",
        children: [
          {
            id: "strat-3",
            name: "B Site Split",
            type: "strategy",
            lobby: {
              updatedAt: "2025-11-03T16:45:00Z",
              canvasState: {
                selectedMap: { id: "ascent", text: "", textColor: "" },
                phases: [],
                mapSide: "attack",
                currentPhaseIndex: 0,
                editedPhases: [],
              },
              lobbyCode: "",
              createdAt: "",
            },
          },
        ],
      },
    ],
  },
  {
    id: "folder-2",
    name: "Defense Strategies",
    type: "folder",
    children: [],
  },
  {
    id: "strat-5",
    name: "Quick Rotate",
    type: "strategy",
    lobby: {
      updatedAt: "2025-11-07T11:00:00Z",
      canvasState: {
        selectedMap: { id: "icebox", text: "", textColor: "" },
        phases: [],
        mapSide: "defense",
        currentPhaseIndex: 0,
        editedPhases: [],
      },
      lobbyCode: "",
      createdAt: "",
    },
  },
];

const MyStrategiesPage = () => {
  const [navigationPath, setNavigationPath] = useState<
    { id: string; name: string }[]
  >([{ id: "root", name: "My Strategies" }]);

  const router = useRouter();

  const getCurrentItems = (): StrategyData[] => {
    if (navigationPath.length === 1) {
      return mockData;
    }

    let current = mockData;
    for (let i = 1; i < navigationPath.length; i++) {
      const folder = current.find((item) => item.id === navigationPath[i].id);
      if (folder && folder.children) {
        current = folder.children;
      }
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
            <Button onClick={() => console.log("Create folder")}>
              <Plus />
              New Folder
            </Button>
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
                  lobby={item.lobby || {}}
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
