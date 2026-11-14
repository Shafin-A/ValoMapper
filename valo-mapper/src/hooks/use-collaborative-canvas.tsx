"use client";

import { useWebSocket } from "@/contexts/websocket-context";
import { useCanvasActions, useCanvasPhase } from "@/contexts/canvas-context";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  AgentCanvas,
  AbilityCanvas,
  DrawLine,
  ConnectingLine,
  TextCanvas,
  ToolIconCanvas,
  MapOption,
  MapSide,
  ImageCanvas,
  IconSettings,
  PhaseState,
} from "@/lib/types";
import { debounce } from "@/lib/utils";
import { enqueueCanvasPhaseSnapshot } from "@/lib/canvas-patches";
import { MAX_DRAWLINE_POINTS } from "@/lib/consts/misc/consts";

const useCollaborativeCanvasActions = () => {
  const {
    currentPhaseIndex,
    editedPhases,
  } = useCanvasPhase();

  const {
    agentsSettings,
    abilitiesSettings,
    updateAgentsSettings,
    updateAbilitiesSettings,
    getLatestPhases,
    enqueueCanvasPatchEntry,
    flushCanvasPatch,
  } = useCanvasActions();

  const drawLineChunks = useRef<Record<string, string[]>>({});

  const syncedPhasesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    syncedPhasesRef.current.forEach((phaseIndex) => {
      if (!editedPhases.has(phaseIndex)) {
        syncedPhasesRef.current.delete(phaseIndex);
      }
    });
  }, [editedPhases]);

  const syncPhaseIfNecessary = useCallback(
    (phaseIndex: number) => {
      if (editedPhases.has(phaseIndex)) return;
      if (syncedPhasesRef.current.has(phaseIndex)) return;

      syncedPhasesRef.current.add(phaseIndex);

      const phase = getLatestPhases()[phaseIndex];
      if (!phase) return;

      enqueueCanvasPhaseSnapshot({
        phase,
        phaseIndex,
        editedPhases,
        enqueue: enqueueCanvasPatchEntry,
      });
    },
    [editedPhases, getLatestPhases, enqueueCanvasPatchEntry],
  );

  const syncPhaseIfNecessaryRef = useRef(syncPhaseIfNecessary);

  useEffect(() => {
    syncPhaseIfNecessaryRef.current = syncPhaseIfNecessary;
  }, [syncPhaseIfNecessary]);

  const {
    status,
    broadcastAgentAdded,
    broadcastAgentMoved,
    broadcastAgentRemoved,
    broadcastAbilityAdded,
    broadcastAbilityMoved,
    broadcastAbilityRemoved,
    broadcastLineDrawn,
    broadcastLineRemoved,
    broadcastConnLineAdded,
    broadcastConnLineUpdated,
    broadcastConnLineRemoved,
    broadcastTextAdded,
    broadcastTextUpdated,
    broadcastTextRemoved,
    broadcastImageAdded,
    broadcastImageMoved,
    broadcastImageUpdated,
    broadcastImageRemoved,
    broadcastStateSync,
    broadcastToolIconAdded,
    broadcastToolIconMoved,
    broadcastToolIconRemoved,
    broadcastMapChanged,
    broadcastSideChanged,
    broadcastPhaseChanged,
    broadcastSettingsChanged,
  } = useWebSocket();

  const isConnected = status === "connected";

  const notifyChange = useCallback(
    ({
      entity,
      action,
      id,
      payload,
      broadcast,
    }: {
      entity: string;
      action: "add" | "update" | "remove";
      id?: string;
      payload?: Record<string, unknown>;
      broadcast?: () => void;
    }) => {
      syncPhaseIfNecessaryRef.current(currentPhaseIndex);
      enqueueCanvasPatchEntry({
        entity,
        action,
        phaseIndex: currentPhaseIndex,
        id,
        payload,
      });

      if (isConnected) {
        broadcast?.();
      }
    },
    [isConnected, currentPhaseIndex, enqueueCanvasPatchEntry],
  );

  const notifyAgentAdded = useCallback(
    (agent: AgentCanvas) => {
      notifyChange({
        entity: "agent",
        action: "add",
        id: agent.id,
        payload: agent,
        broadcast: () => broadcastAgentAdded(agent, currentPhaseIndex),
      });
    },
    [broadcastAgentAdded, currentPhaseIndex, notifyChange],
  );

  const notifyAgentMoved = useCallback(
    (agent: AgentCanvas) => {
      notifyChange({
        entity: "agent",
        action: "update",
        id: agent.id,
        payload: agent,
        broadcast: () => broadcastAgentMoved(agent, currentPhaseIndex),
      });
    },
    [broadcastAgentMoved, currentPhaseIndex, notifyChange],
  );

  const notifyAgentRemoved = useCallback(
    (id: string) => {
      notifyChange({
        entity: "agent",
        action: "remove",
        id,
        broadcast: () => broadcastAgentRemoved(id, currentPhaseIndex),
      });
    },
    [broadcastAgentRemoved, currentPhaseIndex, notifyChange],
  );

  const notifyAbilityAdded = useCallback(
    (ability: AbilityCanvas) => {
      notifyChange({
        entity: "ability",
        action: "add",
        id: ability.id,
        payload: ability,
        broadcast: () => broadcastAbilityAdded(ability, currentPhaseIndex),
      });
    },
    [broadcastAbilityAdded, currentPhaseIndex, notifyChange],
  );

  const notifyAbilityMoved = useCallback(
    (ability: AbilityCanvas) => {
      notifyChange({
        entity: "ability",
        action: "update",
        id: ability.id,
        payload: ability,
        broadcast: () => broadcastAbilityMoved(ability, currentPhaseIndex),
      });
    },
    [broadcastAbilityMoved, currentPhaseIndex, notifyChange],
  );

  const notifyAbilityRemoved = useCallback(
    (id: string) => {
      notifyChange({
        entity: "ability",
        action: "remove",
        id,
        broadcast: () => broadcastAbilityRemoved(id, currentPhaseIndex),
      });
    },
    [broadcastAbilityRemoved, currentPhaseIndex, notifyChange],
  );

  const splitDrawLineIntoChunks = (line: DrawLine): DrawLine[] => {
    if (line.points.length <= MAX_DRAWLINE_POINTS) {
      return [line];
    }

    const chunks: DrawLine[] = [];
    const totalChunks = Math.ceil(line.points.length / MAX_DRAWLINE_POINTS);

    for (let i = 0; i < totalChunks; i += 1) {
      const start = i * MAX_DRAWLINE_POINTS;
      const end = Math.min(start + MAX_DRAWLINE_POINTS, line.points.length);
      const segmentPoints = [...line.points.slice(start, end)];

      if (i > 0) {
        segmentPoints.unshift(line.points[start - 1]);
      }

      chunks.push({
        ...line,
        id: `${line.id}-chunk-${i}`,
        points: segmentPoints,
        parentId: line.id,
        chunkIndex: i,
        totalChunks,
      });
    }

    return chunks;
  };

  const notifyLineDrawn = useCallback(
    (line: DrawLine) => {
      syncPhaseIfNecessaryRef.current(currentPhaseIndex);
      const chunks = splitDrawLineIntoChunks(line);
      drawLineChunks.current[line.id] = chunks.map((chunk) => chunk.id);

      chunks.forEach((chunk) => {
        enqueueCanvasPatchEntry({
          entity: "drawline",
          action: "add",
          phaseIndex: currentPhaseIndex,
          id: chunk.id,
          payload: chunk,
        });

        if (isConnected) {
          broadcastLineDrawn(chunk, currentPhaseIndex);
        }
      });
    },
    [
      isConnected,
      broadcastLineDrawn,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyLineRemoved = useCallback(
    (id: string) => {
      syncPhaseIfNecessaryRef.current(currentPhaseIndex);
      const unchunkedId = id.match(/^(.+)-chunk-\d+$/)?.[1] ?? id;
      const chunks = drawLineChunks.current[unchunkedId] ?? [];
      const idsToRemove = new Set<string>([unchunkedId, ...chunks]);

      idsToRemove.forEach((removeId) => {
        enqueueCanvasPatchEntry({
          entity: "drawline",
          action: "remove",
          phaseIndex: currentPhaseIndex,
          id: removeId,
        });

        if (isConnected) {
          broadcastLineRemoved(removeId, currentPhaseIndex);
        }
      });

      delete drawLineChunks.current[unchunkedId];
    },
    [
      isConnected,
      broadcastLineRemoved,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyConnLineAdded = useCallback(
    (line: ConnectingLine) => {
      notifyChange({
        entity: "connectingline",
        action: "add",
        id: line.id,
        payload: line,
        broadcast: () => broadcastConnLineAdded(line, currentPhaseIndex),
      });
    },
    [broadcastConnLineAdded, currentPhaseIndex, notifyChange],
  );

  const notifyConnLineUpdated = useCallback(
    (line: ConnectingLine) => {
      notifyChange({
        entity: "connectingline",
        action: "update",
        id: line.id,
        payload: line,
        broadcast: () => broadcastConnLineUpdated(line, currentPhaseIndex),
      });
    },
    [broadcastConnLineUpdated, currentPhaseIndex, notifyChange],
  );

  const notifyConnLineRemoved = useCallback(
    (id: string) => {
      notifyChange({
        entity: "connectingline",
        action: "remove",
        id,
        broadcast: () => broadcastConnLineRemoved(id, currentPhaseIndex),
      });
    },
    [broadcastConnLineRemoved, currentPhaseIndex, notifyChange],
  );

  const notifyTextAdded = useCallback(
    (text: TextCanvas) => {
      notifyChange({
        entity: "text",
        action: "add",
        id: text.id,
        payload: text,
        broadcast: () => broadcastTextAdded(text, currentPhaseIndex),
      });
    },
    [broadcastTextAdded, currentPhaseIndex, notifyChange],
  );

  const notifyTextUpdated = useCallback(
    (text: TextCanvas) => {
      notifyChange({
        entity: "text",
        action: "update",
        id: text.id,
        payload: text,
        broadcast: () => broadcastTextUpdated(text, currentPhaseIndex),
      });
    },
    [broadcastTextUpdated, currentPhaseIndex, notifyChange],
  );

  const notifyTextRemoved = useCallback(
    (id: string) => {
      notifyChange({
        entity: "text",
        action: "remove",
        id,
        broadcast: () => broadcastTextRemoved(id, currentPhaseIndex),
      });
    },
    [broadcastTextRemoved, currentPhaseIndex, notifyChange],
  );

  const notifyImageAdded = useCallback(
    (image: ImageCanvas) => {
      notifyChange({
        entity: "image",
        action: "add",
        id: image.id,
        payload: image,
        broadcast: () => broadcastImageAdded(image, currentPhaseIndex),
      });
    },
    [broadcastImageAdded, currentPhaseIndex, notifyChange],
  );

  const notifyFullSync = useCallback(() => {
    void flushCanvasPatch();

    if (isConnected) {
      broadcastStateSync();
    }
  }, [isConnected, broadcastStateSync, flushCanvasPatch]);

  const notifyImageMoved = useCallback(
    (image: ImageCanvas) => {
      notifyChange({
        entity: "image",
        action: "update",
        id: image.id,
        payload: image,
        broadcast: () => broadcastImageMoved(image, currentPhaseIndex),
      });
    },
    [broadcastImageMoved, currentPhaseIndex, notifyChange],
  );

  const notifyImageUpdated = useCallback(
    (image: ImageCanvas) => {
      notifyChange({
        entity: "image",
        action: "update",
        id: image.id,
        payload: image,
        broadcast: () => broadcastImageUpdated(image, currentPhaseIndex),
      });
    },
    [broadcastImageUpdated, currentPhaseIndex, notifyChange],
  );

  const notifyImageRemoved = useCallback(
    (id: string) => {
      notifyChange({
        entity: "image",
        action: "remove",
        id,
        broadcast: () => broadcastImageRemoved(id, currentPhaseIndex),
      });
    },
    [broadcastImageRemoved, currentPhaseIndex, notifyChange],
  );

  const notifyToolIconAdded = useCallback(
    (toolIcon: ToolIconCanvas) => {
      notifyChange({
        entity: "toolicon",
        action: "add",
        id: toolIcon.id,
        payload: toolIcon,
        broadcast: () => broadcastToolIconAdded(toolIcon, currentPhaseIndex),
      });
    },
    [broadcastToolIconAdded, currentPhaseIndex, notifyChange],
  );

  const notifyToolIconMoved = useCallback(
    (toolIcon: ToolIconCanvas) => {
      notifyChange({
        entity: "toolicon",
        action: "update",
        id: toolIcon.id,
        payload: toolIcon,
        broadcast: () => broadcastToolIconMoved(toolIcon, currentPhaseIndex),
      });
    },
    [broadcastToolIconMoved, currentPhaseIndex, notifyChange],
  );

  const notifyToolIconRemoved = useCallback(
    (id: string) => {
      notifyChange({
        entity: "toolicon",
        action: "remove",
        id,
        broadcast: () => broadcastToolIconRemoved(id, currentPhaseIndex),
      });
    },
    [broadcastToolIconRemoved, currentPhaseIndex, notifyChange],
  );

  const sendAgentsSettingsUpdate = useMemo(
    () =>
      debounce((updatedSettings: IconSettings, phaseIndex: number) => {
        enqueueCanvasPatchEntry({
          entity: "agents_settings",
          action: "update",
          phaseIndex,
          payload: { agentsSettings: updatedSettings },
        });

        if (isConnected) {
          broadcastSettingsChanged({ agentsSettings: updatedSettings });
        }
      }, 120),
    [enqueueCanvasPatchEntry, isConnected, broadcastSettingsChanged],
  );

  const notifyAgentsSettingsChanged = useCallback(
    (settings: Partial<IconSettings>) => {
      const updatedSettings = { ...agentsSettings, ...settings };
      updateAgentsSettings(settings);

      sendAgentsSettingsUpdate(updatedSettings, currentPhaseIndex);
    },
    [
      agentsSettings,
      updateAgentsSettings,
      currentPhaseIndex,
      sendAgentsSettingsUpdate,
    ],
  );

  const sendAbilitiesSettingsUpdate = useMemo(
    () =>
      debounce((updatedSettings: IconSettings, phaseIndex: number) => {
        enqueueCanvasPatchEntry({
          entity: "abilities_settings",
          action: "update",
          phaseIndex,
          payload: { abilitiesSettings: updatedSettings },
        });

        if (isConnected) {
          broadcastSettingsChanged({ abilitiesSettings: updatedSettings });
        }
      }, 120),
    [enqueueCanvasPatchEntry, isConnected, broadcastSettingsChanged],
  );

  const notifyAbilitiesSettingsChanged = useCallback(
    (settings: Partial<IconSettings>) => {
      const updatedSettings = { ...abilitiesSettings, ...settings };
      updateAbilitiesSettings(settings);

      sendAbilitiesSettingsUpdate(updatedSettings, currentPhaseIndex);
    },
    [
      abilitiesSettings,
      updateAbilitiesSettings,
      currentPhaseIndex,
      sendAbilitiesSettingsUpdate,
    ],
  );

  const notifyMapChanged = useCallback(
    (selectedMap: MapOption, resetAll: boolean = false) => {
      notifyChange({
        entity: "map",
        action: "update",
        payload: {
          id: selectedMap.id,
          text: selectedMap.text,
          textColor: selectedMap.textColor,
        },
        broadcast: () => broadcastMapChanged(selectedMap),
      });

      if (resetAll) {
        enqueueCanvasPatchEntry({
          entity: "canvas",
          action: "reset",
          phaseIndex: currentPhaseIndex,
          payload: { resetAll: true },
        });
      }
    },
    [broadcastMapChanged, currentPhaseIndex, enqueueCanvasPatchEntry, notifyChange],
  );

  const notifySideChanged = useCallback(
    (mapSide: MapSide) => {
      notifyChange({
        entity: "side",
        action: "update",
        payload: { mapSide },
        broadcast: () => broadcastSideChanged(mapSide),
      });
    },
    [broadcastSideChanged, notifyChange],
  );

  const notifyCanvasClear = useCallback(
    (resetAll: boolean = false) => {
      enqueueCanvasPatchEntry({
        entity: "canvas",
        action: resetAll ? "reset" : "clear",
        phaseIndex: currentPhaseIndex,
        payload: resetAll ? { resetAll: true } : undefined,
      });

      if (isConnected) {
        broadcastStateSync();
      }
    },
    [
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
      isConnected,
      broadcastStateSync,
    ],
  );

  const notifyPhaseChanged = useCallback(
    (phaseIndex: number) => {
      enqueueCanvasPatchEntry({
        entity: "phase",
        action: "update",
        phaseIndex,
        payload: { phaseIndex },
      });

      enqueueCanvasPatchEntry({
        entity: "edited_phases",
        action: "update",
        phaseIndex,
        payload: { editedPhases: Array.from(editedPhases) },
      });

      if (isConnected) {
        broadcastPhaseChanged(phaseIndex);
      }
    },
    [enqueueCanvasPatchEntry, editedPhases, isConnected, broadcastPhaseChanged],
  );

  const notifyAllPhasesRotated = useCallback(
    (rotatedPhases: PhaseState[]) => {
      rotatedPhases.forEach((phase, phaseIndex) => {
        if (!editedPhases.has(phaseIndex)) return;

        phase.agentsOnCanvas.forEach((agent) => {
          enqueueCanvasPatchEntry({
            entity: "agent",
            action: "update",
            phaseIndex,
            id: agent.id,
            payload: agent,
          });
        });

        phase.abilitiesOnCanvas.forEach((ability) => {
          enqueueCanvasPatchEntry({
            entity: "ability",
            action: "update",
            phaseIndex,
            id: ability.id,
            payload: ability,
          });
        });

        phase.textsOnCanvas.forEach((text) => {
          enqueueCanvasPatchEntry({
            entity: "text",
            action: "update",
            phaseIndex,
            id: text.id,
            payload: text,
          });
        });

        phase.imagesOnCanvas.forEach((image) => {
          enqueueCanvasPatchEntry({
            entity: "image",
            action: "update",
            phaseIndex,
            id: image.id,
            payload: image,
          });
        });

        phase.drawLines.forEach((line) => {
          const chunks = splitDrawLineIntoChunks(line);
          chunks.forEach((chunk) => {
            enqueueCanvasPatchEntry({
              entity: "drawline",
              action: "add",
              phaseIndex,
              id: chunk.id,
              payload: chunk,
            });
          });
        });

        phase.toolIconsOnCanvas.forEach((icon) => {
          enqueueCanvasPatchEntry({
            entity: "toolicon",
            action: "update",
            phaseIndex,
            id: icon.id,
            payload: icon,
          });
        });
      });
    },
    [editedPhases, enqueueCanvasPatchEntry],
  );

  return useMemo(
    () => ({
      isConnected,
      notifyAgentAdded,
      notifyAgentMoved,
      notifyAgentRemoved,
      notifyAbilityAdded,
      notifyAbilityMoved,
      notifyAbilityRemoved,
      notifyLineDrawn,
      notifyLineRemoved,
      notifyConnLineAdded,
      notifyConnLineUpdated,
      notifyConnLineRemoved,
      notifyTextAdded,
      notifyTextUpdated,
      notifyTextRemoved,
      notifyImageAdded,
      notifyImageMoved,
      notifyImageUpdated,
      notifyImageRemoved,
      notifyToolIconAdded,
      notifyToolIconMoved,
      notifyToolIconRemoved,
      notifyMapChanged,
      notifySideChanged,
      notifyPhaseChanged,
      notifyCanvasClear,
      notifyAgentsSettingsChanged,
      notifyAbilitiesSettingsChanged,
      notifyFullSync,
      notifyAllPhasesRotated,
    }),
    [
      isConnected,
      notifyAgentAdded,
      notifyAgentMoved,
      notifyAgentRemoved,
      notifyAbilityAdded,
      notifyAbilityMoved,
      notifyAbilityRemoved,
      notifyLineDrawn,
      notifyLineRemoved,
      notifyConnLineAdded,
      notifyConnLineUpdated,
      notifyConnLineRemoved,
      notifyTextAdded,
      notifyTextUpdated,
      notifyTextRemoved,
      notifyImageAdded,
      notifyImageMoved,
      notifyImageUpdated,
      notifyImageRemoved,
      notifyToolIconAdded,
      notifyToolIconMoved,
      notifyToolIconRemoved,
      notifyMapChanged,
      notifySideChanged,
      notifyPhaseChanged,
      notifyCanvasClear,
      notifyAgentsSettingsChanged,
      notifyAbilitiesSettingsChanged,
      notifyFullSync,
      notifyAllPhasesRotated,
    ],
  );
};

type CollaborativeCanvasContextType = ReturnType<
  typeof useCollaborativeCanvasActions
>;

const CollaborativeCanvasContext = createContext<
  CollaborativeCanvasContextType | undefined
>(undefined);

export const CollaborativeCanvasProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const value = useCollaborativeCanvasActions();

  return (
    <CollaborativeCanvasContext.Provider value={value}>
      {children}
    </CollaborativeCanvasContext.Provider>
  );
};

export const useCollaborativeCanvas = () => {
  const context = useContext(CollaborativeCanvasContext);
  if (context === undefined) {
    throw new Error(
      "useCollaborativeCanvas must be used within a CollaborativeCanvasProvider",
    );
  }
  return context;
};
