import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  AbilityAction,
  AbilityCanvas,
  Agent,
  AgentCanvas,
  CircleAbility,
} from "./types";
import { CIRCLE_ABILITY_CONFIGS, PIXELS_PER_METER } from "./consts";

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

export const isAgent = (obj: unknown): obj is Agent => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "src" in obj &&
    "name" in obj &&
    "role" in obj
  );
};

export const getNextId = (current: AgentCanvas[] | AbilityCanvas[]) =>
  current.length === 0 ? 1 : Math.max(...current.map((a) => a.id)) + 1;
