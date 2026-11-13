import type { Folder, Strategy, StrategyData } from "@/lib/types";

export const buildTree = (
  folders: Folder[],
  strategies: Strategy[],
): StrategyData[] => {
  const folderMap = new Map<number, StrategyData>();
  const rootItems: StrategyData[] = [];

  folders.forEach((folder) => {
    folderMap.set(folder.id, {
      id: `folder-${folder.id}`,
      name: folder.name,
      type: "folder",
      children: [],
    });
  });

  folders.forEach((folder) => {
    const node = folderMap.get(folder.id)!;
    if (!folder.parentFolderId) {
      rootItems.push(node);
    } else {
      const parent = folderMap.get(folder.parentFolderId);
      if (parent?.children) {
        parent.children.push(node);
      }
    }
  });

  strategies.forEach((strategy) => {
    const strategyNode: StrategyData = {
      id: `strategy-${strategy.id}`,
      name: strategy.name,
      type: "strategy",
      lobbyCode: strategy.lobbyCode,
      selectedMapId: strategy.selectedMapId,
      updatedAt: strategy.updatedAt,
    };

    if (!strategy.folderId) {
      rootItems.push(strategyNode);
    } else {
      const parent = folderMap.get(strategy.folderId);
      if (parent?.children) {
        parent.children.push(strategyNode);
      }
    }
  });

  return rootItems;
};

export const flattenData = (
  data: StrategyData,
  result: Record<string, StrategyData> = {},
): Record<string, StrategyData> => {
  result[data.id] = data;
  if (data.children) {
    data.children.forEach((child) => flattenData(child, result));
  }
  return result;
};

export const buildFolderFlatData = (
  data: StrategyData[],
): Record<string, StrategyData> => {
  const root: StrategyData = {
    id: "root",
    name: "My Strategies",
    type: "folder",
    children: data,
  };
  const virtualRoot: StrategyData = {
    id: "_virtual_root",
    name: "Virtual Root",
    type: "folder",
    children: [root],
  };
  return flattenData(virtualRoot);
};

export const buildLocationPath = (
  selectedId: string,
  data: Record<string, StrategyData>,
): Array<{ id: string; name: string }> => {
  const parts: Array<{ id: string; name: string }> = [];
  let currentId: string | undefined = selectedId;

  while (currentId && currentId !== "root") {
    const item = data[currentId];
    if (item) {
      parts.unshift({ id: currentId, name: item.name });
      const parent = Object.values(data).find((d) =>
        d.children?.some((c) => c.id === currentId),
      );
      currentId = parent?.id;
    } else {
      break;
    }
  }

  parts.unshift({ id: "root", name: "My Strategies" });
  return parts;
};

export const convertFolderOrStrategyId = (
  id: string,
  type: "folder" | "strategy",
) => {
  return Number(id.replace(type + "-", ""));
};

export const getFolderOrStrategyId = (
  id: string,
  type: "folder" | "strategy",
) => (id === "root" ? undefined : convertFolderOrStrategyId(id, type));
