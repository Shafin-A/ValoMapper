import { useLobby } from "@/hooks/api/use-lobby";
import { useUpdateLobby } from "@/hooks/api/use-update-lobby";
import { useCanvasItems } from "@/hooks/use-canvas-items";
import { useCanvasUI } from "@/hooks/use-canvas-ui";
import { useHistoryManager } from "@/hooks/use-history-manager";
import { usePhaseManager } from "@/hooks/use-phase-manager";
import { usePhaseTransitions } from "@/hooks/use-phase-transition";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export const useCanvasState = () => {
  const params = useParams();
  const lobbyCode =
    typeof params?.lobbyCode === "string" ? params.lobbyCode : "";

  const phaseTransitions = usePhaseTransitions();
  const canvasUI = useCanvasUI();
  const phaseManager = usePhaseManager();

  const {
    data: lobby,
    isLoading: isLoadingLobby,
    isError: isErrorLobby,
    error: lobbyError,
  } = useLobby(lobbyCode);
  const {
    mutate: updateLobby,
    isPending: isUpdatingLobby,
    isError: isErrorUpdatingLobby,
  } = useUpdateLobby(lobbyCode);
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
      phases: phaseManager.phases,
      selectedMap: canvasUI.selectedMap,
      mapSide: canvasUI.mapSide,
      currentPhaseIndex: phaseManager.currentPhaseIndex,
      editedPhases: Array.from(phaseManager.editedPhases),
    }),
    [
      phaseManager.phases,
      canvasUI.selectedMap,
      canvasUI.mapSide,
      phaseManager.currentPhaseIndex,
      phaseManager.editedPhases,
    ]
  );

  const applyState = useCallback(
    (state: ReturnType<typeof getCurrentState>) => {
      phaseManager.setPhases(state.phases);

      if (state.currentPhaseIndex !== undefined) {
        phaseManager.setCurrentPhaseIndex(state.currentPhaseIndex);
      }

      phaseManager.setEditedPhases(new Set(state.editedPhases));

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
    "phases",
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
    isLoadingLobby,
    isErrorLobby,
    lobbyError,
  };
};
