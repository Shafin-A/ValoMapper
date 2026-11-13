"use client";

import { useUser } from "@/hooks/api/use-user";
import { useUpdateLobby } from "@/hooks/api/use-update-lobby";
import { useLobbyWebSocket } from "@/hooks/use-lobby-websocket";
import { useSettings } from "@/contexts/settings-context";
import { createCanvasBroadcasters } from "@/lib/ws-broadcasts";
import { createWSMessageHandler } from "@/lib/ws-message-handler";
import { electFullSyncSender } from "@/lib/ws-sync-election";
import type {
  FullSyncData,
  UserPresence,
  WSConnectionStatus,
} from "@/lib/websocket-types";
import { WS_MESSAGE_TYPES } from "@/lib/websocket-types";
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
import {
  useCanvasActions,
  useCanvasEntityActions,
  useCanvasPhase,
  useCanvasUi,
  useCanvasView,
} from "./canvas-context";
import { RemoteCursorsProvider } from "./cursor-context";
import { WebSocketPresenceProvider } from "./websocket-presence-context";

interface WebSocketContextType
  extends ReturnType<typeof createCanvasBroadcasters> {
  status: WSConnectionStatus;
  users: UserPresence[];
  sendCursorPosition: (x: number, y: number) => void;
  broadcastStateSync: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

const WebSocketCursorContext = createContext<
  ((x: number, y: number) => void) | undefined
>(undefined);

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
  } = useCanvasEntityActions();
  const { setSelectedMap, setMapSide } = useCanvasView();
  const { currentPhaseIndex, switchToPhase } = useCanvasPhase();
  const { editingTextId } = useCanvasUi();
  const {
    onUndoRedoCallback,
    rotateCanvasItemsForSideSwap,
    getCurrentStateForSync,
    applyRemoteState,
    resetState,
  } = useCanvasActions();

  const { updateAgentsSettings, updateAbilitiesSettings } = useSettings();

  const { mutateAsync: updateLobby } = useUpdateLobby(lobbyCode);

  const broadcastStateSyncRef = useRef<(() => void) | null>(null);

  const handleMessage = useMemo(
    () =>
      createWSMessageHandler({
        currentPhaseIndex,
        editingTextId,
        setAgentsOnCanvas,
        setAbilitiesOnCanvas,
        setDrawLines,
        setConnectingLines,
        setTextsOnCanvas,
        setImagesOnCanvas,
        setToolIconsOnCanvas,
        setSelectedMap,
        setMapSide,
        switchToPhase,
        resetState,
        rotateCanvasItemsForSideSwap,
        applyRemoteState,
        updateAgentsSettings,
        updateAbilitiesSettings,
      }),
    [
      applyRemoteState,
      currentPhaseIndex,
      editingTextId,
      resetState,
      rotateCanvasItemsForSideSwap,
      setAbilitiesOnCanvas,
      setAgentsOnCanvas,
      setConnectingLines,
      setDrawLines,
      setImagesOnCanvas,
      setMapSide,
      setSelectedMap,
      setTextsOnCanvas,
      setToolIconsOnCanvas,
      switchToPhase,
      updateAbilitiesSettings,
      updateAgentsSettings,
    ],
  );

  const { status, users, clientId, cursors, sendMessage, sendCursorPosition } =
    useLobbyWebSocket({
      lobbyCode,
      username: user?.name,
      onMessage: handleMessage,
      enabled: !!lobbyCode,
    });

  const broadcasters = useMemo(
    () => createCanvasBroadcasters(sendMessage),
    [sendMessage],
  );

  const broadcastStateSync = useCallback(() => {
    const currentState = getCurrentStateForSync();
    sendMessage<FullSyncData>(WS_MESSAGE_TYPES.FULL_SYNC, currentState);
  }, [sendMessage, getCurrentStateForSync]);

  broadcastStateSyncRef.current = broadcastStateSync;

  // Elect one existing client to send FULL_SYNC instead of every client.
  const previousUsersRef = useRef<UserPresence[]>([]);

  useEffect(() => {
    const previousUsers = previousUsersRef.current;
    previousUsersRef.current = users;

    if (previousUsers.length === 0) {
      return;
    }

    const previousIds = new Set(previousUsers.map((presence) => presence.id));
    const hasNewUser = users.some((presence) => !previousIds.has(presence.id));

    if (!hasNewUser) {
      return;
    }

    // No server-assigned id yet: keep the old fan-out.
    if (clientId) {
      const electedSender = electFullSyncSender(users, previousIds);
      if (electedSender !== clientId) {
        return;
      }
    }

    broadcastStateSyncRef.current?.();
  }, [clientId, users]);

  useEffect(() => {
    onUndoRedoCallback.current = (settledState) => {
      sendMessage<FullSyncData>(WS_MESSAGE_TYPES.FULL_SYNC, settledState);

      if (lobbyCode) {
        void updateLobby(settledState).catch((error: unknown) => {
          console.error("Failed to persist undo/redo canvas state", error);
        });
      }
    };
    return () => {
      onUndoRedoCallback.current = null;
    };
  }, [onUndoRedoCallback, updateLobby, lobbyCode, sendMessage]);

  const value = useMemo<WebSocketContextType>(
    () => ({
      status,
      users,
      sendCursorPosition,
      ...broadcasters,
      broadcastStateSync,
    }),
    [status, users, sendCursorPosition, broadcasters, broadcastStateSync],
  );

  const presenceValue = useMemo(() => ({ status, users }), [status, users]);

  return (
    <WebSocketContext.Provider value={value}>
      <WebSocketCursorContext.Provider value={sendCursorPosition}>
        <WebSocketPresenceProvider value={presenceValue}>
          <RemoteCursorsProvider cursors={cursors}>
            {children}
          </RemoteCursorsProvider>
        </WebSocketPresenceProvider>
      </WebSocketCursorContext.Provider>
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

export const useSendCursorPosition = () => {
  const context = useContext(WebSocketCursorContext);
  if (context === undefined) {
    throw new Error(
      "useSendCursorPosition must be used within a WebSocketProvider",
    );
  }
  return context;
};
