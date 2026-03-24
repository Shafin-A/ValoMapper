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
import {
  IconSettings,
  MapOption,
  MapSide,
  PhaseState,
  UndoableState,
} from "@/lib/types";
import {
  MAP_SIZE,
  VIRTUAL_WIDTH,
  VIRTUAL_HEIGHT,
  AUTOSAVE_IDLE_THRESHOLD_MS,
  AUTOSAVE_INTERVAL_MS,
} from "@/lib/consts";
import { useParams } from "next/navigation";
import { SetStateAction, useCallback, useEffect, useRef } from "react";

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
  const { mutateAsync } = useUpdateLobby(lobbyCode);
  const lastSavedStateRef = useRef<UndoableState | null>(null);
  const lastChangeRef = useRef<number>(Date.now());
  const isSavingRef = useRef(false);
  const isDirtyRef = useRef(false);

  const lastLoadedLobbyRef = useRef<string>("");
  const lastAppliedLobbyUpdatedAt = useRef<string>("");

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    lastChangeRef.current = Date.now();
  }, []);

  const clearDirty = useCallback(() => {
    isDirtyRef.current = false;
  }, []);

  const areIconSettingsEqual = (a: IconSettings, b: IconSettings) =>
    JSON.stringify(a) === JSON.stringify(b);

  useEffect(() => {
    if (!lastSavedStateRef.current) {
      return;
    }

    const savedAgentsSettings = lastSavedStateRef.current.agentsSettings;
    const savedAbilitiesSettings = lastSavedStateRef.current.abilitiesSettings;

    if (!savedAgentsSettings || !savedAbilitiesSettings) {
      return;
    }

    if (
      !areIconSettingsEqual(agentsSettings, savedAgentsSettings) ||
      !areIconSettingsEqual(abilitiesSettings, savedAbilitiesSettings)
    ) {
      markDirty();
    }
  }, [agentsSettings, abilitiesSettings, markDirty]);

  const canvasItems = useCanvasItems(
    phaseManager.currentPhase,
    phaseManager.updateCurrentPhase,
  );

  const wrappedSetAgentsOnCanvas = useCallback(
    (value: Parameters<typeof canvasItems.setAgentsOnCanvas>[0]) => {
      canvasItems.setAgentsOnCanvas(value);
      markDirty();
    },
    [canvasItems, markDirty],
  );

  const wrappedSetAbilitiesOnCanvas = useCallback(
    (value: Parameters<typeof canvasItems.setAbilitiesOnCanvas>[0]) => {
      canvasItems.setAbilitiesOnCanvas(value);
      markDirty();
    },
    [canvasItems, markDirty],
  );

  const wrappedSetDrawLines = useCallback(
    (value: Parameters<typeof canvasItems.setDrawLines>[0]) => {
      canvasItems.setDrawLines(value);
      markDirty();
    },
    [canvasItems, markDirty],
  );

  const wrappedSetConnectingLines = useCallback(
    (value: Parameters<typeof canvasItems.setConnectingLines>[0]) => {
      canvasItems.setConnectingLines(value);
      markDirty();
    },
    [canvasItems, markDirty],
  );

  const wrappedSetImagesOnCanvas = useCallback(
    (value: Parameters<typeof canvasItems.setImagesOnCanvas>[0]) => {
      canvasItems.setImagesOnCanvas(value);
      markDirty();
    },
    [canvasItems, markDirty],
  );

  const wrappedSetTextsOnCanvas = useCallback(
    (value: Parameters<typeof canvasItems.setTextsOnCanvas>[0]) => {
      canvasItems.setTextsOnCanvas(value);
      markDirty();
    },
    [canvasItems, markDirty],
  );

  const wrappedSetToolIconsOnCanvas = useCallback(
    (value: Parameters<typeof canvasItems.setToolIconsOnCanvas>[0]) => {
      canvasItems.setToolIconsOnCanvas(value);
      markDirty();
    },
    [canvasItems, markDirty],
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
    ],
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
    [phaseManager, canvasUI],
  );

  const wrappedUpdateCurrentPhase = useCallback(
    (updates: Partial<PhaseState>) => {
      phaseManager.updateCurrentPhase(updates);
      markDirty();
    },
    [phaseManager, markDirty],
  );

  const wrappedSwitchToPhase = useCallback(
    (index: number) => {
      phaseManager.switchToPhase(index);
      markDirty();
    },
    [phaseManager, markDirty],
  );

  const wrappedDuplicatePhase = useCallback(
    (index: number) => {
      phaseManager.duplicatePhase(index);
      markDirty();
    },
    [phaseManager, markDirty],
  );

  const wrappedDeletePhase = useCallback(
    (index: number) => {
      phaseManager.deletePhase(index);
      markDirty();
    },
    [phaseManager, markDirty],
  );

  const wrappedSetCurrentPhaseIndex = useCallback(
    (index: number) => {
      phaseManager.setCurrentPhaseIndex(index);
      markDirty();
    },
    [phaseManager, markDirty],
  );

  const wrappedSetPhases = useCallback(
    (value: PhaseState[] | ((prev: PhaseState[]) => PhaseState[])) => {
      phaseManager.setPhases(value);
      markDirty();
    },
    [phaseManager, markDirty],
  );

  const wrappedResetAllPhases = useCallback(() => {
    phaseManager.resetAllPhases();
    markDirty();
  }, [phaseManager, markDirty]);

  const wrappedSetSelectedMap = useCallback(
    (value: SetStateAction<MapOption>) => {
      canvasUI.setSelectedMap(value);
      markDirty();
    },
    [canvasUI, markDirty],
  );

  const wrappedSetMapSide = useCallback(
    (value: SetStateAction<MapSide>) => {
      canvasUI.setMapSide(value);
      markDirty();
    },
    [canvasUI, markDirty],
  );

  const wrappedUpdateAgentsSettings = useCallback(
    (settings: Parameters<typeof updateAgentsSettings>[0]) => {
      updateAgentsSettings(settings);
      markDirty();
    },
    [updateAgentsSettings, markDirty],
  );

  const wrappedUpdateAbilitiesSettings = useCallback(
    (settings: Parameters<typeof updateAbilitiesSettings>[0]) => {
      updateAbilitiesSettings(settings);
      markDirty();
    },
    [updateAbilitiesSettings, markDirty],
  );

  const historyManager = useHistoryManager({
    getCurrentState,
    applyState,
    onApplyHistoryState: () => {
      markDirty();
    },
  });

  const resetState = useCallback(
    (resetAllPhases = false) => {
      if (resetAllPhases) {
        phaseManager.resetAllPhases();
      } else {
        phaseManager.deletePhase(phaseManager.currentPhaseIndex);
      }
      canvasUI.resetEdits();
      markDirty();
    },
    [phaseManager, canvasUI, markDirty],
  );

  const autoSaveCanvasStateAsync = useCallback(async () => {
    if (!lobbyCode || isSavingRef.current) return;

    const currentState = getCurrentState();

    isSavingRef.current = true;

    try {
      const result = await mutateAsync(currentState);

      if (result?.updatedAt) {
        lastAppliedLobbyUpdatedAt.current = result.updatedAt.toString();
      }

      lastSavedStateRef.current = currentState;
      clearDirty();
    } catch (error) {
      console.error("Auto save failed", error);
    } finally {
      isSavingRef.current = false;
    }
  }, [lobbyCode, getCurrentState, mutateAsync, clearDirty]);

  useEffect(() => {
    if (!lobbyCode || !lobby) return;

    const isNewLobby = lobbyCode !== lastLoadedLobbyRef.current;
    const lobbyUpdatedAt = lobby.updatedAt?.toString() || "";

    const lastApplied = lastAppliedLobbyUpdatedAt.current || "";
    const parseTimestamp = (value: string) => {
      const num = Number(value);
      if (!Number.isNaN(num) && Number.isFinite(num)) return num;
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const isUpdatedRemotely =
      lobbyUpdatedAt &&
      parseTimestamp(lobbyUpdatedAt) > parseTimestamp(lastApplied);

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

      clearDirty();
      lastChangeRef.current = Date.now();
    }
  }, [
    lobbyCode,
    lobby,
    applyState,
    phaseManager,
    canvasUI,
    updateAgentsSettings,
    updateAbilitiesSettings,
    clearDirty,
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

      clearDirty();
      lastChangeRef.current = Date.now();
    },
    [applyState, updateAgentsSettings, updateAbilitiesSettings, clearDirty],
  );

  const checkUnsavedChanges = useCallback(() => {
    if (!lastSavedStateRef.current) {
      lastChangeRef.current = Date.now();
      return true;
    }

    return isDirtyRef.current;
  }, []);

  useEffect(() => {
    if (!lobbyCode || lobbyCode !== lastLoadedLobbyRef.current) return;

    const checkAndSave = () => {
      if (canvasUI.editingTextId) return;

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
    autoSaveCanvasStateAsync,
    checkUnsavedChanges,
    canvasUI.editingTextId,
  ]);

  const rotateCanvasItemsForSideSwap = useCallback(() => {
    const mapCenterX = (VIRTUAL_WIDTH - MAP_SIZE) / 2 + MAP_SIZE / 2;
    const mapCenterY = (VIRTUAL_HEIGHT - MAP_SIZE) / 2 + MAP_SIZE / 2;

    canvasItems.setAgentsOnCanvas((prev) =>
      prev.map((agent) => ({
        ...agent,
        x: 2 * mapCenterX - agent.x,
        y: 2 * mapCenterY - agent.y,
      })),
    );

    canvasItems.setAbilitiesOnCanvas((prev) =>
      prev.map((ability) => ({
        ...ability,
        x: 2 * mapCenterX - ability.x,
        y: 2 * mapCenterY - ability.y,
        currentRotation: ((ability.currentRotation || 0) + 180) % 360,
      })),
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
      }),
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
      }),
    );

    canvasItems.setDrawLines((prev) =>
      prev.map((line) => ({
        ...line,
        points: line.points.map((point) => ({
          x: 2 * mapCenterX - point.x,
          y: 2 * mapCenterY - point.y,
        })),
      })),
    );

    canvasItems.setToolIconsOnCanvas((prev) =>
      prev.map((toolIcon) => ({
        ...toolIcon,
        x: 2 * mapCenterX - toolIcon.x,
        y: 2 * mapCenterY - toolIcon.y,
      })),
    );

    markDirty();
  }, [canvasItems, markDirty]);

  const getCurrentStateForSync = useCallback(
    () => ({
      phases: phaseManager.getLatestPhases(),
      selectedMap: canvasUI.selectedMap,
      mapSide: canvasUI.mapSide,
      currentPhaseIndex: phaseManager.currentPhaseIndex,
      editedPhases: Array.from(phaseManager.editedPhases),
    }),
    [phaseManager, canvasUI.selectedMap, canvasUI.mapSide],
  );

  return {
    ...phaseManager,
    updateCurrentPhase: wrappedUpdateCurrentPhase,
    switchToPhase: wrappedSwitchToPhase,
    duplicatePhase: wrappedDuplicatePhase,
    deletePhase: wrappedDeletePhase,
    setCurrentPhaseIndex: wrappedSetCurrentPhaseIndex,
    setPhases: wrappedSetPhases,
    resetAllPhases: wrappedResetAllPhases,
    ...phaseTransitions,
    ...historyManager,
    ...canvasItems,
    setAgentsOnCanvas: wrappedSetAgentsOnCanvas,
    setAbilitiesOnCanvas: wrappedSetAbilitiesOnCanvas,
    setDrawLines: wrappedSetDrawLines,
    setConnectingLines: wrappedSetConnectingLines,
    setImagesOnCanvas: wrappedSetImagesOnCanvas,
    setTextsOnCanvas: wrappedSetTextsOnCanvas,
    setToolIconsOnCanvas: wrappedSetToolIconsOnCanvas,
    ...canvasUI,
    setSelectedMap: wrappedSetSelectedMap,
    setMapSide: wrappedSetMapSide,
    updateAgentsSettings: wrappedUpdateAgentsSettings,
    updateAbilitiesSettings: wrappedUpdateAbilitiesSettings,
    resetState,
    applyRemoteState,
    isLoadingLobby,
    isErrorLobby,
    lobbyError,
    rotateCanvasItemsForSideSwap,
    getCurrentStateForSync,
  };
};
