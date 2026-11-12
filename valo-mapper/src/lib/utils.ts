import {
  ADJUSTABLE_LINE_ABILITY_CONFIGS,
  ARC_ABILITY_CONFIGS,
  CIRCLE_ABILITY_CONFIGS,
  CURVABLE_LINE_ABILITY_CONFIGS,
  DOUBLE_LINE_ABILITY_CONFIGS,
  LINE_ABILITY_CONFIGS,
  PIXELS_PER_METER,
  X_LINE_ABILITY_CONFIGS,
} from "@/lib/consts";
import {
  AbilityAction,
  AdjustableLineAbility,
  Agent,
  ArcAbility,
  CircleAbility,
  CurvableLineAbility,
  DoubleLineAbility,
  Folder,
  LineAbility,
  Strategy,
  StrategyData,
  XLineAbility,
} from "@/lib/types";

export { cn } from "./cn";

export const debounce = <Args extends unknown[], Return>(
  func: (...args: Args) => Return,
  delay: number,
): ((...args: Args) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const mToPixels = (meters: number): number => {
  return meters * PIXELS_PER_METER;
};

export const isCircleAbility = (
  action: AbilityAction,
): action is CircleAbility => {
  return action in CIRCLE_ABILITY_CONFIGS;
};

export const isAdjustableLineAbility = (
  action: AbilityAction,
): action is AdjustableLineAbility => {
  return action in ADJUSTABLE_LINE_ABILITY_CONFIGS;
};

export const isLineAbility = (action: AbilityAction): action is LineAbility => {
  return action in LINE_ABILITY_CONFIGS;
};

export const isDoubleLineAbility = (
  action: AbilityAction,
): action is DoubleLineAbility => {
  return action in DOUBLE_LINE_ABILITY_CONFIGS;
};

export const isXLineAbility = (
  action: AbilityAction,
): action is XLineAbility => {
  return action in X_LINE_ABILITY_CONFIGS;
};

export const isCurvableLineAbility = (
  action: AbilityAction,
): action is CurvableLineAbility => {
  return action in CURVABLE_LINE_ABILITY_CONFIGS;
};

export const isArcAbility = (action: AbilityAction): action is ArcAbility => {
  return action in ARC_ABILITY_CONFIGS;
};

export const isAgent = (obj: unknown): obj is Agent => {
  return (
    typeof obj === "object" && obj !== null && "name" in obj && "role" in obj
  );
};

const createUuid = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // `crypto.randomUUID` is only exposed in secure contexts (HTTPS or
  // localhost). When the app is opened over plain HTTP (for example from a
  // phone on the local network), fall back to generating a UUID from
  // `crypto.getRandomValues`, which is available outside secure contexts.
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-");
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getNextId = (
  type: "agent" | "ability" | "text" | "image" | "tool",
) => {
  const uuid = createUuid();
  return `${type}-${uuid}`;
};

export {
  doLinesIntersect,
  doesEraserIntersect,
  getIntersectingLines,
} from "./geometry";
export {
  handleDragEnd,
  handleDragMove,
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
  handleMouseOverPointerCursor,
} from "./konva-drag";
const sanitizeAgentName = (name: string): string => {
  return name.replace(/\//g, "").replace(/\s+/g, "_").toLowerCase();
};

export const getAgentImgSrc = (agentName: string): string => {
  const sanitizedName = sanitizeAgentName(agentName);
  return `/agents/${sanitizedName}/${sanitizedName}.png`;
};

export const getRelativeTime = (date: Date) => {
  const now = new Date();
  const elapsed = (now.getTime() - date.getTime()) / 1000;

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const interval of intervals) {
    const count = Math.floor(elapsed / interval.seconds);
    if (count >= 1 || count <= -1) {
      return rtf.format(-count, interval.label as Intl.RelativeTimeFormatUnit);
    }
  }

  return rtf.format(0, "second");
};

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

export const capitalize = (s: string) =>
  s && String(s[0]).toUpperCase() + String(s).slice(1);

export const getYoutubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }

  return null;
};

export const ensureAbsoluteUrl = (url: string): string => {
  if (!url) return url;
  // Block dangerous protocols
  const lowerUrl = url.toLowerCase().trim();
  if (
    lowerUrl.startsWith("javascript:") ||
    lowerUrl.startsWith("data:") ||
    lowerUrl.startsWith("vbscript:")
  ) {
    return "";
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
};

export const parseTimestamp = (value: string) => {
  const num = Number(value);
  if (!Number.isNaN(num) && Number.isFinite(num)) return num;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};
