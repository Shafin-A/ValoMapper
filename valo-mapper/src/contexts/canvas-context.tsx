"use client";

import { UndoableState, useCanvasState } from "@/hooks/use-canvas-state";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  MapOption,
} from "@/lib/types";
import { Vector2d } from "konva/lib/types";
import React, { createContext, RefObject, useContext } from "react";

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
  tool: "pencil" | "eraser";
  setTool: React.Dispatch<React.SetStateAction<"pencil" | "eraser">>;
  drawLines: { tool: "pencil" | "eraser"; points: Vector2d[] }[];
  setDrawLines: React.Dispatch<
    React.SetStateAction<{ tool: "pencil" | "eraser"; points: Vector2d[] }[]>
  >;
  isDrawMode: boolean;
  setIsDrawMode: React.Dispatch<React.SetStateAction<boolean>>;
  isDrawing: RefObject<boolean>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveToHistory: () => void;
  history: UndoableState[];
  resetState: () => void;
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
