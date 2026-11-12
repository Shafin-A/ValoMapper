import { useLobby } from "@/hooks/api/use-lobby";
import {
  useCanvasItems,
  useCanvasUiState,
  useHistoryManager,
  usePhaseManager,
  usePhaseTransitions,
} from "@/hooks/canvas";
import { useCanvasPatch } from "@/hooks/canvas/use-canvas-patch";
import type { PhaseStateUpdate } from "@/hooks/canvas/use-phase-manager";
import {
  normalizeEditedPhases,
  phaseHasContent,
} from "@/hooks/canvas/use-phase-manager";
import { useSettings } from "@/contexts/settings-context";
import { defaultIconSettings } from "@/contexts/settings-context";
import {
  EMPTY_CANVAS_ENTITIES,
  type CanvasEntitiesSnapshot,
} from "@/contexts/canvas-entity-contexts";
import { enqueueCanvasPhaseSnapshot } from "@/lib/canvas-patches";
import {
  AbilityCanvas,
  AgentCanvas,
  ConnectingLine,
  DrawLine,
  ImageCanvas,
  MapOption,
  MapSide,
  PhaseState,
  TextCanvas,
  ToolIconCanvas,
  UndoableState,
} from "@/lib/types";
import { MAP_SIZE, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from "@/lib/consts";
import { useParams } from "next/navigation";
import {
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { parseTimestamp } from "@/lib/utils";

interface UseCanvasStateOptions {
  initialPhaseCount?: number;
  initialState?: Partial<UndoableState>;
  onApplyHistoryState?: (
    state: UndoableState,
    previousState: UndoableState,
  ) => void;
  onHistoryReplaySettled?: (
    settledState: UndoableState,
    previousState: UndoableState,
    targetState: UndoableState,
  ) => void;
}

type PendingHistorySeed =
  | {
      scope: string;
      source: "expected";
      baseline: UndoableState;
    }
  | {
      scope: string;
      source: "current";
    };

export const useCanvasState = ({
  initialPhaseCount,
  initialState: providedInitialState,
  onApplyHistoryState,
  onHistoryReplaySettled,
}: UseCanvasStateOptions = {}) => {
  const params = useParams();
  const lobbyCode =
    typeof params?.lobbyCode === "string" ? params.lobbyCode : "";
  const initialStateRef = useRef(providedInitialState);
  const initialState = initialStateRef.current;

  const phaseTransitions = usePhaseTransitions();
  const canvasUI = useCanvasUiState({
    initialMapSide: initialState?.mapSide,
    initialSelectedMap: initialState?.selectedMap,
    lobbyCode,
  });
  const phaseManager = usePhaseManager({
    initialCurrentPhaseIndex: initialState?.currentPhaseIndex,
    initialEditedPhases: initialState?.editedPhases,
    initialPhases: initialState?.phases,
    initialPhaseCount,
  });

  const setSelectedMapBase = canvasUI.setSelectedMap;
  const setMapSideBase = canvasUI.setMapSide;
  const resetEditsBase = canvasUI.resetEdits;

  const getLatestPhases = phaseManager.getLatestPhases;
  const updateCurrentPhaseBase = phaseManager.updateCurrentPhase;
  const switchToPhaseBase = phaseManager.switchToPhase;
  const duplicatePhaseBase = phaseManager.duplicatePhase;
  const deletePhaseBase = phaseManager.deletePhase;
  const setCurrentPhaseIndexBase = phaseManager.setCurrentPhaseIndex;
  const setPhasesBase = phaseManager.setPhases;
  const setEditedPhasesBase = phaseManager.setEditedPhases;
  const resetAllPhasesBase = phaseManager.resetAllPhases;
  const {
    agentsSettings,
    abilitiesSettings,
    updateAgentsSettings,
    updateAbilitiesSettings,
  } = useSettings();

  // Delayed history and sync callbacks must read the latest committed state.
  const getLatestPhasesRef = useRef(phaseManager.getLatestPhases);
  const currentPhaseIndexRef = useRef(phaseManager.currentPhaseIndex);
  const editedPhasesRef = useRef(phaseManager.editedPhases);
  const selectedMapRef = useRef(canvasUI.selectedMap);
  const mapSideRef = useRef(canvasUI.mapSide);
  const agentsSettingsRef = useRef(agentsSettings);
  const abilitiesSettingsRef = useRef(abilitiesSettings);

  getLatestPhasesRef.current = phaseManager.getLatestPhases;
  currentPhaseIndexRef.current = phaseManager.currentPhaseIndex;
  editedPhasesRef.current = phaseManager.editedPhases;
  selectedMapRef.current = canvasUI.selectedMap;
  mapSideRef.current = canvasUI.mapSide;
  agentsSettingsRef.current = agentsSettings;
  abilitiesSettingsRef.current = abilitiesSettings;

  const phaseUnloadRef = useRef<(() => void) | null>(null);
  const revisionRef = useRef(0);
  const bumpRevision = useCallback(() => {
    revisionRef.current += 1;
  }, []);
  const getRevision = useCallback(() => revisionRef.current, []);
  const {
    enqueueCanvasPatchEntry,
    flushCanvasPatch,
    hasPendingCanvasPatches,
  } = useCanvasPatch(lobbyCode, phaseUnloadRef);

  const {
    data: lobby,
    isLoading: isLoadingLobby,
    isError: isErrorLobby,
    error: lobbyError,
  } = useLobby(lobbyCode);

  const lastLoadedLobbyRef = useRef<string>("");
  const lastAppliedLobbyUpdatedAt = useRef<string>("");
  const lastHistoryScopeRef = useRef<string>("");
  const [isHistoryTrackingEnabled, setIsHistoryTrackingEnabled] = useState(
    () => !lobbyCode,
  );
  const [pendingHistorySeed, setPendingHistorySeed] =
    useState<PendingHistorySeed | null>(null);
  const pendingHistoryReplayCompletionRef = useRef<
    ((settledState: UndoableState) => void) | null
  >(null);
  const [historyReplayCommitTick, setHistoryReplayCommitTick] = useState(0);

  useEffect(() => {
    if (initialState?.agentsSettings) {
      updateAgentsSettings(initialState.agentsSettings);
    }

    if (initialState?.abilitiesSettings) {
      updateAbilitiesSettings(initialState.abilitiesSettings);
    }
  }, [initialState, updateAgentsSettings, updateAbilitiesSettings]);

  const canvasItems = useCanvasItems(
    phaseManager.currentPhase,
    phaseManager.updateCurrentPhase,
  );

  const setAgentsOnCanvasBase = canvasItems.setAgentsOnCanvas;
  const setAbilitiesOnCanvasBase = canvasItems.setAbilitiesOnCanvas;
  const setDrawLinesBase = canvasItems.setDrawLines;
  const setConnectingLinesBase = canvasItems.setConnectingLines;
  const setImagesOnCanvasBase = canvasItems.setImagesOnCanvas;
  const setTextsOnCanvasBase = canvasItems.setTextsOnCanvas;
  const setToolIconsOnCanvasBase = canvasItems.setToolIconsOnCanvas;

  const wrappedSetAgentsOnCanvas = useCallback(
    (value: SetStateAction<AgentCanvas[]>) => {
      bumpRevision();
      setAgentsOnCanvasBase(value);
    },
    [bumpRevision, setAgentsOnCanvasBase],
  );

  const wrappedSetAbilitiesOnCanvas = useCallback(
    (value: SetStateAction<AbilityCanvas[]>) => {
      bumpRevision();
      setAbilitiesOnCanvasBase(value);
    },
    [bumpRevision, setAbilitiesOnCanvasBase],
  );

  const wrappedSetDrawLines = useCallback(
    (value: SetStateAction<DrawLine[]>) => {
      bumpRevision();
      setDrawLinesBase(value);
    },
    [bumpRevision, setDrawLinesBase],
  );

  const wrappedSetConnectingLines = useCallback(
    (value: SetStateAction<ConnectingLine[]>) => {
      bumpRevision();
      setConnectingLinesBase(value);
    },
    [bumpRevision, setConnectingLinesBase],
  );

  const wrappedSetImagesOnCanvas = useCallback(
    (value: SetStateAction<ImageCanvas[]>) => {
      bumpRevision();
      setImagesOnCanvasBase(value);
    },
    [bumpRevision, setImagesOnCanvasBase],
  );

  const wrappedSetTextsOnCanvas = useCallback(
    (value: SetStateAction<TextCanvas[]>) => {
      bumpRevision();
      setTextsOnCanvasBase(value);
    },
    [bumpRevision, setTextsOnCanvasBase],
  );

  const wrappedSetToolIconsOnCanvas = useCallback(
    (value: SetStateAction<ToolIconCanvas[]>) => {
      bumpRevision();
      setToolIconsOnCanvasBase(value);
    },
    [bumpRevision, setToolIconsOnCanvasBase],
  );

  const getCurrentState = useCallback((): UndoableState => {
    return {
      phases: phaseManager.phases,
      selectedMap: canvasUI.selectedMap,
      mapSide: canvasUI.mapSide,
      currentPhaseIndex: phaseManager.currentPhaseIndex,
      editedPhases: Array.from(phaseManager.editedPhases),
      agentsSettings,
      abilitiesSettings,
    };
  }, [
    phaseManager.phases,
    phaseManager.currentPhaseIndex,
    phaseManager.editedPhases,
    canvasUI.selectedMap,
    canvasUI.mapSide,
    agentsSettings,
    abilitiesSettings,
  ]);

  const normalizeHistoryState = useCallback(
    (state: UndoableState): UndoableState => ({
      ...state,
      editedPhases: Array.from(
        normalizeEditedPhases(state.phases, state.editedPhases),
      ),
      agentsSettings:
        state.agentsSettings ??
        agentsSettingsRef.current ??
        defaultIconSettings,
      abilitiesSettings:
        state.abilitiesSettings ??
        abilitiesSettingsRef.current ??
        defaultIconSettings,
    }),
    [],
  );

  const applyState = useCallback(
    (
      state: UndoableState,
      onSettled?: (settledState: UndoableState) => void,
    ) => {
      bumpRevision();
      pendingHistoryReplayCompletionRef.current = onSettled ?? null;
      if (onSettled) {
        setHistoryReplayCommitTick((prev) => prev + 1);
      }

      setPhasesBase(state.phases);

      if (state.currentPhaseIndex !== undefined) {
        setCurrentPhaseIndexBase(state.currentPhaseIndex);
      }

      setEditedPhasesBase(
        normalizeEditedPhases(state.phases, state.editedPhases),
      );

      setSelectedMapBase(state.selectedMap);
      setMapSideBase(state.mapSide);

      updateAgentsSettings(state.agentsSettings ?? defaultIconSettings);
      updateAbilitiesSettings(state.abilitiesSettings ?? defaultIconSettings);
    },
    [
      bumpRevision,
      setPhasesBase,
      setCurrentPhaseIndexBase,
      setEditedPhasesBase,
      setSelectedMapBase,
      setMapSideBase,
      updateAgentsSettings,
      updateAbilitiesSettings,
    ],
  );

  useEffect(() => {
    if (!pendingHistoryReplayCompletionRef.current) {
      return;
    }

    const onSettled = pendingHistoryReplayCompletionRef.current;
    pendingHistoryReplayCompletionRef.current = null;
    onSettled(getCurrentState());
  }, [historyReplayCommitTick, getCurrentState]);

  const wrappedUpdateCurrentPhase = useCallback(
    (updates: PhaseStateUpdate) => {
      bumpRevision();
      updateCurrentPhaseBase(updates);
    },
    [bumpRevision, updateCurrentPhaseBase],
  );

  const wrappedSwitchToPhase = useCallback(
    (index: number) => {
      bumpRevision();
      switchToPhaseBase(index);
    },
    [bumpRevision, switchToPhaseBase],
  );

  const wrappedDuplicatePhase = useCallback(
    (index: number) => {
      bumpRevision();
      duplicatePhaseBase(index);
    },
    [bumpRevision, duplicatePhaseBase],
  );

  const wrappedDeletePhase = useCallback(
    (index: number) => {
      bumpRevision();
      deletePhaseBase(index);
    },
    [bumpRevision, deletePhaseBase],
  );

  const wrappedSetCurrentPhaseIndex = useCallback(
    (index: number) => {
      bumpRevision();
      setCurrentPhaseIndexBase(index);
    },
    [bumpRevision, setCurrentPhaseIndexBase],
  );

  const wrappedSetPhases = useCallback(
    (value: PhaseState[] | ((prev: PhaseState[]) => PhaseState[])) => {
      bumpRevision();
      setPhasesBase(value);
    },
    [bumpRevision, setPhasesBase],
  );

  const wrappedResetAllPhases = useCallback(() => {
    bumpRevision();
    resetAllPhasesBase();
  }, [bumpRevision, resetAllPhasesBase]);

  const wrappedSetSelectedMap = useCallback(
    (value: SetStateAction<MapOption>) => {
      bumpRevision();
      setSelectedMapBase(value);
    },
    [bumpRevision, setSelectedMapBase],
  );

  const wrappedSetMapSide = useCallback(
    (value: SetStateAction<MapSide>) => {
      bumpRevision();
      setMapSideBase(value);
    },
    [bumpRevision, setMapSideBase],
  );

  const wrappedUpdateAgentsSettings = useCallback(
    (settings: Parameters<typeof updateAgentsSettings>[0]) => {
      bumpRevision();
      const newSettings = { ...agentsSettings, ...settings };

      updateAgentsSettings(settings);

      enqueueCanvasPatchEntry({
        entity: "agents_settings",
        action: "update",
        phaseIndex: phaseManager.currentPhaseIndex,
        payload: { agentsSettings: newSettings },
      });
    },
    [
      agentsSettings,
      bumpRevision,
      updateAgentsSettings,
      phaseManager.currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const wrappedUpdateAbilitiesSettings = useCallback(
    (settings: Parameters<typeof updateAbilitiesSettings>[0]) => {
      bumpRevision();
      const newSettings = { ...abilitiesSettings, ...settings };

      updateAbilitiesSettings(settings);

      enqueueCanvasPatchEntry({
        entity: "abilities_settings",
        action: "update",
        phaseIndex: phaseManager.currentPhaseIndex,
        payload: { abilitiesSettings: newSettings },
      });
    },
    [
      abilitiesSettings,
      bumpRevision,
      updateAbilitiesSettings,
      phaseManager.currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const historyManager = useHistoryManager({
    getCurrentState,
    applyState,
    getRevision,
    isTrackingEnabled: isHistoryTrackingEnabled,
    onApplyHistoryState,
    onHistoryReplaySettled,
  });
  const {
    history,
    undo: historyUndo,
    redo: historyRedo,
    canUndo: historyCanUndo,
    canRedo: historyCanRedo,
    saveToHistory: historySaveToHistory,
    resetHistory,
  } = historyManager;

  const isHistoryReady =
    !lobbyCode ||
    (lastHistoryScopeRef.current === lobbyCode &&
      isHistoryTrackingEnabled &&
      pendingHistorySeed === null);

  const undo = useCallback(() => {
    if (!isHistoryReady) return;
    historyUndo();
  }, [historyUndo, isHistoryReady]);

  const redo = useCallback(() => {
    if (!isHistoryReady) return;
    historyRedo();
  }, [historyRedo, isHistoryReady]);

  const saveToHistory = useCallback(() => {
    if (!isHistoryReady) return;
    historySaveToHistory();
  }, [historySaveToHistory, isHistoryReady]);

  useEffect(() => {
    if (!pendingHistorySeed) return;

    if (pendingHistorySeed.scope !== lobbyCode) {
      setPendingHistorySeed(null);
      return;
    }

    const baseline =
      pendingHistorySeed.source === "expected"
        ? pendingHistorySeed.baseline
        : normalizeHistoryState(getCurrentState());

    resetHistory(baseline);
    setIsHistoryTrackingEnabled(true);
    setPendingHistorySeed(null);
  }, [
    pendingHistorySeed,
    lobbyCode,
    normalizeHistoryState,
    getCurrentState,
    resetHistory,
  ]);

  const resetState = useCallback(
    (resetAllPhases = false) => {
      bumpRevision();
      if (resetAllPhases) {
        resetAllPhasesBase();
      } else {
        deletePhaseBase(phaseManager.currentPhaseIndex);
      }
      resetEditsBase();
    },
    [
      bumpRevision,
      resetAllPhasesBase,
      deletePhaseBase,
      phaseManager.currentPhaseIndex,
      resetEditsBase,
    ],
  );

  const phaseUnloadStateRef = useRef({
    currentPhaseIndex: phaseManager.currentPhaseIndex,
    editedPhases: phaseManager.editedPhases,
  });

  useEffect(() => {
    phaseUnloadStateRef.current = {
      currentPhaseIndex: phaseManager.currentPhaseIndex,
      editedPhases: phaseManager.editedPhases,
    };
  }, [phaseManager.currentPhaseIndex, phaseManager.editedPhases]);

  useEffect(() => {
    phaseUnloadRef.current = () => {
      const { currentPhaseIndex, editedPhases } = phaseUnloadStateRef.current;
      if (editedPhases.has(currentPhaseIndex)) return;

      const phase = getLatestPhases()[currentPhaseIndex];
      if (!phase) return;

      if (!phaseHasContent(phase)) return;

      enqueueCanvasPhaseSnapshot({
        phase,
        phaseIndex: currentPhaseIndex,
        editedPhases,
        enqueue: enqueueCanvasPatchEntry,
      });
    };
  }, [getLatestPhases, enqueueCanvasPatchEntry]);

  useEffect(() => {
    if (lobbyCode === lastHistoryScopeRef.current) return;

    lastHistoryScopeRef.current = lobbyCode;
    setPendingHistorySeed(null);
    resetHistory();
    setIsHistoryTrackingEnabled(!lobbyCode);

    if (!lobbyCode) {
      lastLoadedLobbyRef.current = "";
      lastAppliedLobbyUpdatedAt.current = "";
    }
  }, [lobbyCode, resetHistory]);

  useEffect(() => {
    if (!lobbyCode || !lobby) return;

    const isNewLobby = lobbyCode !== lastLoadedLobbyRef.current;
    const lobbyUpdatedAt = lobby.updatedAt?.toString() || "";

    const lastApplied = lastAppliedLobbyUpdatedAt.current || "";

    const isUpdatedRemotely =
      lobbyUpdatedAt &&
      parseTimestamp(lobbyUpdatedAt) > parseTimestamp(lastApplied);

    if (isNewLobby || isUpdatedRemotely) {
      // Skip a snapshot that may predate queued patches.
      if (!isNewLobby && hasPendingCanvasPatches?.()) {
        return;
      }

      lastLoadedLobbyRef.current = lobbyCode;
      lastAppliedLobbyUpdatedAt.current = lobbyUpdatedAt;

      if (lobby.canvasState) {
        const normalizedLobbyState = normalizeHistoryState(lobby.canvasState);

        setIsHistoryTrackingEnabled(false);
        setPendingHistorySeed({
          scope: lobbyCode,
          source: "expected",
          baseline: normalizedLobbyState,
        });
        applyState(normalizedLobbyState);
      } else {
        resetAllPhasesBase();
        resetEditsBase();
        setIsHistoryTrackingEnabled(false);
        setPendingHistorySeed({ scope: lobbyCode, source: "current" });
      }
    }
  }, [
    lobbyCode,
    lobby,
    applyState,
    resetAllPhasesBase,
    resetEditsBase,
    normalizeHistoryState,
    hasPendingCanvasPatches,
  ]);

  const applyRemoteState = useCallback(
    (state: UndoableState) => {
      applyState(state);
    },
    [applyState],
  );

  const rotateCanvasItemsForSideSwap = useCallback(
    (onRotated?: (newPhases: PhaseState[]) => void) => {
      const mapCenterX = (VIRTUAL_WIDTH - MAP_SIZE) / 2 + MAP_SIZE / 2;
      const mapCenterY = (VIRTUAL_HEIGHT - MAP_SIZE) / 2 + MAP_SIZE / 2;

      const currentPhases = getLatestPhases();
      const newPhases = currentPhases.map((phase) => ({
        ...phase,
        agentsOnCanvas: phase.agentsOnCanvas.map((agent) => ({
          ...agent,
          x: 2 * mapCenterX - agent.x,
          y: 2 * mapCenterY - agent.y,
        })),
        abilitiesOnCanvas: phase.abilitiesOnCanvas.map((ability) => ({
          ...ability,
          x: 2 * mapCenterX - ability.x,
          y: 2 * mapCenterY - ability.y,
          currentRotation:
            ability.action === "icon"
              ? ability.currentRotation
              : ((ability.currentRotation || 0) + 180) % 360,
        })),
        textsOnCanvas: phase.textsOnCanvas.map((text) => {
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
        imagesOnCanvas: phase.imagesOnCanvas.map((image) => {
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
        drawLines: phase.drawLines.map((line) => ({
          ...line,
          points: line.points.map((point) => ({
            x: 2 * mapCenterX - point.x,
            y: 2 * mapCenterY - point.y,
          })),
        })),
        toolIconsOnCanvas: phase.toolIconsOnCanvas.map((toolIcon) => ({
          ...toolIcon,
          x: 2 * mapCenterX - toolIcon.x,
          y: 2 * mapCenterY - toolIcon.y,
        })),
      }));

      setPhasesBase(newPhases);
      bumpRevision();
      onRotated?.(newPhases);
    },
    [getLatestPhases, setPhasesBase, bumpRevision],
  );

  const getCurrentStateForSync = useCallback(
    () => ({
      phases: getLatestPhasesRef.current(),
      selectedMap: selectedMapRef.current,
      mapSide: mapSideRef.current,
      currentPhaseIndex: currentPhaseIndexRef.current,
      editedPhases: Array.from(editedPhasesRef.current),
      agentsSettings: agentsSettingsRef.current,
      abilitiesSettings: abilitiesSettingsRef.current,
    }),
    [],
  );

  const getLatestEntities = useCallback((): CanvasEntitiesSnapshot => {
    const phase = getLatestPhasesRef.current()[currentPhaseIndexRef.current];

    if (!phase) {
      return EMPTY_CANVAS_ENTITIES;
    }

    return {
      agentsOnCanvas: phase.agentsOnCanvas,
      abilitiesOnCanvas: phase.abilitiesOnCanvas,
      drawLines: phase.drawLines,
      connectingLines: phase.connectingLines,
      textsOnCanvas: phase.textsOnCanvas,
      imagesOnCanvas: phase.imagesOnCanvas,
      toolIconsOnCanvas: phase.toolIconsOnCanvas,
    };
  }, []);

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
    history: isHistoryReady ? history : [],
    undo,
    redo,
    canUndo: isHistoryReady ? historyCanUndo : false,
    canRedo: isHistoryReady ? historyCanRedo : false,
    saveToHistory,
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
    agentsSettings,
    abilitiesSettings,
    updateAgentsSettings: wrappedUpdateAgentsSettings,
    updateAbilitiesSettings: wrappedUpdateAbilitiesSettings,
    resetState,
    applyRemoteState,
    isLoadingLobby,
    isErrorLobby,
    lobbyError,
    rotateCanvasItemsForSideSwap,
    getCurrentStateForSync,
    getLatestEntities,
    enqueueCanvasPatchEntry,
    flushCanvasPatch,
  };
};
