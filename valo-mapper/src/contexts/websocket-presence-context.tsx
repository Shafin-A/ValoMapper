"use client";

import type { UserPresence, WSConnectionStatus } from "@/lib/websocket-types";
import { createContext, ReactNode, useContext } from "react";

type WebSocketPresence = {
  status: WSConnectionStatus;
  users: UserPresence[];
};

const WebSocketPresenceContext = createContext<WebSocketPresence | undefined>(
  undefined,
);

export const WebSocketPresenceProvider = ({
  value,
  children,
}: {
  value: WebSocketPresence;
  children: ReactNode;
}) => {
  return (
    <WebSocketPresenceContext.Provider value={value}>
      {children}
    </WebSocketPresenceContext.Provider>
  );
};

export const useWebSocketUsers = (): UserPresence[] => {
  return useContext(WebSocketPresenceContext)?.users ?? [];
};

export const useWebSocketStatus = (): WSConnectionStatus => {
  return useContext(WebSocketPresenceContext)?.status ?? "disconnected";
};
