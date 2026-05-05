"use client";

import { useCanvasState } from "@/hooks/canvas";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  ConnectingLine,
  DrawLine,
  IconSettings,
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
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

interface CanvasContextType {
  agentsOnCanvas: AgentCanvas[];
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  abilitiesOnCanvas: AbilityCanvas[];
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
  selectedCanvasIcon: Agent | AbilityIconItem | ToolIconCanvas | null;
  setSelectedCanvasIcon: Dispatch<
    SetStateAction<Agent | AbilityIconItem | ToolIconCanvas | null>
  >;
  isSidebarDragActive: boolean;
  setIsSidebarDragActive: Dispatch<SetStateAction<boolean>>;
  currentStageScale: number;
  setCurrentStageScale: Dispatch<SetStateAction<number>>;
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
  agentsSettings: IconSettings;
  abilitiesSettings: IconSettings;
  updateAgentsSettings: (settings: Partial<IconSettings>) => void;
  updateAbilitiesSettings: (settings: Partial<IconSettings>) => void;
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
  getRegisteredNode: (id: string) => Konva.Node | undefined;
  isTransitioning: RefObject<boolean>;
  applyRemoteState: (state: UndoableState) => void;
  isLoadingLobby: boolean;
  isErrorLobby: boolean;
  lobbyError: Error | null;
  hoveredElementId: string | null;
  setHoveredElementId: Dispatch<SetStateAction<string | null>>;
  recenterCanvasCallback: RefObject<(() => void) | null>;
  onUndoRedoCallback: RefObject<(() => void) | null>;
  onApplyHistoryStateCallback: RefObject<
    ((state: UndoableState, previousState: UndoableState) => void) | null
  >;
  notifyPhaseChangedCallback: RefObject<((phaseIndex: number) => void) | null>;
  showCallouts: boolean;
  setShowCallouts: Dispatch<SetStateAction<boolean>>;
  showUltOrbs: boolean;
  setShowUltOrbs: Dispatch<SetStateAction<boolean>>;
  showSpawnBarriers: boolean;
  setShowSpawnBarriers: Dispatch<SetStateAction<boolean>>;
  isMapTransitioning: boolean;
  setIsMapTransitioning: Dispatch<SetStateAction<boolean>>;
  rotateCanvasItemsForSideSwap: (
    onRotated?: (newPhases: PhaseState[]) => void,
  ) => void;
  getCurrentStateForSync: () => FullSyncData;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

interface CanvasProviderProps {
  children: ReactNode;
  initialPhaseCount?: number;
  initialState?: Partial<UndoableState>;
}

export const CanvasProvider: FC<CanvasProviderProps> = ({
  children,
  initialPhaseCount,
  initialState,
}) => {
  const onApplyHistoryStateCallback = useRef<
    ((state: UndoableState, previousState: UndoableState) => void) | null
  >(null);
  const canvasState = useCanvasState({
    initialPhaseCount,
    initialState,
    onApplyHistoryState: (state, previousState) =>
      onApplyHistoryStateCallback.current?.(state, previousState),
  });
  const [hoveredElementId, setHoveredElementIdState] = useState<string | null>(
    null,
  );
  const [isMapTransitioning, setIsMapTransitioning] = useState(false);
  const recenterCanvasCallback = useRef<(() => void) | null>(null);
  const onUndoRedoCallback = useRef<(() => void) | null>(null);
  const notifyPhaseChangedCallback = useRef<
    ((phaseIndex: number) => void) | null
  >(null);

  const setHoveredElementId = useCallback(
    (value: React.SetStateAction<string | null>) => {
      if (canvasState.editingTextId) return;
      setHoveredElementIdState((prev) =>
        typeof value === "function"
          ? (value as (prevState: string | null) => string | null)(prev)
          : value,
      );
    },
    [canvasState.editingTextId],
  );

  return (
    <CanvasContext.Provider
      value={{
        ...canvasState,
        hoveredElementId,
        setHoveredElementId,
        recenterCanvasCallback,
        onUndoRedoCallback,
        onApplyHistoryStateCallback,
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
