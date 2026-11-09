import type { CanvasBackground } from "./types";

const CANVAS_BACKGROUND_STORAGE_PREFIX = "valomapper:canvas-background:";

export const getCanvasBackgroundStorageKey = (lobbyCode: string) =>
  `${CANVAS_BACKGROUND_STORAGE_PREFIX}${lobbyCode}`;

export const isCanvasBackground = (
  value: string | null,
): value is CanvasBackground =>
  value === "none" || value === "dots" || value === "grid";

export const readCanvasBackground = (
  lobbyCode: string,
): CanvasBackground => {
  if (!lobbyCode || typeof window === "undefined") {
    return "none";
  }

  try {
    const storedValue = window.localStorage.getItem(
      getCanvasBackgroundStorageKey(lobbyCode),
    );

    return isCanvasBackground(storedValue) ? storedValue : "none";
  } catch {
    return "none";
  }
};

export const writeCanvasBackground = (
  lobbyCode: string,
  background: CanvasBackground,
) => {
  if (!lobbyCode || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getCanvasBackgroundStorageKey(lobbyCode),
      background,
    );
  } catch {
    // Ignore storage failures (private mode, quota, disabled storage).
  }
};
