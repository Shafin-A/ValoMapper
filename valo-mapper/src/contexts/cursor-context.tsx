"use client";

import { CursorMoveData } from "@/lib/websocket-types";
import { createContext, FC, ReactNode, useContext } from "react";

const EMPTY_CURSORS = new Map<string, CursorMoveData>();

const RemoteCursorsContext =
  createContext<Map<string, CursorMoveData>>(EMPTY_CURSORS);

interface RemoteCursorsProviderProps {
  children: ReactNode;
  cursors: Map<string, CursorMoveData>;
}

export const RemoteCursorsProvider: FC<RemoteCursorsProviderProps> = ({
  children,
  cursors,
}) => (
  <RemoteCursorsContext.Provider value={cursors}>
    {children}
  </RemoteCursorsContext.Provider>
);

export const useRemoteCursors = () => useContext(RemoteCursorsContext);
