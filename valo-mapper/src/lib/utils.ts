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
  BaseCanvasItem,
  CircleAbility,
  CurvableLineAbility,
  DoubleLineAbility,
  DrawLine,
  Folder,
  LineAbility,
  Strategy,
  StrategyData,
  XLineAbility,
} from "@/lib/types";
import { clsx, type ClassValue } from "clsx";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { Dispatch, SetStateAction } from "react";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const debounce = <Args extends unknown[], Return>(
  func: (...args: Args) => Return,
  delay: number
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
  action: AbilityAction
): action is CircleAbility => {
  return action in CIRCLE_ABILITY_CONFIGS;
};

export const isAdjustableLineAbility = (
  action: AbilityAction
): action is AdjustableLineAbility => {
  return action in ADJUSTABLE_LINE_ABILITY_CONFIGS;
};

export const isLineAbility = (action: AbilityAction): action is LineAbility => {
  return action in LINE_ABILITY_CONFIGS;
};

export const isDoubleLineAbility = (
  action: AbilityAction
): action is DoubleLineAbility => {
  return action in DOUBLE_LINE_ABILITY_CONFIGS;
};

export const isXLineAbility = (
  action: AbilityAction
): action is XLineAbility => {
  return action in X_LINE_ABILITY_CONFIGS;
};

export const isCurvableLineAbility = (
  action: AbilityAction
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

export const getNextId = (
  type: "agent" | "ability" | "text" | "image" | "tool"
) => {
  const timestamp = Date.now().toString(36);
  return `${type}-${timestamp}`;
};

export const handleMouseOverGrabCursor = (e: KonvaEventObject<MouseEvent>) => {
  e.target.getStage()!.container().style.cursor = "grab";
};

export const handleMouseOverPointerCursor = (
  e: KonvaEventObject<MouseEvent>
) => {
  e.target.getStage()!.container().style.cursor = "pointer";
};

export const handleMouseOutDefaultCursor = (
  e: KonvaEventObject<MouseEvent>
) => {
  e.target.getStage()!.container().style.cursor = "default";
};

export const doLinesIntersect = (
  p1: Vector2d,
  p2: Vector2d,
  p3: Vector2d,
  p4: Vector2d
) => {
  const denominator =
    (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

  if (denominator === 0) return false;

  const ua =
    ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) /
    denominator;
  const ub =
    ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) /
    denominator;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
};

export const doesEraserIntersect = (
  eraserPoints: Vector2d[],
  existingStrokes: DrawLine[]
) => {
  const existingPencilStrokes = existingStrokes.filter(
    (stroke) => stroke.tool === "pencil"
  );

  for (const stroke of existingPencilStrokes) {
    for (let i = 0; i < eraserPoints.length - 1; i++) {
      const eraserP1 = eraserPoints[i];
      const eraserP2 = eraserPoints[i + 1];

      for (let j = 0; j < stroke.points.length - 1; j++) {
        const strokeP1 = stroke.points[j];
        const strokeP2 = stroke.points[j + 1];

        if (doLinesIntersect(eraserP1, eraserP2, strokeP1, strokeP2)) {
          return true;
        }
      }
    }
  }
  return false;
};

export const getIntersectingLines = (
  eraserPoints: Vector2d[],
  existingStrokes: DrawLine[]
): number[] => {
  const intersectingIndices: number[] = [];

  const drawableStrokes = existingStrokes.filter(
    (stroke) => stroke.tool !== "eraser"
  );

  for (
    let strokeIndex = 0;
    strokeIndex < drawableStrokes.length;
    strokeIndex++
  ) {
    const stroke = drawableStrokes[strokeIndex];
    let hasIntersection = false;

    for (let i = 0; i < eraserPoints.length - 1 && !hasIntersection; i++) {
      const eraserP1 = eraserPoints[i];
      const eraserP2 = eraserPoints[i + 1];

      for (let j = 0; j < stroke.points.length - 1; j++) {
        const strokeP1 = stroke.points[j];
        const strokeP2 = stroke.points[j + 1];

        if (doLinesIntersect(eraserP1, eraserP2, strokeP1, strokeP2)) {
          hasIntersection = true;
          break;
        }
      }
    }

    if (hasIntersection) {
      const originalIndex = existingStrokes.findIndex((s) => s === stroke);
      if (originalIndex !== -1) {
        intersectingIndices.push(originalIndex);
      }
    }
  }

  return intersectingIndices;
};

export const handleDragEnd = <T extends BaseCanvasItem>(
  e: KonvaEventObject<DragEvent>,
  icon: T,
  setIconsOnCanvas: Dispatch<SetStateAction<T[]>>,
  deleteGroupRef?: React.RefObject<Konva.Group | null>
) => {
  const node = e.target;
  const isOverDeleteGroup = node.getAttr("isOverDeleteGroup") as boolean;

  if (deleteGroupRef?.current) {
    deleteGroupRef.current.opacity(0.5);
  }

  node.getStage()!.container().style.cursor = "default";
  node.setAttr("isOverDeleteGroup", false);

  if (isOverDeleteGroup) {
    setIconsOnCanvas((prev) => prev.filter((item) => item.id !== icon.id));
    return;
  }

  const newX = node.x();
  const newY = node.y();

  setIconsOnCanvas((prev) => {
    const index = prev.findIndex((item) => item.id === icon.id);
    if (index === -1) return prev;

    const updatedItems = [...prev];
    updatedItems[index] = { ...updatedItems[index], x: newX, y: newY };
    return updatedItems;
  });
};

export const handleDragMove = (
  e: KonvaEventObject<DragEvent>,
  deleteGroupRef?: React.RefObject<Konva.Group | null>,
  nodeRef?: Konva.Node | null
) => {
  if (!deleteGroupRef?.current) return;

  const group = e.target;
  const deleteGroup = deleteGroupRef.current;

  const deleteZone = {
    x: deleteGroup.x(),
    y: deleteGroup.y(),
    width: deleteGroup.width() * deleteGroup.scaleX(),
    height: deleteGroup.height() * deleteGroup.scaleY(),
  };

  const groupX = group.x();
  const groupY = group.y();

  let isOver: boolean;

  if (nodeRef) {
    const width = nodeRef.width();
    const height = nodeRef.height();

    isOver = !(
      groupX + width < deleteZone.x ||
      groupX > deleteZone.x + deleteZone.width ||
      groupY + height < deleteZone.y ||
      groupY > deleteZone.y + deleteZone.height
    );
  } else {
    const width = group.width() || 0;
    const height = group.height() || 0;

    const centerX = groupX + width / 2;
    const centerY = groupY + height / 2;

    isOver =
      centerX >= deleteZone.x &&
      centerX <= deleteZone.x + deleteZone.width &&
      centerY >= deleteZone.y &&
      centerY <= deleteZone.y + deleteZone.height;
  }

  deleteGroup.opacity(isOver ? 0.8 : 0.5);

  group.setAttr("isOverDeleteGroup", isOver);
};

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
  strategies: Strategy[]
): StrategyData[] => {
  const folderMap = new Map<number, StrategyData>();
  const rootItems: StrategyData[] = [];

  folders.forEach((folder) => {
    folderMap.set(folder.id, {
      id: folder.id.toString(),
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
      id: strategy.id.toString(),
      name: strategy.name,
      type: "strategy",
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
