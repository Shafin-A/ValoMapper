import { useWebSocket } from "@/contexts/websocket-context";
import { useCanvas } from "@/contexts/canvas-context";
import { useCallback } from "react";
import {
  AgentCanvas,
  AbilityCanvas,
  DrawLine,
  ConnectingLine,
  TextCanvas,
  ToolIconCanvas,
  MapOption,
  MapSide,
  ImagePositionData,
  ImageCanvas,
} from "@/lib/types";

export const useCollaborativeCanvas = () => {
  const { currentPhaseIndex } = useCanvas();

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
  } = useWebSocket();

  const isConnected = status === "connected";

  const notifyAgentAdded = useCallback(
    (agent: AgentCanvas) => {
      if (isConnected) {
        broadcastAgentAdded(agent, currentPhaseIndex);
      }
    },
    [isConnected, broadcastAgentAdded, currentPhaseIndex],
  );

  const notifyAgentMoved = useCallback(
    (agent: AgentCanvas) => {
      if (isConnected) {
        broadcastAgentMoved(agent, currentPhaseIndex);
      }
    },
    [isConnected, broadcastAgentMoved, currentPhaseIndex],
  );

  const notifyAgentRemoved = useCallback(
    (id: string) => {
      if (isConnected) {
        broadcastAgentRemoved(id, currentPhaseIndex);
      }
    },
    [isConnected, broadcastAgentRemoved, currentPhaseIndex],
  );

  const notifyAbilityAdded = useCallback(
    (ability: AbilityCanvas) => {
      if (isConnected) {
        broadcastAbilityAdded(ability, currentPhaseIndex);
      }
    },
    [isConnected, broadcastAbilityAdded, currentPhaseIndex],
  );

  const notifyAbilityMoved = useCallback(
    (ability: AbilityCanvas) => {
      if (isConnected) {
        broadcastAbilityMoved(ability, currentPhaseIndex);
      }
    },
    [isConnected, broadcastAbilityMoved, currentPhaseIndex],
  );

  const notifyAbilityRemoved = useCallback(
    (id: string) => {
      if (isConnected) {
        broadcastAbilityRemoved(id, currentPhaseIndex);
      }
    },
    [isConnected, broadcastAbilityRemoved, currentPhaseIndex],
  );

  const notifyLineDrawn = useCallback(
    (line: DrawLine) => {
      if (isConnected) {
        broadcastLineDrawn(line, currentPhaseIndex);
      }
    },
    [isConnected, broadcastLineDrawn, currentPhaseIndex],
  );

  const notifyLineRemoved = useCallback(
    (id: string) => {
      if (isConnected) {
        broadcastLineRemoved(id, currentPhaseIndex);
      }
    },
    [isConnected, broadcastLineRemoved, currentPhaseIndex],
  );

  const notifyConnLineAdded = useCallback(
    (line: ConnectingLine) => {
      if (isConnected) {
        broadcastConnLineAdded(line, currentPhaseIndex);
      }
    },
    [isConnected, broadcastConnLineAdded, currentPhaseIndex],
  );

  const notifyConnLineUpdated = useCallback(
    (line: ConnectingLine) => {
      if (isConnected) {
        broadcastConnLineUpdated(line, currentPhaseIndex);
      }
    },
    [isConnected, broadcastConnLineUpdated, currentPhaseIndex],
  );

  const notifyConnLineRemoved = useCallback(
    (id: string) => {
      if (isConnected) {
        broadcastConnLineRemoved(id, currentPhaseIndex);
      }
    },
    [isConnected, broadcastConnLineRemoved, currentPhaseIndex],
  );

  const notifyTextAdded = useCallback(
    (text: TextCanvas) => {
      if (isConnected) {
        broadcastTextAdded(text, currentPhaseIndex);
      }
    },
    [isConnected, broadcastTextAdded, currentPhaseIndex],
  );

  const notifyTextUpdated = useCallback(
    (text: TextCanvas) => {
      if (isConnected) {
        broadcastTextUpdated(text, currentPhaseIndex);
      }
    },
    [isConnected, broadcastTextUpdated, currentPhaseIndex],
  );

  const notifyTextRemoved = useCallback(
    (id: string) => {
      if (isConnected) {
        broadcastTextRemoved(id, currentPhaseIndex);
      }
    },
    [isConnected, broadcastTextRemoved, currentPhaseIndex],
  );

  const notifyImageAdded = useCallback(
    (image: ImageCanvas) => {
      if (isConnected) {
        broadcastImageAdded(image, currentPhaseIndex);
      }
    },
    [isConnected, broadcastImageAdded, currentPhaseIndex],
  );

  const notifyFullSync = useCallback(() => {
    if (isConnected) {
      broadcastStateSync();
    }
  }, [isConnected, broadcastStateSync]);

  const notifyImageMoved = useCallback(
    (image: ImagePositionData) => {
      if (isConnected) {
        broadcastImageMoved(image, currentPhaseIndex);
      }
    },
    [isConnected, broadcastImageMoved, currentPhaseIndex],
  );

  const notifyImageRemoved = useCallback(
    (id: string) => {
      if (isConnected) {
        broadcastImageRemoved(id, currentPhaseIndex);
      }
    },
    [isConnected, broadcastImageRemoved, currentPhaseIndex],
  );

  const notifyToolIconAdded = useCallback(
    (toolIcon: ToolIconCanvas) => {
      if (isConnected) {
        broadcastToolIconAdded(toolIcon, currentPhaseIndex);
      }
    },
    [isConnected, broadcastToolIconAdded, currentPhaseIndex],
  );

  const notifyToolIconMoved = useCallback(
    (toolIcon: ToolIconCanvas) => {
      if (isConnected) {
        broadcastToolIconMoved(toolIcon, currentPhaseIndex);
      }
    },
    [isConnected, broadcastToolIconMoved, currentPhaseIndex],
  );

  const notifyToolIconRemoved = useCallback(
    (id: string) => {
      if (isConnected) {
        broadcastToolIconRemoved(id, currentPhaseIndex);
      }
    },
    [isConnected, broadcastToolIconRemoved, currentPhaseIndex],
  );

  const notifyMapChanged = useCallback(
    (selectedMap: MapOption) => {
      if (isConnected) {
        broadcastMapChanged(selectedMap);
      }
    },
    [isConnected, broadcastMapChanged],
  );

  const notifySideChanged = useCallback(
    (mapSide: MapSide) => {
      if (isConnected) {
        broadcastSideChanged(mapSide);
      }
    },
    [isConnected, broadcastSideChanged],
  );

  const notifyPhaseChanged = useCallback(
    (phaseIndex: number) => {
      if (isConnected) {
        broadcastPhaseChanged(phaseIndex);
      }
    },
    [isConnected, broadcastPhaseChanged],
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
    notifyFullSync,
  };
};
