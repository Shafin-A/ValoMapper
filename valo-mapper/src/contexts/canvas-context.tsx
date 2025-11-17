"use client";

import { useCanvasState } from "@/hooks/use-canvas-state";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  DrawLine,
  MapOption,
  TextCanvas,
  ImageCanvas,
  Tool,
  UndoableState,
  MapSide,
  PhaseState,
  ToolIconCanvas,
} from "@/lib/types";
import Konva from "konva";
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
  mapSide: MapSide;
  setMapSide: React.Dispatch<React.SetStateAction<MapSide>>;
  tool: Tool;
  setTool: React.Dispatch<React.SetStateAction<Tool>>;
  currentStroke: DrawLine | null;
  setCurrentStroke: React.Dispatch<React.SetStateAction<DrawLine | null>>;
  drawLines: DrawLine[];
  setDrawLines: React.Dispatch<React.SetStateAction<DrawLine[]>>;
  isDrawMode: boolean;
  setIsDrawMode: React.Dispatch<React.SetStateAction<boolean>>;
  isDrawing: RefObject<boolean>;
  isDeleteSettingsOpen: boolean;
  setIsDeleteSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveToHistory: () => void;
  history: UndoableState[];
  resetState: (resetAllPhases?: boolean) => void;
  textsOnCanvas: TextCanvas[];
  setTextsOnCanvas: React.Dispatch<React.SetStateAction<TextCanvas[]>>;
  imagesOnCanvas: ImageCanvas[];
  setImagesOnCanvas: React.Dispatch<React.SetStateAction<ImageCanvas[]>>;
  editingTextId: string | null;
  setEditingTextId: React.Dispatch<React.SetStateAction<string | null>>;
  toolIconsOnCanvas: ToolIconCanvas[];
  setToolIconsOnCanvas: React.Dispatch<React.SetStateAction<ToolIconCanvas[]>>;
  phases: PhaseState[];
  currentPhaseIndex: number;
  switchToPhase: (index: number) => void;
  duplicatePhase: (index: number) => void;
  editedPhases: Set<number>;
  transitionToPhase: (
    transitionFrom: PhaseState,
    transitionTo: PhaseState,
    duration: number
  ) => Promise<void>;
  registerNode: (id: string, node: Konva.Node) => void;
  unregisterNode: (id: string) => void;
  isTransitioning: RefObject<boolean>;
  saveCanvasState: () => void;
  hasUnsavedChanges: boolean;
  isUpdatingLobby: boolean;
  isErrorUpdatingLobby: boolean;
  isLoadingLobby: boolean;
  isErrorLobby: boolean;
  lobbyError: Error | null;
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
