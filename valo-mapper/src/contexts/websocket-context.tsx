"use client";

import { useLobbyWebSocket } from "@/hooks/use-lobby-websocket";
import { useUser } from "@/hooks/api/use-user";
import {
  AbilityMessageData,
  AgentMessageData,
  ConnectingLineMessageData,
  CursorMoveData,
  DrawLineMessageData,
  FullSyncData,
  ImageMessageData,
  ImageMoveMessageData,
  MapChangedData,
  PhaseChangedData,
  RemoveElementData,
  SideChangedData,
  TextMessageData,
  ToolIconMessageData,
  UserPresence,
  WS_MESSAGE_TYPES,
  WSConnectionStatus,
  WSMessage,
} from "@/lib/websocket-types";
import { useParams } from "next/navigation";
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useCanvas } from "./canvas-context";

interface WebSocketContextType {
  status: WSConnectionStatus;
  users: UserPresence[];
  cursors: Map<string, CursorMoveData>;
  sendCursorPosition: (x: number, y: number) => void;

  broadcastAgentAdded: (
    agent: AgentMessageData["agent"],
    phaseIndex: number,
  ) => void;
  broadcastAgentMoved: (
    agent: AgentMessageData["agent"],
    phaseIndex: number,
  ) => void;
  broadcastAgentRemoved: (id: string, phaseIndex: number) => void;
  broadcastAbilityAdded: (
    ability: AbilityMessageData["ability"],
    phaseIndex: number,
  ) => void;
  broadcastAbilityMoved: (
    ability: AbilityMessageData["ability"],
    phaseIndex: number,
  ) => void;
  broadcastAbilityRemoved: (id: string, phaseIndex: number) => void;
  broadcastLineDrawn: (
    line: DrawLineMessageData["line"],
    phaseIndex: number,
  ) => void;
  broadcastLineRemoved: (id: string, phaseIndex: number) => void;
  broadcastConnLineAdded: (
    line: ConnectingLineMessageData["line"],
    phaseIndex: number,
  ) => void;
  broadcastConnLineUpdated: (
    line: ConnectingLineMessageData["line"],
    phaseIndex: number,
  ) => void;
  broadcastConnLineRemoved: (id: string, phaseIndex: number) => void;
  broadcastTextAdded: (
    text: TextMessageData["text"],
    phaseIndex: number,
  ) => void;
  broadcastTextUpdated: (
    text: TextMessageData["text"],
    phaseIndex: number,
  ) => void;
  broadcastTextRemoved: (id: string, phaseIndex: number) => void;
  broadcastImageAdded: (
    image: ImageMessageData["image"],
    phaseIndex: number,
  ) => void;
  broadcastImageMoved: (
    image: ImageMoveMessageData["image"],
    phaseIndex: number,
  ) => void;
  broadcastImageRemoved: (id: string, phaseIndex: number) => void;
  broadcastToolIconAdded: (
    toolIcon: ToolIconMessageData["toolIcon"],
    phaseIndex: number,
  ) => void;
  broadcastToolIconMoved: (
    toolIcon: ToolIconMessageData["toolIcon"],
    phaseIndex: number,
  ) => void;
  broadcastToolIconRemoved: (id: string, phaseIndex: number) => void;
  broadcastMapChanged: (selectedMap: MapChangedData["selectedMap"]) => void;
  broadcastSideChanged: (mapSide: SideChangedData["mapSide"]) => void;
  broadcastPhaseChanged: (phaseIndex: number) => void;
  broadcastStateSync: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export const WebSocketProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const params = useParams();
  const lobbyCode =
    typeof params?.lobbyCode === "string" ? params.lobbyCode : "";

  const { data: user } = useUser();

  const {
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setDrawLines,
    setConnectingLines,
    setTextsOnCanvas,
    setImagesOnCanvas,
    setToolIconsOnCanvas,
    setSelectedMap,
    setMapSide,
    currentPhaseIndex,
    switchToPhase,
    onUndoRedoCallback,
    rotateCanvasItemsForSideSwap,
    getCurrentStateForSync,
    applyRemoteState,
    resetState,
  } = useCanvas();

  const broadcastStateSyncRef = useRef<(() => void) | null>(null);

