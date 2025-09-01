import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  AbilityAction,
  DragPreviewOptions,
  IconSettings,
  CircleAbility,
} from "./types";
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

const DragPreviewUtils = {
  createBasicPreview: (options: DragPreviewOptions) => {
    const { isAlly, settings, stageScale } = options;
    const dragPreview = document.createElement("div");
    const scaledSize = settings.scale * stageScale;

    const alphaHex = Math.round(settings.boxOpacity * 255)
      .toString(16)
      .padStart(2, "0");

    Object.assign(dragPreview.style, {
      width: `${scaledSize}px`,
      height: `${scaledSize}px`,
      backgroundColor: isAlly
        ? `${settings.allyColor}${alphaHex}`
        : `${settings.enemyColor}${alphaHex}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: `${settings.radius * stageScale}px`,
      position: "absolute",
      top: "-9999px",
    });

    return dragPreview;
  },

  createCirclePreview: (
    circleRadius: number,
    border: string,
    backgroundColor: string,
    stageScale: number
  ) => {
    const dragPreview = document.createElement("div");
    const circleSize = mToPixels(circleRadius) * 2.05 * stageScale;

    Object.assign(dragPreview.style, {
      width: `${circleSize}px`,
      height: `${circleSize}px`,
      border: `${2 * stageScale}px solid ${border}`,
      backgroundColor: backgroundColor,
      borderRadius: "50%",
      position: "absolute",
      top: "-9999px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });

    return dragPreview;
  },

  createDragPreview: (options: DragPreviewOptions) => {
    const { action, stageScale } = options;
    return isCircleAbility(action)
      ? DragPreviewUtils.createCirclePreview(
          CIRCLE_ABILITY_CONFIG[action].radius,
          CIRCLE_ABILITY_CONFIG[action].colors.stroke,
          CIRCLE_ABILITY_CONFIG[action].colors.fill,
          stageScale
        )
      : DragPreviewUtils.createBasicPreview(options);
  },
};

export const setupDragPreviewImage = (
  e: React.DragEvent<HTMLImageElement>,
  settings: IconSettings,
  isAlly: boolean,
  stageScale: number,
  action: AbilityAction = "draggable"
) => {
  const clonedElement = e.currentTarget.cloneNode(true) as HTMLElement;

  if (isCircleAbility(action)) {
    const alphaHex = Math.round(settings.boxOpacity * 255)
      .toString(16)
      .padStart(2, "0");

    Object.assign(clonedElement.style, {
      width: `${25 * stageScale}px`,
      height: `${25 * stageScale}px`,
      borderRadius: `${settings.radius * stageScale}px`,
      backgroundColor: isAlly
        ? `${settings.allyColor}${alphaHex}`
        : `${settings.enemyColor}${alphaHex}`,
    });
  } else {
    const scaledSize = settings.scale * stageScale;
    Object.assign(clonedElement.style, {
      width: `${scaledSize}px`,
      height: `${scaledSize}px`,
      borderRadius: `${settings.radius * stageScale}px`,
    });
  }

  const dragPreview = DragPreviewUtils.createDragPreview({
    isAlly,
    settings,
    stageScale,
    action,
  });

  dragPreview.appendChild(clonedElement);
  document.body.appendChild(dragPreview);

  if (isCircleAbility(action)) {
    const offset = getCircleDragOffset(action, stageScale);
    e.dataTransfer?.setDragImage(dragPreview, offset, offset);
  } else {
    e.dataTransfer?.setDragImage(dragPreview, 25 * stageScale, 25 * stageScale);
  }

  setTimeout(() => {
    document.body.removeChild(dragPreview);
  }, 0);
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
