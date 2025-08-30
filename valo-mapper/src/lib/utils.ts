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

export const createDragPreview = (isAlly: boolean, settings: IconSettings) => {
  const dragPreview = document.createElement("div");
  dragPreview.style.width = `${settings.scale}px`;
  dragPreview.style.height = `${settings.scale}px`;

  const alphaHex = Math.round(settings.boxOpacity * 255)
    .toString(16)
    .padStart(2, "0");

  dragPreview.style.backgroundColor = isAlly
    ? `${settings.allyColor}${alphaHex}`
    : `${settings.enemyColor}${alphaHex}`;

  dragPreview.style.display = "flex";
  dragPreview.style.alignItems = "center";
  dragPreview.style.justifyContent = "center";
  dragPreview.style.borderRadius = `${settings.radius}px`;
  dragPreview.style.position = "absolute";
  dragPreview.style.top = "-9999px";

  return dragPreview;
};

export const setupDragPreviewImage = (
  e: DragEvent,
  element: HTMLElement,
  settings: IconSettings,
  isAlly: boolean
) => {
  const clonedElement = element.cloneNode(true) as HTMLElement;
  clonedElement.style.width = `${settings.scale}px`;
  clonedElement.style.height = `${settings.scale}px`;
  clonedElement.style.borderRadius = `${settings.radius}px`;
  if ("draggable" in clonedElement) {
    clonedElement.draggable = false;
  }

  const dragPreview = createDragPreview(isAlly, settings);
  dragPreview.appendChild(clonedElement);
  document.body.appendChild(dragPreview);
  e.dataTransfer?.setDragImage(dragPreview, 0, 0);

  setTimeout(() => {
    document.body.removeChild(dragPreview);
  }, 0);
};
