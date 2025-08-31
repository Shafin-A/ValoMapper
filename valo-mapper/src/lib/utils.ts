import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { IconSettings } from "./types";

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

export const createDragPreview = (
  isAlly: boolean,
  settings: IconSettings,
  stageScale: number
) => {
  const dragPreview = document.createElement("div");
  const scaledSize = settings.scale * stageScale;
  dragPreview.style.width = `${scaledSize}px`;
  dragPreview.style.height = `${scaledSize}px`;

  const alphaHex = Math.round(settings.boxOpacity * 255)
    .toString(16)
    .padStart(2, "0");

  dragPreview.style.backgroundColor = isAlly
    ? `${settings.allyColor}${alphaHex}`
    : `${settings.enemyColor}${alphaHex}`;

  dragPreview.style.display = "flex";
  dragPreview.style.alignItems = "center";
  dragPreview.style.justifyContent = "center";
  dragPreview.style.borderRadius = `${settings.radius * stageScale}px`;
  dragPreview.style.position = "absolute";
  dragPreview.style.top = "-9999px";

  return dragPreview;
};

export const setupDragPreviewImage = (
  e: React.DragEvent<HTMLImageElement>,
  settings: IconSettings,
  isAlly: boolean,
  stageScale: number
) => {
  const clonedElement = e.currentTarget.cloneNode(true) as HTMLElement;
  const scaledSize = settings.scale * stageScale;
  clonedElement.style.width = `${scaledSize}px`;
  clonedElement.style.height = `${scaledSize}px`;
  clonedElement.style.borderRadius = `${settings.radius * stageScale}px`;

  if ("draggable" in clonedElement) {
    clonedElement.draggable = false;
  }

  const dragPreview = createDragPreview(isAlly, settings, stageScale);
  dragPreview.appendChild(clonedElement);
  document.body.appendChild(dragPreview);
  e.dataTransfer?.setDragImage(dragPreview, 0, 0);

  setTimeout(() => {
    document.body.removeChild(dragPreview);
  }, 0);
};
