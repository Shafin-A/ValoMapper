import { useWebSocket } from "@/contexts/websocket-context";
import { useCanvas } from "@/contexts/canvas-context";
import { useCanvasPatch } from "@/hooks/canvas/use-canvas-patch";
import { useParams } from "next/navigation";
import { useCallback, useMemo } from "react";
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
} from "@/lib/types";
import { debounce } from "@/lib/utils";

export const useCollaborativeCanvas = () => {
  const params = useParams();
  const lobbyCode =
    typeof params?.lobbyCode === "string" ? params.lobbyCode : "";

  const { enqueueCanvasPatchEntry, flushCanvasPatch } =
    useCanvasPatch(lobbyCode);

  const {
    currentPhaseIndex,
    editedPhases,
    agentsSettings,
    abilitiesSettings,
    updateAgentsSettings,
    updateAbilitiesSettings,
  } = useCanvas();

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

  const notifyAgentAdded = useCallback(
    (agent: AgentCanvas) => {
      enqueueCanvasPatchEntry({
        entity: "agent",
        action: "add",
        phaseIndex: currentPhaseIndex,
        id: agent.id,
        payload: agent,
      });

      if (isConnected) {
        broadcastAgentAdded(agent, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastAgentAdded,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyAgentMoved = useCallback(
    (agent: AgentCanvas) => {
      enqueueCanvasPatchEntry({
        entity: "agent",
        action: "update",
        phaseIndex: currentPhaseIndex,
        id: agent.id,
        payload: agent,
      });

      if (isConnected) {
        broadcastAgentMoved(agent, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastAgentMoved,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyAgentRemoved = useCallback(
    (id: string) => {
      enqueueCanvasPatchEntry({
        entity: "agent",
        action: "remove",
        phaseIndex: currentPhaseIndex,
        id,
      });

      if (isConnected) {
        broadcastAgentRemoved(id, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastAgentRemoved,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyAbilityAdded = useCallback(
    (ability: AbilityCanvas) => {
      enqueueCanvasPatchEntry({
        entity: "ability",
        action: "add",
        phaseIndex: currentPhaseIndex,
        id: ability.id,
        payload: ability,
      });

      if (isConnected) {
        broadcastAbilityAdded(ability, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastAbilityAdded,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyAbilityMoved = useCallback(
    (ability: AbilityCanvas) => {
      enqueueCanvasPatchEntry({
        entity: "ability",
        action: "update",
        phaseIndex: currentPhaseIndex,
        id: ability.id,
        payload: ability,
      });

      if (isConnected) {
        broadcastAbilityMoved(ability, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastAbilityMoved,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyAbilityRemoved = useCallback(
    (id: string) => {
      enqueueCanvasPatchEntry({
        entity: "ability",
        action: "remove",
        phaseIndex: currentPhaseIndex,
        id,
      });

      if (isConnected) {
        broadcastAbilityRemoved(id, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastAbilityRemoved,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyLineDrawn = useCallback(
    (line: DrawLine) => {
      enqueueCanvasPatchEntry({
        entity: "drawline",
        action: "add",
        phaseIndex: currentPhaseIndex,
        id: line.id,
        payload: line,
      });

      if (isConnected) {
        broadcastLineDrawn(line, currentPhaseIndex);
      }
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
      enqueueCanvasPatchEntry({
        entity: "drawline",
        action: "remove",
        phaseIndex: currentPhaseIndex,
        id,
      });

      if (isConnected) {
        broadcastLineRemoved(id, currentPhaseIndex);
      }
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
      enqueueCanvasPatchEntry({
        entity: "connectingline",
        action: "add",
        phaseIndex: currentPhaseIndex,
        id: line.id,
        payload: line,
      });

      if (isConnected) {
        broadcastConnLineAdded(line, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastConnLineAdded,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyConnLineUpdated = useCallback(
    (line: ConnectingLine) => {
      enqueueCanvasPatchEntry({
        entity: "connectingline",
        action: "update",
        phaseIndex: currentPhaseIndex,
        id: line.id,
        payload: line,
      });

      if (isConnected) {
        broadcastConnLineUpdated(line, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastConnLineUpdated,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyConnLineRemoved = useCallback(
    (id: string) => {
      enqueueCanvasPatchEntry({
        entity: "connectingline",
        action: "remove",
        phaseIndex: currentPhaseIndex,
        id,
      });

      if (isConnected) {
        broadcastConnLineRemoved(id, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastConnLineRemoved,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyTextAdded = useCallback(
    (text: TextCanvas) => {
      enqueueCanvasPatchEntry({
        entity: "text",
        action: "add",
        phaseIndex: currentPhaseIndex,
        id: text.id,
        payload: text,
      });

      if (isConnected) {
        broadcastTextAdded(text, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastTextAdded,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyTextUpdated = useCallback(
    (text: TextCanvas) => {
      enqueueCanvasPatchEntry({
        entity: "text",
        action: "update",
        phaseIndex: currentPhaseIndex,
        id: text.id,
        payload: text,
      });

      if (isConnected) {
        broadcastTextUpdated(text, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastTextUpdated,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyTextRemoved = useCallback(
    (id: string) => {
      enqueueCanvasPatchEntry({
        entity: "text",
        action: "remove",
        phaseIndex: currentPhaseIndex,
        id,
      });

      if (isConnected) {
        broadcastTextRemoved(id, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastTextRemoved,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyImageAdded = useCallback(
    (image: ImageCanvas) => {
      enqueueCanvasPatchEntry({
        entity: "image",
        action: "add",
        phaseIndex: currentPhaseIndex,
        id: image.id,
        payload: image,
      });

      if (isConnected) {
        broadcastImageAdded(image, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastImageAdded,
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

  const notifyImageMoved = useCallback(
    (image: ImageCanvas) => {
      enqueueCanvasPatchEntry({
        entity: "image",
        action: "update",
        phaseIndex: currentPhaseIndex,
        id: image.id,
        payload: image,
      });

      if (isConnected) {
        broadcastImageMoved(image, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastImageMoved,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyImageRemoved = useCallback(
    (id: string) => {
      enqueueCanvasPatchEntry({
        entity: "image",
        action: "remove",
        phaseIndex: currentPhaseIndex,
        id,
      });

      if (isConnected) {
        broadcastImageRemoved(id, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastImageRemoved,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyToolIconAdded = useCallback(
    (toolIcon: ToolIconCanvas) => {
      enqueueCanvasPatchEntry({
        entity: "toolicon",
        action: "add",
        phaseIndex: currentPhaseIndex,
        id: toolIcon.id,
        payload: toolIcon,
      });

      if (isConnected) {
        broadcastToolIconAdded(toolIcon, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastToolIconAdded,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyToolIconMoved = useCallback(
    (toolIcon: ToolIconCanvas) => {
      enqueueCanvasPatchEntry({
        entity: "toolicon",
        action: "update",
        phaseIndex: currentPhaseIndex,
        id: toolIcon.id,
        payload: toolIcon,
      });

      if (isConnected) {
        broadcastToolIconMoved(toolIcon, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastToolIconMoved,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifyToolIconRemoved = useCallback(
    (id: string) => {
      enqueueCanvasPatchEntry({
        entity: "toolicon",
        action: "remove",
        phaseIndex: currentPhaseIndex,
        id,
      });

      if (isConnected) {
        broadcastToolIconRemoved(id, currentPhaseIndex);
      }
    },
    [
      isConnected,
      broadcastToolIconRemoved,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
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
      enqueueCanvasPatchEntry({
        entity: "map",
        action: "update",
        phaseIndex: currentPhaseIndex,
        payload: {
          id: selectedMap.id,
          text: selectedMap.text,
          textColor: selectedMap.textColor,
        },
      });

      if (resetAll) {
        enqueueCanvasPatchEntry({
          entity: "canvas",
          action: "reset",
          phaseIndex: currentPhaseIndex,
          payload: { resetAll: true },
        });
      }

      if (isConnected) {
        broadcastMapChanged(selectedMap);
        if (resetAll) {
          broadcastStateSync();
        }
      }
    },
    [
      isConnected,
      broadcastMapChanged,
      broadcastStateSync,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
  );

  const notifySideChanged = useCallback(
    (mapSide: MapSide) => {
      enqueueCanvasPatchEntry({
        entity: "side",
        action: "update",
        phaseIndex: currentPhaseIndex,
        payload: { mapSide },
      });

      if (isConnected) {
        broadcastSideChanged(mapSide);
      }
    },
    [
      isConnected,
      broadcastSideChanged,
      currentPhaseIndex,
      enqueueCanvasPatchEntry,
    ],
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

  return {
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
  };
};