  const handleMessage = useCallback(
    (message: WSMessage) => {
      const { type, data, phaseIndex } = message;

      const isCurrentPhase =
        phaseIndex === undefined || phaseIndex === currentPhaseIndex;

      switch (type) {
        case WS_MESSAGE_TYPES.AGENT_ADDED:
        case WS_MESSAGE_TYPES.AGENT_MOVED:
          if (isCurrentPhase) {
            const agentData = data as AgentMessageData;
            setAgentsOnCanvas((prev) => {
              const exists = prev.find((a) => a.id === agentData.agent.id);
              if (exists) {
                return prev.map((a) =>
                  a.id === agentData.agent.id ? agentData.agent : a,
                );
              }
              return [...prev, agentData.agent];
            });
          }
          break;

        case WS_MESSAGE_TYPES.AGENT_REMOVED:
          if (isCurrentPhase) {
            const removeData = data as RemoveElementData;
            setAgentsOnCanvas((prev) =>
              prev.filter((a) => a.id !== removeData.id),
            );
          }
          break;

        case WS_MESSAGE_TYPES.ABILITY_ADDED:
        case WS_MESSAGE_TYPES.ABILITY_MOVED:
          if (isCurrentPhase) {
            const abilityData = data as AbilityMessageData;
            setAbilitiesOnCanvas((prev) => {
              const exists = prev.find((a) => a.id === abilityData.ability.id);
              if (exists) {
                return prev.map((a) =>
                  a.id === abilityData.ability.id ? abilityData.ability : a,
                );
              }
              return [...prev, abilityData.ability];
            });
          }
          break;

        case WS_MESSAGE_TYPES.ABILITY_REMOVED:
          if (isCurrentPhase) {
            const removeData = data as RemoveElementData;
            setAbilitiesOnCanvas((prev) =>
              prev.filter((a) => a.id !== removeData.id),
            );
          }
          break;

        case WS_MESSAGE_TYPES.LINE_DRAWN:
          if (isCurrentPhase) {
            const lineData = data as DrawLineMessageData;
            setDrawLines((prev) => {
              const exists = prev.find((l) => l.id === lineData.line.id);
              if (exists) {
                return prev.map((l) =>
                  l.id === lineData.line.id ? lineData.line : l,
                );
              }
              return [...prev, lineData.line];
            });
          }
          break;

        case WS_MESSAGE_TYPES.LINE_REMOVED:
          if (isCurrentPhase) {
            const removeData = data as RemoveElementData;
            setDrawLines((prev) => prev.filter((l) => l.id !== removeData.id));
          }
          break;

        case WS_MESSAGE_TYPES.CONN_LINE_ADDED:
        case WS_MESSAGE_TYPES.CONN_LINE_UPDATED:
          if (isCurrentPhase) {
            const connLineData = data as ConnectingLineMessageData;
            setConnectingLines((prev) => {
              const exists = prev.find((l) => l.id === connLineData.line.id);
              if (exists) {
                return prev.map((l) =>
                  l.id === connLineData.line.id ? connLineData.line : l,
                );
              }
              return [...prev, connLineData.line];
            });
          }
          break;

        case WS_MESSAGE_TYPES.CONN_LINE_REMOVED:
          if (isCurrentPhase) {
            const removeData = data as RemoveElementData;
            setConnectingLines((prev) =>
              prev.filter((l) => l.id !== removeData.id),
            );
          }
          break;

        case WS_MESSAGE_TYPES.TEXT_ADDED:
        case WS_MESSAGE_TYPES.TEXT_UPDATED:
          if (isCurrentPhase) {
            const textData = data as TextMessageData;
            setTextsOnCanvas((prev) => {
              const exists = prev.find((t) => t.id === textData.text.id);
              if (exists) {
                return prev.map((t) =>
                  t.id === textData.text.id ? textData.text : t,
                );
              }
              return [...prev, textData.text];
            });
          }
          break;

        case WS_MESSAGE_TYPES.TEXT_REMOVED:
          if (isCurrentPhase) {
            const removeData = data as RemoveElementData;
            setTextsOnCanvas((prev) =>
              prev.filter((t) => t.id !== removeData.id),
            );
          }
          break;

        case WS_MESSAGE_TYPES.IMAGE_ADDED:
          if (isCurrentPhase) {
            const imageData = data as ImageMessageData;
            setImagesOnCanvas((prev) => {
              const exists = prev.find((i) => i.id === imageData.image.id);
              if (exists) {
                return prev.map((i) =>
                  i.id === imageData.image.id ? imageData.image : i,
                );
              }
              return [...prev, imageData.image];
            });
          }
          break;

        case WS_MESSAGE_TYPES.IMAGE_MOVED:
          if (isCurrentPhase) {
            const imageMoveData = data as ImageMoveMessageData;
            setImagesOnCanvas((prev) =>
              prev.map((i) =>
                i.id === imageMoveData.image.id
                  ? {
                      ...i,
                      x: imageMoveData.image.x,
                      y: imageMoveData.image.y,
                      width: imageMoveData.image.width,
                      height: imageMoveData.image.height,
                    }
                  : i,
              ),
            );
          }
          break;

        case WS_MESSAGE_TYPES.IMAGE_REMOVED:
          if (isCurrentPhase) {
            const removeData = data as RemoveElementData;
            setImagesOnCanvas((prev) =>
              prev.filter((i) => i.id !== removeData.id),
            );
          }
          break;

        case WS_MESSAGE_TYPES.TOOL_ICON_ADDED:
        case WS_MESSAGE_TYPES.TOOL_ICON_MOVED:
          if (isCurrentPhase) {
            const toolIconData = data as ToolIconMessageData;
            setToolIconsOnCanvas((prev) => {
              const exists = prev.find(
                (t) => t.id === toolIconData.toolIcon.id,
              );
              if (exists) {
                return prev.map((t) =>
                  t.id === toolIconData.toolIcon.id ? toolIconData.toolIcon : t,
                );
              }
              return [...prev, toolIconData.toolIcon];
            });
          }
          break;

        case WS_MESSAGE_TYPES.TOOL_ICON_REMOVED:
          if (isCurrentPhase) {
            const removeData = data as RemoveElementData;
            setToolIconsOnCanvas((prev) =>
              prev.filter((t) => t.id !== removeData.id),
            );
          }
          break;

        case WS_MESSAGE_TYPES.MAP_CHANGED:
          const mapData = data as MapChangedData;
          setSelectedMap(mapData.selectedMap);
          resetState(true);
          break;

        case WS_MESSAGE_TYPES.SIDE_CHANGED:
          const sideData = data as SideChangedData;
          setMapSide(sideData.mapSide);
          rotateCanvasItemsForSideSwap();
          break;

        case WS_MESSAGE_TYPES.PHASE_CHANGED:
          const phaseChangedData = data as PhaseChangedData;
          if (phaseChangedData.phaseIndex !== currentPhaseIndex) {
            switchToPhase(phaseChangedData.phaseIndex);
          }
          break;

        case WS_MESSAGE_TYPES.FULL_SYNC:
          const syncData = data as FullSyncData;
          applyRemoteState({
            phases: syncData.phases,
            selectedMap: syncData.selectedMap,
            mapSide: syncData.mapSide,
            currentPhaseIndex: syncData.currentPhaseIndex,
            editedPhases: syncData.editedPhases,
          });
          break;

        default:
          console.warn(`[WebSocket] Unknown message type: ${type}`);
      }
    },
    [
      currentPhaseIndex,
      setSelectedMap,
      resetState,
      setMapSide,
      rotateCanvasItemsForSideSwap,
      applyRemoteState,
      setAgentsOnCanvas,
      setAbilitiesOnCanvas,
      setDrawLines,
      setConnectingLines,
      setTextsOnCanvas,
      setImagesOnCanvas,
      setToolIconsOnCanvas,
      switchToPhase,
    ],
  );

