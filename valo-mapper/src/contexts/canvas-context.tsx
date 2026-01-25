"use client";

import { useCanvasState, useKeyboardShortcuts } from "@/hooks/canvas";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  ConnectingLine,
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
import type { FullSyncData } from "@/lib/websocket-types";
import Konva from "konva";
import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  RefObject,
  SetStateAction,
  useContext,
  useRef,
  useState,
} from "react";

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
  connectingLines: ConnectingLine[];
  setConnectingLines: Dispatch<SetStateAction<ConnectingLine[]>>;
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
    duration: number,
  ) => Promise<void>;
  registerNode: (id: string, node: Konva.Node) => void;
  unregisterNode: (id: string) => void;
  isTransitioning: RefObject<boolean>;
  saveCanvasState: () => void;
  saveCanvasStateAsync: () => Promise<void>;
  applyRemoteState: (state: UndoableState) => void;
  hasUnsavedChanges: boolean;
  isUpdatingLobby: boolean;
  isErrorUpdatingLobby: boolean;
  isLoadingLobby: boolean;
  isErrorLobby: boolean;
  lobbyError: Error | null;
  hoveredElementId: string | null;
  setHoveredElementId: Dispatch<SetStateAction<string | null>>;
  recenterCanvasCallback: RefObject<(() => void) | null>;
  onUndoRedoCallback: RefObject<(() => void) | null>;
  notifyPhaseChangedCallback: RefObject<((phaseIndex: number) => void) | null>;
  showCallouts: boolean;
  setShowCallouts: Dispatch<SetStateAction<boolean>>;
  showUltOrbs: boolean;
  setShowUltOrbs: Dispatch<SetStateAction<boolean>>;
  showSpawnBarriers: boolean;
  setShowSpawnBarriers: Dispatch<SetStateAction<boolean>>;
  isMapTransitioning: boolean;
  setIsMapTransitioning: Dispatch<SetStateAction<boolean>>;
  rotateCanvasItemsForSideSwap: () => void;
  getCurrentStateForSync: () => FullSyncData;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export const CanvasProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const canvasState = useCanvasState();
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [isMapTransitioning, setIsMapTransitioning] = useState(false);
  const recenterCanvasCallback = useRef<(() => void) | null>(null);
  const onUndoRedoCallback = useRef<(() => void) | null>(null);
  const notifyPhaseChangedCallback = useRef<
    ((phaseIndex: number) => void) | null
  >(null);

  useKeyboardShortcuts({
    undo: canvasState.undo,
    redo: canvasState.redo,
    onUndoRedo: () => onUndoRedoCallback.current?.(),
    tool: canvasState.tool,
    setTool: canvasState.setTool,
    isDrawMode: canvasState.isDrawMode,
    setIsDrawMode: canvasState.setIsDrawMode,
    editingTextId: canvasState.editingTextId,
    setEditingTextId: canvasState.setEditingTextId,
    setIsDeleteSettingsOpen: canvasState.setIsDeleteSettingsOpen,
    phases: canvasState.phases,
    currentPhaseIndex: canvasState.currentPhaseIndex,
    switchToPhase: canvasState.switchToPhase,
    notifyPhaseChanged: (phaseIndex: number) =>
      notifyPhaseChangedCallback.current?.(phaseIndex),
    hoveredElementId,
    setHoveredElementId,
    setImagesOnCanvas: canvasState.setImagesOnCanvas,
    setTextsOnCanvas: canvasState.setTextsOnCanvas,
    setAgentsOnCanvas: canvasState.setAgentsOnCanvas,
    setAbilitiesOnCanvas: canvasState.setAbilitiesOnCanvas,
    setToolIconsOnCanvas: canvasState.setToolIconsOnCanvas,
    connectingLines: canvasState.connectingLines,
    setConnectingLines: canvasState.setConnectingLines,
    recenterCanvasCallback,
  });

  return (
    <CanvasContext.Provider
      value={{
        ...canvasState,
        hoveredElementId,
        setHoveredElementId,
        recenterCanvasCallback,
        onUndoRedoCallback,
        notifyPhaseChangedCallback,
        isMapTransitioning,
        setIsMapTransitioning,
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
