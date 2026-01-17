import { useLobby } from "@/hooks/api/use-lobby";
import { useUpdateLobby } from "@/hooks/api/use-update-lobby";
import {
  useCanvasItems,
  useCanvasUI,
  useHistoryManager,
  usePhaseManager,
  usePhaseTransitions,
} from "@/hooks/canvas";
import { useSettings } from "@/contexts/settings-context";
import { UndoableState } from "@/lib/types";
import { MAP_SIZE, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from "@/lib/consts";
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
    agentsSettings,
    abilitiesSettings,
    updateAgentsSettings,
    updateAbilitiesSettings,
  } = useSettings();

  const {
    data: lobby,
    isLoading: isLoadingLobby,
    isError: isErrorLobby,
    error: lobbyError,
  } = useLobby(lobbyCode);
  const {
    mutate: updateLobby,
    mutateAsync: updateLobbyAsync,
    isPending: isUpdatingLobby,
    isError: isErrorUpdatingLobby,
  } = useUpdateLobby(lobbyCode);
  const lastSaveRef = useRef<number>(Date.now());
  const lastSavedStateRef = useRef<UndoableState | null>(null);

  const lastLoadedLobbyRef = useRef<string>("");
  const lastAppliedLobbyUpdatedAt = useRef<string>("");

  const canvasItems = useCanvasItems(
    phaseManager.currentPhase,
    phaseManager.updateCurrentPhase
  );

  const getCurrentState = useCallback(
    (): UndoableState => ({
      phases: phaseManager.getLatestPhases(),
      selectedMap: canvasUI.selectedMap,
      mapSide: canvasUI.mapSide,
      currentPhaseIndex: phaseManager.currentPhaseIndex,
      editedPhases: Array.from(phaseManager.editedPhases),
      agentsSettings,
      abilitiesSettings,
    }),
    [
      phaseManager,
      canvasUI.selectedMap,
      canvasUI.mapSide,
      agentsSettings,
      abilitiesSettings,
    ]
  );

  const applyState = useCallback(
    (state: UndoableState) => {
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

  const saveCanvasStateAsync = useCallback(async () => {
    if (!lobbyCode) return;

    const currentState = getCurrentState();
    const result = await updateLobbyAsync(currentState);

    if (result?.updatedAt) {
      lastAppliedLobbyUpdatedAt.current = result.updatedAt.toString();
    }

    lastSavedStateRef.current = currentState;
    lastSaveRef.current = Date.now();

    setHasUnsavedChanges(false);
  }, [lobbyCode, getCurrentState, updateLobbyAsync]);

  useEffect(() => {
    if (!lobbyCode || !lobby) return;

    const isNewLobby = lobbyCode !== lastLoadedLobbyRef.current;
    const lobbyUpdatedAt = lobby.updatedAt?.toString() || "";
    const isUpdatedRemotely =
      lobbyUpdatedAt && lobbyUpdatedAt !== lastAppliedLobbyUpdatedAt.current;

    if (isNewLobby || isUpdatedRemotely) {
      lastLoadedLobbyRef.current = lobbyCode;
      lastAppliedLobbyUpdatedAt.current = lobbyUpdatedAt;

      if (lobby.canvasState) {
        applyState(lobby.canvasState);
        lastSavedStateRef.current = lobby.canvasState;

        if (lobby.canvasState.agentsSettings) {
          updateAgentsSettings(lobby.canvasState.agentsSettings);
        }
        if (lobby.canvasState.abilitiesSettings) {
          updateAbilitiesSettings(lobby.canvasState.abilitiesSettings);
        }
      } else {
        phaseManager.resetAllPhases();
        canvasUI.resetEdits();
        lastSavedStateRef.current = null;
      }
    }
  }, [
    lobbyCode,
    lobby,
    applyState,
    phaseManager,
    canvasUI,
    updateAgentsSettings,
    updateAbilitiesSettings,
  ]);

  const applyRemoteState = useCallback(
    (state: UndoableState) => {
      applyState(state);
      lastSavedStateRef.current = state;

      if (state.agentsSettings) {
        updateAgentsSettings(state.agentsSettings);
      }
      if (state.abilitiesSettings) {
        updateAbilitiesSettings(state.abilitiesSettings);
      }
    },
    [applyState, updateAgentsSettings, updateAbilitiesSettings]
  );

  const relevantProps = useRef<(keyof UndoableState)[]>([
    "phases",
    "selectedMap",
    "mapSide",
    "currentPhaseIndex",
    "agentsSettings",
    "abilitiesSettings",
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
    if (!lobbyCode || lobbyCode !== lastLoadedLobbyRef.current) return;

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

  const rotateCanvasItemsForSideSwap = useCallback(() => {
    const mapCenterX = (VIRTUAL_WIDTH - MAP_SIZE) / 2 + MAP_SIZE / 2;
    const mapCenterY = (VIRTUAL_HEIGHT - MAP_SIZE) / 2 + MAP_SIZE / 2;

    canvasItems.setAgentsOnCanvas((prev) =>
      prev.map((agent) => ({
        ...agent,
        x: 2 * mapCenterX - agent.x,
        y: 2 * mapCenterY - agent.y,
      }))
    );

    canvasItems.setAbilitiesOnCanvas((prev) =>
      prev.map((ability) => ({
        ...ability,
        x: 2 * mapCenterX - ability.x,
        y: 2 * mapCenterY - ability.y,
        currentRotation: ((ability.currentRotation || 0) + 180) % 360,
      }))
    );

    canvasItems.setTextsOnCanvas((prev) =>
      prev.map((text) => {
        const cx = text.x + text.width / 2;
        const cy = text.y + text.height / 2;
        const newCx = 2 * mapCenterX - cx;
        const newCy = 2 * mapCenterY - cy;
        return {
          ...text,
          x: newCx - text.width / 2,
          y: newCy - text.height / 2,
        };
      })
    );

    canvasItems.setImagesOnCanvas((prev) =>
      prev.map((image) => {
        const cx = image.x + image.width / 2;
        const cy = image.y + image.height / 2;
        const newCx = 2 * mapCenterX - cx;
        const newCy = 2 * mapCenterY - cy;
        return {
          ...image,
          x: newCx - image.width / 2,
          y: newCy - image.height / 2,
        };
      })
    );

    canvasItems.setDrawLines((prev) =>
      prev.map((line) => ({
        ...line,
        points: line.points.map((point) => ({
          x: 2 * mapCenterX - point.x,
          y: 2 * mapCenterY - point.y,
        })),
      }))
    );

    canvasItems.setToolIconsOnCanvas((prev) =>
      prev.map((toolIcon) => ({
        ...toolIcon,
        x: 2 * mapCenterX - toolIcon.x,
        y: 2 * mapCenterY - toolIcon.y,
      }))
    );
  }, [canvasItems]);

  const getCurrentStateForSync = useCallback(
    () => ({
      phases: phaseManager.getLatestPhases(),
      selectedMap: canvasUI.selectedMap,
      mapSide: canvasUI.mapSide,
      currentPhaseIndex: phaseManager.currentPhaseIndex,
      editedPhases: Array.from(phaseManager.editedPhases),
    }),
    [phaseManager, canvasUI.selectedMap, canvasUI.mapSide]
  );

  return {
    ...phaseManager,
    ...phaseTransitions,
    ...canvasItems,
    ...historyManager,
    ...canvasUI,
    resetState,
    saveCanvasState,
    saveCanvasStateAsync,
    applyRemoteState,
    hasUnsavedChanges,
    isUpdatingLobby,
    isErrorUpdatingLobby,
    isLoadingLobby,
    isErrorLobby,
    lobbyError,
    rotateCanvasItemsForSideSwap,
    getCurrentStateForSync,
  };
};
