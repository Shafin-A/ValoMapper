"use client";

import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { CanvasProvider } from "@/contexts/canvas-context";
import { WebSocketProvider } from "@/contexts/websocket-context";
import { CollaborativeCanvasProvider } from "@/hooks/use-collaborative-canvas";
import type { ReactNode } from "react";

export const CanvasProviders = ({ children }: { children: ReactNode }) => {
  return (
    <CanvasProvider>
      <WebSocketProvider>
        <CollaborativeCanvasProvider>
          <KeyboardShortcuts />
          {children}
        </CollaborativeCanvasProvider>
      </WebSocketProvider>
    </CanvasProvider>
  );
};
