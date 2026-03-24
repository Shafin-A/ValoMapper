import { RefObject, useEffect } from "react";
import { AUTOSAVE_IDLE_THRESHOLD_MS, AUTOSAVE_INTERVAL_MS } from "@/lib/consts";

interface UseCanvasAutoSaveParams {
  lobbyCode: string;
  isActiveLobby: boolean;
  editingTextId: string | null;
  lastChangeRef: RefObject<number>;
  checkUnsavedChanges: () => boolean;
  autoSaveCanvasStateAsync: () => Promise<void>;
}

export const useCanvasAutoSave = ({
  lobbyCode,
  isActiveLobby,
  editingTextId,
  lastChangeRef,
  checkUnsavedChanges,
  autoSaveCanvasStateAsync,
}: UseCanvasAutoSaveParams) => {
  useEffect(() => {
    if (!lobbyCode || !isActiveLobby) return;

    const checkAndSave = () => {
      if (editingTextId) return;

      const now = Date.now();
      const idleTime = now - lastChangeRef.current;

      if (idleTime < AUTOSAVE_IDLE_THRESHOLD_MS) return;
      if (!checkUnsavedChanges()) return;

      void autoSaveCanvasStateAsync();
    };

    checkAndSave();

    const interval = setInterval(checkAndSave, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [
    lobbyCode,
    isActiveLobby,
    editingTextId,
    lastChangeRef,
    checkUnsavedChanges,
    autoSaveCanvasStateAsync,
  ]);
};
