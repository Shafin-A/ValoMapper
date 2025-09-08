import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AbilityAction, CircleAbility } from "./types";
import { CIRCLE_ABILITY_CONFIG, PIXELS_PER_METER } from "./consts";

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
  return action in CIRCLE_ABILITY_CONFIG;
};

export const getCircleDragOffset = (
  action: CircleAbility,
  stageScale: number
) => {
  const radiusInMeters = CIRCLE_ABILITY_CONFIG[action].radius;

  if (radiusInMeters) {
    const radiusInPixels = radiusInMeters * PIXELS_PER_METER;

    return (radiusInPixels + 1) * stageScale;
  }

  return 0;
};
