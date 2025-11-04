import { useCanvasItems } from "@/hooks/use-canvas-items";
import { useCanvasUI } from "@/hooks/use-canvas-ui";
import { useHistoryManager } from "@/hooks/use-history-manager";
import { usePhaseManager } from "@/hooks/use-phase-manager";
import { usePhaseTransitions } from "@/hooks/use-phase-transition";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLobby } from "./api/use-lobby";
import { useParams } from "next/navigation";

export const useCanvasState = () => {
  const params = useParams();
  const lobbyCode =
    typeof params?.lobbyCode === "string" ? params.lobbyCode : undefined;

  const phaseTransitions = usePhaseTransitions();
  const canvasUI = useCanvasUI();
  const phaseManager = usePhaseManager();

  const { lobby, updateLobby, isUpdatingLobby, isErrorUpdatingLobby } =
    useLobby(lobbyCode ?? "");
  const lastSaveRef = useRef<number>(Date.now());
  const lastSavedStateRef = useRef<ReturnType<typeof getCurrentState> | null>(
    null
  );

  const canvasItems = useCanvasItems(
    phaseManager.currentPhase,
    phaseManager.updateCurrentPhase
  );

  const getCurrentState = useCallback(
    () => ({
      agentsOnCanvas: canvasItems.agentsOnCanvas,
      abilitiesOnCanvas: canvasItems.abilitiesOnCanvas,
      drawLines: canvasItems.drawLines,
      textsOnCanvas: canvasItems.textsOnCanvas,
      imagesOnCanvas: canvasItems.imagesOnCanvas,
      toolIconsOnCanvas: canvasItems.toolIconsOnCanvas,
      selectedMap: canvasUI.selectedMap,
      mapSide: canvasUI.mapSide,
      currentPhaseIndex: phaseManager.currentPhaseIndex,
    }),
    [
      canvasItems.agentsOnCanvas,
      canvasItems.abilitiesOnCanvas,
      canvasItems.drawLines,
      canvasItems.textsOnCanvas,
      canvasItems.imagesOnCanvas,
      canvasItems.toolIconsOnCanvas,
      canvasUI.selectedMap,
      canvasUI.mapSide,
      phaseManager.currentPhaseIndex,
    ]
  );

  const applyState = useCallback(
    (state: ReturnType<typeof getCurrentState>) => {
      if (state.currentPhaseIndex !== undefined) {
        phaseManager.setCurrentPhaseIndex(state.currentPhaseIndex);
        phaseManager.setEditedPhases((prev) =>
          new Set(prev).add(state.currentPhaseIndex)
        );
      }

      phaseManager.updateCurrentPhase({
        agentsOnCanvas: state.agentsOnCanvas,
        abilitiesOnCanvas: state.abilitiesOnCanvas,
        drawLines: state.drawLines,
        textsOnCanvas: state.textsOnCanvas,
        imagesOnCanvas: state.imagesOnCanvas,
        toolIconsOnCanvas: state.toolIconsOnCanvas,
      });

      canvasUI.setSelectedMap(state.selectedMap);
      canvasUI.setMapSide(state.mapSide);
    },
    [phaseManager, canvasUI]
  );

  const historyManager = useHistoryManager({
    getCurrentState,
    applyState,
  });

  const resetState = useCallback(
    (resetAllPhases = false) => {
      if (resetAllPhases) {
        phaseManager.resetAllPhases();
      } else {
        phaseManager.deletePhase(phaseManager.currentPhaseIndex);
      }
      canvasUI.resetEdits();
    },
    [phaseManager, canvasUI]
  );

  const saveCanvasState = useCallback(() => {
    if (!lobbyCode) return;

    const currentState = getCurrentState();
    updateLobby(currentState);

    lastSavedStateRef.current = currentState;
    lastSaveRef.current = Date.now();

    setHasUnsavedChanges(false);
  }, [lobbyCode, getCurrentState, updateLobby]);

  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (lobbyCode && lobby && !initialLoadRef.current) {
      initialLoadRef.current = true;

      if (lobby.canvasState) {
        applyState(lobby.canvasState);
        lastSavedStateRef.current = lobby.canvasState;
      }
    }
  }, [lobbyCode, lobby, applyState]);

  const relevantProps = useRef<(keyof ReturnType<typeof getCurrentState>)[]>([
    "agentsOnCanvas",
    "abilitiesOnCanvas",
    "drawLines",
    "textsOnCanvas",
    "imagesOnCanvas",
    "toolIconsOnCanvas",
    "selectedMap",
    "mapSide",
    "currentPhaseIndex",
  ]);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const checkUnsavedChanges = useCallback(() => {
    if (!lastSavedStateRef.current) {
      setHasUnsavedChanges(true);
      return true;
    }
    const currentState = getCurrentState();

    const hasChanges = relevantProps.current.some(
      (prop) =>
        JSON.stringify(currentState[prop]) !==
        JSON.stringify(lastSavedStateRef.current![prop])
    );

    setHasUnsavedChanges(hasChanges);
    return hasChanges;
  }, [getCurrentState]);

  useEffect(() => {
    checkUnsavedChanges();
  }, [checkUnsavedChanges]);

  useEffect(() => {
    if (!lobbyCode || !initialLoadRef.current) return;

    const checkAndSave = () => {
      const now = Date.now();
      const timeSinceLastSave = now - lastSaveRef.current;

      if (timeSinceLastSave >= 5 * 60 * 1000 && hasUnsavedChanges) {
        saveCanvasState();
      }
    };

    checkAndSave();

    const interval = setInterval(checkAndSave, 60 * 1000);
    return () => clearInterval(interval);
  }, [lobbyCode, hasUnsavedChanges, saveCanvasState]);

  return {
    ...phaseManager,
    ...phaseTransitions,
    ...canvasItems,
    ...historyManager,
    ...canvasUI,
    resetState,
    saveCanvasState,
    hasUnsavedChanges,
    isUpdatingLobby,
    isErrorUpdatingLobby,
  };
};
