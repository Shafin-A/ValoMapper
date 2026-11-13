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
  LineAbility,
  XLineAbility,
} from "@/lib/types";

export { cn } from "./cn";
export { getAgentImgSrc } from "./assets";
export {
  capitalize,
  getRelativeTime,
} from "./format";
export {
  doesEraserIntersect,
  doLinesIntersect,
  getIntersectingLines,
} from "./geometry";
export { getNextId } from "./ids";
export {
  handleDragEnd,
  handleDragMove,
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
  handleMouseOverPointerCursor,
} from "./konva-drag";
export {
  buildFolderFlatData,
  buildLocationPath,
  buildTree,
  convertFolderOrStrategyId,
  flattenData,
  getFolderOrStrategyId,
} from "./strategy-tree";
export { ensureAbsoluteUrl, getYoutubeEmbedUrl } from "./url";

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

export const parseTimestamp = (value: string) => {
  const num = Number(value);
  if (!Number.isNaN(num) && Number.isFinite(num)) return num;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};
