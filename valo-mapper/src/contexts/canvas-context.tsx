"use client";

import { UndoableState, useCanvasState } from "@/hooks/use-canvas-state";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  MapOption,
} from "@/lib/types";
import React, { createContext, useContext } from "react";

interface CanvasContextType {
  agentsOnCanvas: AgentCanvas[];
  setAgentsOnCanvas: React.Dispatch<React.SetStateAction<AgentCanvas[]>>;
  abilitiesOnCanvas: AbilityCanvas[];
  setAbilitiesOnCanvas: React.Dispatch<React.SetStateAction<AbilityCanvas[]>>;
  selectedCanvasIcon: Agent | AbilityIconItem | null;
  setSelectedCanvasIcon: React.Dispatch<
    React.SetStateAction<Agent | AbilityIconItem | null>
  >;
  isAlly: boolean;
  setIsAlly: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMap: MapOption;
  setSelectedMap: React.Dispatch<React.SetStateAction<MapOption>>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveToHistory: () => void;
  history: UndoableState[];
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const CanvasProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const canvasState = useCanvasState();

  return (
    <CanvasContext.Provider value={canvasState}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error("useCanvasContext must be used within a CanvasProvider");
  }
  return context;
};
