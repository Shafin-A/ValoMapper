"use client";

import { useCanvasState } from "@/hooks/use-canvas-state";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  DrawLine,
  ImageCanvas,
  MapOption,
  MapSide,
  PhaseState,
  TextCanvas,
  Tool,
  ToolIconCanvas,
  UndoableState,
} from "@/lib/types";
import Konva from "konva";
import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  RefObject,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useSettings } from "./settings-context";

interface CanvasContextType {
  agentsOnCanvas: AgentCanvas[];
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  abilitiesOnCanvas: AbilityCanvas[];
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
  selectedCanvasIcon: Agent | AbilityIconItem | null;
  setSelectedCanvasIcon: Dispatch<
    SetStateAction<Agent | AbilityIconItem | null>
  >;
  isAlly: boolean;
  setIsAlly: Dispatch<SetStateAction<boolean>>;
  selectedMap: MapOption;
  setSelectedMap: Dispatch<SetStateAction<MapOption>>;
  mapSide: MapSide;
  setMapSide: Dispatch<SetStateAction<MapSide>>;
  tool: Tool;
  setTool: Dispatch<SetStateAction<Tool>>;
  currentStroke: DrawLine | null;
  setCurrentStroke: Dispatch<SetStateAction<DrawLine | null>>;
  drawLines: DrawLine[];
  setDrawLines: Dispatch<SetStateAction<DrawLine[]>>;
  isDrawMode: boolean;
  setIsDrawMode: Dispatch<SetStateAction<boolean>>;
  isDrawing: RefObject<boolean>;
  isDeleteSettingsOpen: boolean;
  setIsDeleteSettingsOpen: Dispatch<SetStateAction<boolean>>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveToHistory: () => void;
  history: UndoableState[];
  resetState: (resetAllPhases?: boolean) => void;
  textsOnCanvas: TextCanvas[];
  setTextsOnCanvas: Dispatch<SetStateAction<TextCanvas[]>>;
  imagesOnCanvas: ImageCanvas[];
  setImagesOnCanvas: Dispatch<SetStateAction<ImageCanvas[]>>;
  editingTextId: string | null;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  toolIconsOnCanvas: ToolIconCanvas[];
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>;
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
  hoveredElementId: string | null;
  setHoveredElementId: Dispatch<SetStateAction<string | null>>;
  recenterCanvasCallback: RefObject<(() => void) | null>;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const CanvasProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const canvasState = useCanvasState();
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const recenterCanvasCallback = useRef<(() => void) | null>(null);

  const {
    undo,
    redo,
    setIsDrawMode,
    tool,
    setTool,
    setIsDeleteSettingsOpen,
    setEditingTextId,
    editingTextId,
    isDrawMode,
    phases,
    currentPhaseIndex,
    switchToPhase,
    setImagesOnCanvas,
    setTextsOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setToolIconsOnCanvas,
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

        if (key === "a") {
          if (currentPhaseIndex > 0) {
            switchToPhase(currentPhaseIndex - 1);
            e.preventDefault();
          }
          return;
        }

        if (key === "d") {
          if (currentPhaseIndex < phases.length - 1) {
            switchToPhase(currentPhaseIndex + 1);
            e.preventDefault();
          }
          return;
        }

        if (key === "e") {
          if (hoveredElementId && !isDrawMode && !editingTextId) {
            setImagesOnCanvas((prev) =>
              prev.filter((img) => img.id !== hoveredElementId)
            );
            setTextsOnCanvas((prev) =>
              prev.filter((txt) => txt.id !== hoveredElementId)
            );
            setAgentsOnCanvas((prev) =>
              prev.filter((agent) => agent.id !== hoveredElementId)
            );
            setAbilitiesOnCanvas((prev) =>
              prev.filter((ability) => ability.id !== hoveredElementId)
            );
            setToolIconsOnCanvas((prev) =>
              prev.filter((toolIcon) => toolIcon.id !== hoveredElementId)
            );
            setHoveredElementId(null);
            e.preventDefault();
          }
          return;
        }

        if (key === "r") {
          recenterCanvasCallback.current?.();
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
        console.error("Keyboard shortcut error:", err);
        toast.error("An unexpected error occurred with keyboard shortcuts");
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
    editingTextId,
    drawSettings,
    eraserSettings,
    updateDrawSettings,
    updateEraserSettings,
    phases,
    currentPhaseIndex,
    switchToPhase,
    hoveredElementId,
    setImagesOnCanvas,
    setTextsOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setToolIconsOnCanvas,
    recenterCanvasCallback,
  ]);

  return (
    <CanvasContext.Provider
      value={{
        ...canvasState,
        hoveredElementId,
        setHoveredElementId,
        recenterCanvasCallback,
      }}
    >
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