  const { status, users, cursors, sendMessage, sendCursorPosition } =
    useLobbyWebSocket({
      lobbyCode,
      username: user?.name,
      onMessage: handleMessage,
      enabled: !!lobbyCode,
    });

  const broadcastAgentAdded = useCallback(
    (agent: AgentMessageData["agent"], phaseIndex: number) => {
      sendMessage<AgentMessageData>(
        WS_MESSAGE_TYPES.AGENT_ADDED,
        { agent },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastAgentMoved = useCallback(
    (agent: AgentMessageData["agent"], phaseIndex: number) => {
      sendMessage<AgentMessageData>(
        WS_MESSAGE_TYPES.AGENT_MOVED,
        { agent },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastAgentRemoved = useCallback(
    (id: string, phaseIndex: number) => {
      sendMessage<RemoveElementData>(
        WS_MESSAGE_TYPES.AGENT_REMOVED,
        { id },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastAbilityAdded = useCallback(
    (ability: AbilityMessageData["ability"], phaseIndex: number) => {
      sendMessage<AbilityMessageData>(
        WS_MESSAGE_TYPES.ABILITY_ADDED,
        { ability },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastAbilityMoved = useCallback(
    (ability: AbilityMessageData["ability"], phaseIndex: number) => {
      sendMessage<AbilityMessageData>(
        WS_MESSAGE_TYPES.ABILITY_MOVED,
        { ability },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastAbilityRemoved = useCallback(
    (id: string, phaseIndex: number) => {
      sendMessage<RemoveElementData>(
        WS_MESSAGE_TYPES.ABILITY_REMOVED,
        { id },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastLineDrawn = useCallback(
    (line: DrawLineMessageData["line"], phaseIndex: number) => {
      sendMessage<DrawLineMessageData>(
        WS_MESSAGE_TYPES.LINE_DRAWN,
        { line },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastLineRemoved = useCallback(
    (id: string, phaseIndex: number) => {
      sendMessage<RemoveElementData>(
        WS_MESSAGE_TYPES.LINE_REMOVED,
        { id },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastConnLineAdded = useCallback(
    (line: ConnectingLineMessageData["line"], phaseIndex: number) => {
      sendMessage<ConnectingLineMessageData>(
        WS_MESSAGE_TYPES.CONN_LINE_ADDED,
        { line },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastConnLineUpdated = useCallback(
    (line: ConnectingLineMessageData["line"], phaseIndex: number) => {
      sendMessage<ConnectingLineMessageData>(
        WS_MESSAGE_TYPES.CONN_LINE_UPDATED,
        { line },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastConnLineRemoved = useCallback(
    (id: string, phaseIndex: number) => {
      sendMessage<RemoveElementData>(
        WS_MESSAGE_TYPES.CONN_LINE_REMOVED,
        { id },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastTextAdded = useCallback(
    (text: TextMessageData["text"], phaseIndex: number) => {
      sendMessage<TextMessageData>(
        WS_MESSAGE_TYPES.TEXT_ADDED,
        { text },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastTextUpdated = useCallback(
    (text: TextMessageData["text"], phaseIndex: number) => {
      sendMessage<TextMessageData>(
        WS_MESSAGE_TYPES.TEXT_UPDATED,
        { text },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastTextRemoved = useCallback(
    (id: string, phaseIndex: number) => {
      sendMessage<RemoveElementData>(
        WS_MESSAGE_TYPES.TEXT_REMOVED,
        { id },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastImageAdded = useCallback(
    (image: ImageMessageData["image"], phaseIndex: number) => {
      sendMessage<ImageMessageData>(
        WS_MESSAGE_TYPES.IMAGE_ADDED,
        { image },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastImageMoved = useCallback(
    (image: ImageMoveMessageData["image"], phaseIndex: number) => {
      sendMessage<ImageMoveMessageData>(
        WS_MESSAGE_TYPES.IMAGE_MOVED,
        { image },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastImageRemoved = useCallback(
    (id: string, phaseIndex: number) => {
      sendMessage<RemoveElementData>(
        WS_MESSAGE_TYPES.IMAGE_REMOVED,
        { id },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastStateSync = useCallback(() => {
    const currentState = getCurrentStateForSync();
    sendMessage<FullSyncData>(WS_MESSAGE_TYPES.FULL_SYNC, currentState);
  }, [sendMessage, getCurrentStateForSync]);

  broadcastStateSyncRef.current = broadcastStateSync;

  useEffect(() => {
    onUndoRedoCallback.current = () => {
      const currentState = getCurrentStateForSync();
      const hasImages = currentState.phases.some(
        (phase) => phase.imagesOnCanvas && phase.imagesOnCanvas.length > 0,
      );

      if (hasImages) {
        broadcastStateSyncRef.current?.();
      } else {
        broadcastStateSyncRef.current?.();
      }
    };
    return () => {
      onUndoRedoCallback.current = null;
    };
  }, [onUndoRedoCallback, getCurrentStateForSync, user?.name, users.length]);

  const broadcastToolIconAdded = useCallback(
    (toolIcon: ToolIconMessageData["toolIcon"], phaseIndex: number) => {
      sendMessage<ToolIconMessageData>(
        WS_MESSAGE_TYPES.TOOL_ICON_ADDED,
        { toolIcon },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastToolIconMoved = useCallback(
    (toolIcon: ToolIconMessageData["toolIcon"], phaseIndex: number) => {
      sendMessage<ToolIconMessageData>(
        WS_MESSAGE_TYPES.TOOL_ICON_MOVED,
        { toolIcon },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastToolIconRemoved = useCallback(
    (id: string, phaseIndex: number) => {
      sendMessage<RemoveElementData>(
        WS_MESSAGE_TYPES.TOOL_ICON_REMOVED,
        { id },
        phaseIndex,
      );
    },
    [sendMessage],
  );

  const broadcastMapChanged = useCallback(
    (selectedMap: MapChangedData["selectedMap"]) => {
      sendMessage<MapChangedData>(WS_MESSAGE_TYPES.MAP_CHANGED, {
        selectedMap,
      });
    },
    [sendMessage],
  );

  const broadcastSideChanged = useCallback(
    (mapSide: SideChangedData["mapSide"]) => {
      sendMessage<SideChangedData>(WS_MESSAGE_TYPES.SIDE_CHANGED, { mapSide });
    },
    [sendMessage],
  );

  const broadcastPhaseChanged = useCallback(
    (phaseIndex: number) => {
      sendMessage<PhaseChangedData>(WS_MESSAGE_TYPES.PHASE_CHANGED, {
        phaseIndex,
      });
    },
    [sendMessage],
  );

  const value = useMemo<WebSocketContextType>(
    () => ({
      status,
      users,
      cursors,
      sendCursorPosition,
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
    }),
    [
      status,
      users,
      cursors,
      sendCursorPosition,
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
    ],
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
