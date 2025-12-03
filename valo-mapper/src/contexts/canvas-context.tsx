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
import React, { createContext, RefObject, useContext, useEffect } from "react";
import { useSettings } from "./settings-context";

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

  const {
    undo,
    redo,
    setIsDrawMode,
    tool,
    setTool,
    setIsDeleteSettingsOpen,
    setEditingTextId,
    isDrawMode,
  } = canvasState;

  const {
    drawSettings,
    eraserSettings,
    updateDrawSettings,
    updateEraserSettings,
  } = useSettings();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      try {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }

        const key = e.key.toLowerCase();
        const isModifier = e.ctrlKey || e.metaKey;

        if (isModifier) {
          if (key === "z") {
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            e.preventDefault();
            return;
          }

          if (key === "q") {
            if (e.shiftKey) {
              updateDrawSettings({ isArrowHead: !drawSettings.isArrowHead });
            } else {
              updateDrawSettings({ isDashed: !drawSettings.isDashed });
            }
            e.preventDefault();
            return;
          }
        }

        if (key === "w" && e.shiftKey) {
          updateEraserSettings({
            mode: eraserSettings.mode === "line" ? "pixel" : "line",
          });
          e.preventDefault();
          return;
        }

        if (key === "q") {
          if (tool === "pencil" && isDrawMode) {
            setIsDrawMode(false);
          } else {
            setIsDeleteSettingsOpen(false);
            setEditingTextId(null);
            setIsDrawMode(true);
            setTool("pencil");
          }
          e.preventDefault();
          return;
        }

        if (key === "w") {
          if (tool === "eraser" && isDrawMode) {
            setIsDrawMode(false);
          } else {
            setIsDeleteSettingsOpen(false);
            setEditingTextId(null);
            setIsDrawMode(true);
            setTool("eraser");
          }
          e.preventDefault();
          return;
        }
      } catch (err) {
        console.error(err);
      }
    };

    const listenerOptions: AddEventListenerOptions = { capture: true };
    window.addEventListener("keydown", onKeyDown, listenerOptions);
    return () =>
      window.removeEventListener("keydown", onKeyDown, listenerOptions);
  }, [
    undo,
    redo,
    setIsDrawMode,
    tool,
    setTool,
    setIsDeleteSettingsOpen,
    setEditingTextId,
    isDrawMode,
    drawSettings,
    eraserSettings,
    updateDrawSettings,
    updateEraserSettings,
  ]);

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
