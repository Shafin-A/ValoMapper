import {
  CursorMoveData,
  UserListData,
  UserPresence,
  WS_MESSAGE_TYPES,
  WSConnectionStatus,
  WSMessage,
} from "@/lib/websocket-types";
import { useCallback, useEffect, useRef, useState } from "react";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

interface UseLobbyWebSocketOptions {
  lobbyCode: string;
  username?: string;
  color?: string;
  onMessage?: (message: WSMessage) => void;
  enabled?: boolean;
}

interface UseLobbyWebSocketReturn {
  status: WSConnectionStatus;
  users: UserPresence[];
  cursors: Map<string, CursorMoveData>;
  sendMessage: <T>(type: string, data: T, phaseIndex?: number) => void;
  sendCursorPosition: (x: number, y: number) => void;
}

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
const CURSOR_THROTTLE_MS = 50;

export const useLobbyWebSocket = ({
  lobbyCode,
  username = "Anonymous",
  color,
  onMessage,
  enabled = true,
}: UseLobbyWebSocketOptions): UseLobbyWebSocketReturn => {
  const [status, setStatus] = useState<WSConnectionStatus>("disconnected");
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorMoveData>>(
    new Map(),
  );

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorSendRef = useRef(0);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!lobbyCode || !enabled) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus("connecting");

    const params = new URLSearchParams();
    params.set("username", username);
    if (color) params.set("color", color);

    const wsUrl = `${WS_BASE_URL}/ws/lobbies/${lobbyCode}?${params.toString()}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) {
        return;
      }

      setStatus("connected");
      reconnectAttemptRef.current = 0;
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) {
        return;
      }

      try {
        const messages = event.data.split("\n").filter(Boolean);

        for (const msgStr of messages) {
          const message: WSMessage = JSON.parse(msgStr);

          if (message.type === WS_MESSAGE_TYPES.USER_LIST) {
            const data = message.data as UserListData;
            setUsers(data.users);

            const currentUserIds = new Set(data.users.map((u) => u.id));
            setCursors((prev) => {
              const next = new Map(prev);
              let hasChanges = false;
              for (const userId of next.keys()) {
                if (!currentUserIds.has(userId)) {
                  next.delete(userId);
                  hasChanges = true;
                }
              }
              return hasChanges ? next : prev;
            });
            continue;
          }

          if (message.type === WS_MESSAGE_TYPES.CURSOR_MOVE) {
            const data = message.data as CursorMoveData;
            setCursors((prev) => {
              const next = new Map(prev);

              next.set(data.userId, {
                ...data,
                timestamp: Date.now(),
              } as CursorMoveData & { timestamp: number });
              return next;
            });
            continue;
          }

          onMessageRef.current?.(message);
        }
      } catch (error) {
        console.error("[WebSocket] Error parsing message:", error);
      }
    };

    ws.onclose = (event) => {
      if (wsRef.current !== ws) {
        return;
      }

      setStatus("disconnected");
      wsRef.current = null;

      if (enabled && event.code !== 1000) {
        const delay =
          RECONNECT_DELAYS[
            Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)
          ];

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptRef.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      if (wsRef.current !== ws) {
        return;
      }

      console.error("[WebSocket] Error:", error);
      setStatus("error");
    };
  }, [lobbyCode, username, color, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
    };
  }, [connect]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const next = new Map(prev);
        let hasChanges = false;

        for (const [userId, cursor] of next) {
          const cursorWithTimestamp = cursor as CursorMoveData & {
            timestamp?: number;
          };
          const cursorAge = cursorWithTimestamp.timestamp
            ? now - cursorWithTimestamp.timestamp
            : Infinity;

          if (cursorAge > 5000) {
            next.delete(userId);
            hasChanges = true;
          }
        }

        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendMessage = useCallback(
    <T>(type: string, data: T, phaseIndex?: number) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const message: WSMessage<T> = {
          type: type as WSMessage["type"],
          data,
          timestamp: Date.now(),
        };
        if (phaseIndex !== undefined) {
          message.phaseIndex = phaseIndex;
        }
        wsRef.current.send(JSON.stringify(message));
      }
    },
    [],
  );

  const sendCursorPosition = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - lastCursorSendRef.current < CURSOR_THROTTLE_MS) {
        return;
      }
      lastCursorSendRef.current = now;

      sendMessage(WS_MESSAGE_TYPES.CURSOR_MOVE, { x, y });
    },
    [sendMessage],
  );

  return {
    status,
    users,
    cursors,
    sendMessage,
    sendCursorPosition,
  };
};
