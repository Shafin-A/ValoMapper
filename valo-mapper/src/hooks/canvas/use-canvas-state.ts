import { useLobby } from "@/hooks/api/use-lobby";
import {
  useCanvasItems,
  useCanvasUI,
  useHistoryManager,
  usePhaseManager,
  usePhaseTransitions,
} from "@/hooks/canvas";
import { useCanvasPatch } from "@/hooks/canvas/use-canvas-patch";
import { useSettings } from "@/contexts/settings-context";
import { MapOption, MapSide, PhaseState, UndoableState } from "@/lib/types";
import { MAP_SIZE, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from "@/lib/consts";
import { useParams } from "next/navigation";
import { SetStateAction, useCallback, useEffect, useRef } from "react";
import { parseTimestamp } from "@/lib/utils";

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

  const phaseUnloadRef = useRef<(() => void) | null>(null);
  const { enqueueCanvasPatchEntry } = useCanvasPatch(lobbyCode, phaseUnloadRef);

  const {
    data: lobby,
    isLoading: isLoadingLobby,
    isError: isErrorLobby,
    error: lobbyError,
  } = useLobby(lobbyCode);
  const lastSavedStateRef = useRef<UndoableState | null>(null);

  const lastLoadedLobbyRef = useRef<string>("");
  const lastAppliedLobbyUpdatedAt = useRef<string>("");

  const canvasItems = useCanvasItems(
    phaseManager.currentPhase,
    phaseManager.updateCurrentPhase,
  );

  const wrappedSetAgentsOnCanvas = useCallback(
    (value: Parameters<typeof canvasItems.setAgentsOnCanvas>[0]) => {
      canvasItems.setAgentsOnCanvas(value);
    },
    [canvasItems],
  );

  const wrappedSetAbilitiesOnCanvas = useCallback(
    (value: Parameters<typeof canvasItems.setAbilitiesOnCanvas>[0]) => {
      canvasItems.setAbilitiesOnCanvas(value);
    },
    [canvasItems],
  );

  const wrappedSetDrawLines = useCallback(
    (value: Parameters<typeof canvasItems.setDrawLines>[0]) => {
      canvasItems.setDrawLines(value);
    },
    [canvasItems],
  );

  const wrappedSetConnectingLines = useCallback(
    (value: Parameters<typeof canvasItems.setConnectingLines>[0]) => {
      canvasItems.setConnectingLines(value);
    },
    [canvasItems],
  );

  const wrappedSetImagesOnCanvas = useCallback(
    (value: Parameters<typeof canvasItems.setImagesOnCanvas>[0]) => {
      canvasItems.setImagesOnCanvas(value);
    },
    [canvasItems],
  );

  const wrappedSetTextsOnCanvas = useCallback(
    (value: Parameters<typeof canvasItems.setTextsOnCanvas>[0]) => {
      canvasItems.setTextsOnCanvas(value);
    },
    [canvasItems],
  );

  const wrappedSetToolIconsOnCanvas = useCallback(
    (value: Parameters<typeof canvasItems.setToolIconsOnCanvas>[0]) => {
      canvasItems.setToolIconsOnCanvas(value);
    },
    [canvasItems],
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
    },
    [phaseManager],
  );

  const wrappedSwitchToPhase = useCallback(
    (index: number) => {
      phaseManager.switchToPhase(index);
    },
    [phaseManager],
  );

  const wrappedDuplicatePhase = useCallback(
    (index: number) => {
      phaseManager.duplicatePhase(index);
    },
    [phaseManager],
  );

  const wrappedDeletePhase = useCallback(
    (index: number) => {
      phaseManager.deletePhase(index);
    },
    [phaseManager],
  );

  const wrappedSetCurrentPhaseIndex = useCallback(
    (index: number) => {
      phaseManager.setCurrentPhaseIndex(index);
    },
    [phaseManager],
  );

  const wrappedSetPhases = useCallback(
    (value: PhaseState[] | ((prev: PhaseState[]) => PhaseState[])) => {
      phaseManager.setPhases(value);
    },
    [phaseManager],
  );

  const wrappedResetAllPhases = useCallback(() => {
    phaseManager.resetAllPhases();
  }, [phaseManager]);

  const wrappedSetSelectedMap = useCallback(
    (value: SetStateAction<MapOption>) => {
      canvasUI.setSelectedMap(value);
    },
    [canvasUI],
  );

  const wrappedSetMapSide = useCallback(
    (value: SetStateAction<MapSide>) => {
      canvasUI.setMapSide(value);
    },
    [canvasUI],
  );

  const wrappedUpdateAgentsSettings = useCallback(
    (settings: Parameters<typeof updateAgentsSettings>[0]) => {
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
      updateAgentsSettings,
      phaseManager.currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const wrappedUpdateAbilitiesSettings = useCallback(
    (settings: Parameters<typeof updateAbilitiesSettings>[0]) => {
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
      updateAbilitiesSettings,
      phaseManager.currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const historyManager = useHistoryManager({
    getCurrentState,
    applyState,
    onApplyHistoryState: () => {},
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
    [phaseManager, canvasUI],
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

      const phase = phaseManager.getLatestPhases()[currentPhaseIndex];
      if (!phase) return;

      const hasContent =
        phase.agentsOnCanvas.length > 0 ||
        phase.abilitiesOnCanvas.length > 0 ||
        phase.drawLines.length > 0 ||
        phase.connectingLines.length > 0 ||
        phase.textsOnCanvas.length > 0 ||
        phase.imagesOnCanvas.length > 0 ||
        phase.toolIconsOnCanvas.length > 0;

      if (!hasContent) return;

      phase.agentsOnCanvas.forEach((agent) =>
        enqueueCanvasPatchEntry({
          entity: "agent",
          action: "add",
          phaseIndex: currentPhaseIndex,
          id: agent.id,
          payload: agent,
        }),
      );
      phase.abilitiesOnCanvas.forEach((ability) =>
        enqueueCanvasPatchEntry({
          entity: "ability",
          action: "add",
          phaseIndex: currentPhaseIndex,
          id: ability.id,
          payload: ability,
        }),
      );
      phase.drawLines.forEach((line) =>
        enqueueCanvasPatchEntry({
          entity: "drawline",
          action: "add",
          phaseIndex: currentPhaseIndex,
          id: line.id,
          payload: line,
        }),
      );
      phase.connectingLines.forEach((line) =>
        enqueueCanvasPatchEntry({
          entity: "connectingline",
          action: "add",
          phaseIndex: currentPhaseIndex,
          id: line.id,
          payload: line,
        }),
      );
      phase.textsOnCanvas.forEach((text) =>
        enqueueCanvasPatchEntry({
          entity: "text",
          action: "add",
          phaseIndex: currentPhaseIndex,
          id: text.id,
          payload: text,
        }),
      );
      phase.imagesOnCanvas.forEach((image) =>
        enqueueCanvasPatchEntry({
          entity: "image",
          action: "add",
          phaseIndex: currentPhaseIndex,
          id: image.id,
          payload: image,
        }),
      );
      phase.toolIconsOnCanvas.forEach((icon) =>
        enqueueCanvasPatchEntry({
          entity: "toolicon",
          action: "add",
          phaseIndex: currentPhaseIndex,
          id: icon.id,
          payload: icon,
        }),
      );
      enqueueCanvasPatchEntry({
        entity: "edited_phases",
        action: "update",
        phaseIndex: currentPhaseIndex,
        payload: {
          editedPhases: [...Array.from(editedPhases), currentPhaseIndex],
        },
      });
    };
  }, [phaseManager.getLatestPhases, enqueueCanvasPatchEntry, phaseManager]);

  useEffect(() => {
    if (!lobbyCode || !lobby) return;

    const isNewLobby = lobbyCode !== lastLoadedLobbyRef.current;
    const lobbyUpdatedAt = lobby.updatedAt?.toString() || "";

    const lastApplied = lastAppliedLobbyUpdatedAt.current || "";

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
    [applyState, updateAgentsSettings, updateAbilitiesSettings],
  );

  const rotateCanvasItemsForSideSwap = useCallback(
    (onRotated?: (newPhases: PhaseState[]) => void) => {
      const mapCenterX = (VIRTUAL_WIDTH - MAP_SIZE) / 2 + MAP_SIZE / 2;
      const mapCenterY = (VIRTUAL_HEIGHT - MAP_SIZE) / 2 + MAP_SIZE / 2;

      const currentPhases = phaseManager.getLatestPhases();
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
          currentRotation: ((ability.currentRotation || 0) + 180) % 360,
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

      phaseManager.setPhases(newPhases);
      onRotated?.(newPhases);
    },
    [phaseManager],
  );

  const getCurrentStateForSync = useCallback(
    () => ({
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
  };
};
