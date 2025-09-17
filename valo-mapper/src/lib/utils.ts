import {
  ADJUSTABLE_LINE_ABILITY_CONFIGS,
  CIRCLE_ABILITY_CONFIGS,
  DOUBLE_LINE_ABILITY_CONFIGS,
  LINE_ABILITY_CONFIGS,
  PIXELS_PER_METER,
  X_LINE_ABILITY_CONFIGS,
} from "@/lib/consts";
import {
  AbilityAction,
  AdjustableLineAbility,
  Agent,
  CircleAbility,
  DoubleLineAbility,
  LineAbility,
  XLineAbility,
} from "@/lib/types";
import { clsx, type ClassValue } from "clsx";
import { KonvaEventObject } from "konva/lib/Node";
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

export const handleMouseOutDefaultCursor = (
  e: KonvaEventObject<MouseEvent>
) => {
  e.target.getStage()!.container().style.cursor = "default";
};
