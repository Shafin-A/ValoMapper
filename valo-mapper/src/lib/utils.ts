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
  DrawLine,
  LineAbility,
  XLineAbility,
} from "@/lib/types";
import { clsx, type ClassValue } from "clsx";
import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
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
    typeof obj === "object" &&
    obj !== null &&
    "src" in obj &&
    "name" in obj &&
    "role" in obj
  );
};

export const getNextId = (type: "agent" | "ability") => {
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
