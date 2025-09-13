import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AbilityAction, Agent, CircleAbility, LineAbility } from "@/lib/types";
import {
  CIRCLE_ABILITY_CONFIGS,
  LINE_ABILITY_CONFIGS,
  PIXELS_PER_METER,
} from "@/lib/consts";

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

export const isLineAbility = (action: AbilityAction): action is LineAbility => {
  return action in LINE_ABILITY_CONFIGS;
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
