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
import {
  enqueueCanvasPhaseSnapshot,
  splitDrawLineIntoChunks,
} from "@/lib/canvas-patches";

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

  const entityNotifiers = useMemo(() => {
    const notifyEntity = (
      entity: string,
      action: "add" | "update",
      id: string,
      payload: Record<string, unknown> | undefined,
      broadcast: () => void,
    ) => {
      notifyChange({ entity, action, id, payload, broadcast });
    };
    const notifyRemoved = (
      entity: string,
      id: string,
      broadcast: () => void,
    ) => {
      notifyChange({ entity, action: "remove", id, broadcast });
    };

    return {
      notifyAgentAdded: (agent: AgentCanvas) =>
        notifyEntity("agent", "add", agent.id, agent, () =>
          broadcastAgentAdded(agent, currentPhaseIndex),
        ),
      notifyAgentMoved: (agent: AgentCanvas) =>
        notifyEntity("agent", "update", agent.id, agent, () =>
          broadcastAgentMoved(agent, currentPhaseIndex),
        ),
      notifyAgentRemoved: (id: string) =>
        notifyRemoved("agent", id, () =>
          broadcastAgentRemoved(id, currentPhaseIndex),
        ),
      notifyAbilityAdded: (ability: AbilityCanvas) =>
        notifyEntity("ability", "add", ability.id, ability, () =>
          broadcastAbilityAdded(ability, currentPhaseIndex),
        ),
      notifyAbilityMoved: (ability: AbilityCanvas) =>
        notifyEntity("ability", "update", ability.id, ability, () =>
          broadcastAbilityMoved(ability, currentPhaseIndex),
        ),
      notifyAbilityRemoved: (id: string) =>
        notifyRemoved("ability", id, () =>
          broadcastAbilityRemoved(id, currentPhaseIndex),
        ),
      notifyConnLineAdded: (line: ConnectingLine) =>
        notifyEntity("connectingline", "add", line.id, line, () =>
          broadcastConnLineAdded(line, currentPhaseIndex),
        ),
      notifyConnLineUpdated: (line: ConnectingLine) =>
        notifyEntity("connectingline", "update", line.id, line, () =>
          broadcastConnLineUpdated(line, currentPhaseIndex),
        ),
      notifyConnLineRemoved: (id: string) =>
        notifyRemoved("connectingline", id, () =>
          broadcastConnLineRemoved(id, currentPhaseIndex),
        ),
      notifyTextAdded: (text: TextCanvas) =>
        notifyEntity("text", "add", text.id, text, () =>
          broadcastTextAdded(text, currentPhaseIndex),
        ),
      notifyTextUpdated: (text: TextCanvas) =>
        notifyEntity("text", "update", text.id, text, () =>
          broadcastTextUpdated(text, currentPhaseIndex),
        ),
      notifyTextRemoved: (id: string) =>
        notifyRemoved("text", id, () =>
          broadcastTextRemoved(id, currentPhaseIndex),
        ),
      notifyImageAdded: (image: ImageCanvas) =>
        notifyEntity("image", "add", image.id, image, () =>
          broadcastImageAdded(image, currentPhaseIndex),
        ),
      notifyImageMoved: (image: ImageCanvas) =>
        notifyEntity("image", "update", image.id, image, () =>
          broadcastImageMoved(image, currentPhaseIndex),
        ),
      notifyImageUpdated: (image: ImageCanvas) =>
        notifyEntity("image", "update", image.id, image, () =>
          broadcastImageUpdated(image, currentPhaseIndex),
        ),
      notifyImageRemoved: (id: string) =>
        notifyRemoved("image", id, () =>
          broadcastImageRemoved(id, currentPhaseIndex),
        ),
      notifyToolIconAdded: (toolIcon: ToolIconCanvas) =>
        notifyEntity("toolicon", "add", toolIcon.id, toolIcon, () =>
          broadcastToolIconAdded(toolIcon, currentPhaseIndex),
        ),
      notifyToolIconMoved: (toolIcon: ToolIconCanvas) =>
        notifyEntity("toolicon", "update", toolIcon.id, toolIcon, () =>
          broadcastToolIconMoved(toolIcon, currentPhaseIndex),
        ),
      notifyToolIconRemoved: (id: string) =>
        notifyRemoved("toolicon", id, () =>
          broadcastToolIconRemoved(id, currentPhaseIndex),
        ),
    };
  }, [
    notifyChange,
    currentPhaseIndex,
    broadcastAgentAdded,
    broadcastAgentMoved,
    broadcastAgentRemoved,
    broadcastAbilityAdded,
    broadcastAbilityMoved,
    broadcastAbilityRemoved,
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
    broadcastToolIconAdded,
    broadcastToolIconMoved,
    broadcastToolIconRemoved,
  ]);

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

  const notifyFullSync = useCallback(() => {
    void flushCanvasPatch();

    if (isConnected) {
      broadcastStateSync();
    }
  }, [isConnected, broadcastStateSync, flushCanvasPatch]);

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
      ...entityNotifiers,
      notifyLineDrawn,
      notifyLineRemoved,
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
      entityNotifiers,
      notifyLineDrawn,
      notifyLineRemoved,
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
