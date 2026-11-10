"use client";

import { useCanvasState } from "@/hooks/canvas";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  CanvasBackground,
  CanvasPatchEntry,
  CanvasSelectionItem,
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
  useEffect,
  useMemo,
  useRef,
  useState,
  type Context,
} from "react";
import { filterExistingSelection } from "@/lib/canvas-selection";
import { DrawingPreviewProvider } from "./drawing-preview-context";
import { HoveredElementProvider } from "./hover-context";

interface CanvasEntitiesContextType {
  agentsOnCanvas: AgentCanvas[];
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  abilitiesOnCanvas: AbilityCanvas[];
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
  drawLines: DrawLine[];
  setDrawLines: Dispatch<SetStateAction<DrawLine[]>>;
  connectingLines: ConnectingLine[];
  setConnectingLines: Dispatch<SetStateAction<ConnectingLine[]>>;
  textsOnCanvas: TextCanvas[];
  setTextsOnCanvas: Dispatch<SetStateAction<TextCanvas[]>>;
  imagesOnCanvas: ImageCanvas[];
  setImagesOnCanvas: Dispatch<SetStateAction<ImageCanvas[]>>;
  toolIconsOnCanvas: ToolIconCanvas[];
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>;
}

interface CanvasEntityActionsContextType {
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
  setDrawLines: Dispatch<SetStateAction<DrawLine[]>>;
  setConnectingLines: Dispatch<SetStateAction<ConnectingLine[]>>;
  setTextsOnCanvas: Dispatch<SetStateAction<TextCanvas[]>>;
  setImagesOnCanvas: Dispatch<SetStateAction<ImageCanvas[]>>;
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>;
}

interface CanvasViewContextType {
  selectedMap: MapOption;
  setSelectedMap: Dispatch<SetStateAction<MapOption>>;
  mapSide: MapSide;
  setMapSide: Dispatch<SetStateAction<MapSide>>;
  isMapTransitioning: boolean;
  setIsMapTransitioning: Dispatch<SetStateAction<boolean>>;
  showCallouts: boolean;
  setShowCallouts: Dispatch<SetStateAction<boolean>>;
  showUltOrbs: boolean;
  setShowUltOrbs: Dispatch<SetStateAction<boolean>>;
  showSpawnBarriers: boolean;
  setShowSpawnBarriers: Dispatch<SetStateAction<boolean>>;
  canvasBackground: CanvasBackground;
  setCanvasBackground: Dispatch<SetStateAction<CanvasBackground>>;
}

interface CanvasUiContextType {
  selectedCanvasIcon: Agent | AbilityIconItem | ToolIconCanvas | null;
  setSelectedCanvasIcon: Dispatch<
    SetStateAction<Agent | AbilityIconItem | ToolIconCanvas | null>
  >;
  selectedCanvasItems: CanvasSelectionItem[];
  setSelectedCanvasItems: Dispatch<SetStateAction<CanvasSelectionItem[]>>;
  isSidebarDragActive: boolean;
  setIsSidebarDragActive: Dispatch<SetStateAction<boolean>>;
  isAlly: boolean;
  setIsAlly: Dispatch<SetStateAction<boolean>>;
  tool: Tool;
  setTool: Dispatch<SetStateAction<Tool>>;
  isDrawMode: boolean;
  setIsDrawMode: Dispatch<SetStateAction<boolean>>;
  isDrawing: RefObject<boolean>;
  isDeleteSettingsOpen: boolean;
  setIsDeleteSettingsOpen: Dispatch<SetStateAction<boolean>>;
  editingTextId: string | null;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
}

interface CanvasScaleContextType {
  currentStageScale: number;
  setCurrentStageScale: Dispatch<SetStateAction<number>>;
}

interface CanvasPhaseContextType {
  phases: PhaseState[];
  currentPhaseIndex: number;
  editedPhases: Set<number>;
  switchToPhase: (index: number) => void;
  duplicatePhase: (index: number) => void;
  transitionToPhase: (
    transitionFrom: PhaseState,
    transitionTo: PhaseState,
    duration: number,
  ) => Promise<void>;
  isTransitioning: RefObject<boolean>;
}

interface CanvasHistoryContextType {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveToHistory: () => void;
  history: UndoableState[];
}

interface CanvasActionsContextType {
  resetState: (resetAllPhases?: boolean) => void;
  applyRemoteState: (state: UndoableState) => void;
  rotateCanvasItemsForSideSwap: (
    onRotated?: (newPhases: PhaseState[]) => void,
  ) => void;
  getCurrentStateForSync: () => FullSyncData;
  getLatestPhases: () => PhaseState[];
  enqueueCanvasPatchEntry: (entry: CanvasPatchEntry) => void;
  flushCanvasPatch: () => Promise<void>;
  setCurrentStageScale: Dispatch<SetStateAction<number>>;
  agentsSettings: IconSettings;
  abilitiesSettings: IconSettings;
  updateAgentsSettings: (settings: Partial<IconSettings>) => void;
  updateAbilitiesSettings: (settings: Partial<IconSettings>) => void;
  registerNode: (id: string, node: Konva.Node) => void;
  unregisterNode: (id: string) => void;
  getRegisteredNode: (id: string) => Konva.Node | undefined;
  isLoadingLobby: boolean;
  isErrorLobby: boolean;
  lobbyError: Error | null;
  recenterCanvasCallback: RefObject<(() => void) | null>;
  onUndoRedoCallback: RefObject<
    | ((
        settledState: UndoableState,
        previousState: UndoableState,
        targetState: UndoableState,
      ) => void)
    | null
  >;
  onApplyHistoryStateCallback: RefObject<
    ((state: UndoableState, previousState: UndoableState) => void) | null
  >;
  notifyPhaseChangedCallback: RefObject<((phaseIndex: number) => void) | null>;
}

export interface CanvasContextType
  extends CanvasEntitiesContextType,
    CanvasViewContextType,
    CanvasUiContextType,
    CanvasPhaseContextType,
    CanvasHistoryContextType,
    CanvasActionsContextType {}

const CanvasEntitiesContext = createContext<
  CanvasEntitiesContextType | undefined
>(undefined);
const CanvasEntityActionsContext = createContext<
  CanvasEntityActionsContextType | undefined
>(undefined);
const CanvasViewContext = createContext<CanvasViewContextType | undefined>(
  undefined,
);
const CanvasUiContext = createContext<CanvasUiContextType | undefined>(
  undefined,
);
const CanvasScaleContext = createContext<CanvasScaleContextType | undefined>(
  undefined,
);
const CanvasPhaseContext = createContext<CanvasPhaseContextType | undefined>(
  undefined,
);
const CanvasHistoryContext = createContext<
  CanvasHistoryContextType | undefined
>(undefined);
const CanvasActionsContext = createContext<
  CanvasActionsContextType | undefined
>(undefined);

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
  const onUndoRedoCallback = useRef<
    | ((
        settledState: UndoableState,
        previousState: UndoableState,
        targetState: UndoableState,
      ) => void)
    | null
  >(null);
  const notifyPhaseChangedCallback = useRef<
    ((phaseIndex: number) => void) | null
  >(null);

  const handleApplyHistoryState = useCallback(
    (state: UndoableState, previousState: UndoableState) => {
      onApplyHistoryStateCallback.current?.(state, previousState);
    },
    [],
  );

  const handleHistoryReplaySettled = useCallback(
    (
      settledState: UndoableState,
      previousState: UndoableState,
      targetState: UndoableState,
    ) => {
      onUndoRedoCallback.current?.(
        settledState,
        previousState,
        targetState,
      );
    },
    [],
  );

  const canvasState = useCanvasState({
    initialPhaseCount,
    initialState,
    onApplyHistoryState: handleApplyHistoryState,
    onHistoryReplaySettled: handleHistoryReplaySettled,
  });
  const [isMapTransitioning, setIsMapTransitioning] = useState(false);
  const recenterCanvasCallback = useRef<(() => void) | null>(null);

  const {
    setSelectedCanvasItems,
    agentsOnCanvas,
    abilitiesOnCanvas,
    textsOnCanvas,
    imagesOnCanvas,
    toolIconsOnCanvas,
    currentPhaseIndex,
    selectedMap,
    mapSide,
    isDrawMode,
    editingTextId,
  } = canvasState;

  useEffect(() => {
    setSelectedCanvasItems([]);
  }, [
    currentPhaseIndex,
    selectedMap.id,
    mapSide,
    isDrawMode,
    setSelectedCanvasItems,
  ]);

  useEffect(() => {
    if (editingTextId) {
      setSelectedCanvasItems([]);
    }
  }, [editingTextId, setSelectedCanvasItems]);

  useEffect(() => {
    setSelectedCanvasItems((previous) => {
      if (previous.length === 0) return previous;

      const next = filterExistingSelection(
        {
          agentsOnCanvas,
          abilitiesOnCanvas,
          textsOnCanvas,
          imagesOnCanvas,
          toolIconsOnCanvas,
        },
        previous,
      );

      return next.length === previous.length ? previous : next;
    });
  }, [
    agentsOnCanvas,
    abilitiesOnCanvas,
    textsOnCanvas,
    imagesOnCanvas,
    toolIconsOnCanvas,
    setSelectedCanvasItems,
  ]);

  const entitiesValue = useMemo<CanvasEntitiesContextType>(
    () => ({
      agentsOnCanvas: canvasState.agentsOnCanvas,
      setAgentsOnCanvas: canvasState.setAgentsOnCanvas,
      abilitiesOnCanvas: canvasState.abilitiesOnCanvas,
      setAbilitiesOnCanvas: canvasState.setAbilitiesOnCanvas,
      drawLines: canvasState.drawLines,
      setDrawLines: canvasState.setDrawLines,
      connectingLines: canvasState.connectingLines,
      setConnectingLines: canvasState.setConnectingLines,
      textsOnCanvas: canvasState.textsOnCanvas,
      setTextsOnCanvas: canvasState.setTextsOnCanvas,
      imagesOnCanvas: canvasState.imagesOnCanvas,
      setImagesOnCanvas: canvasState.setImagesOnCanvas,
      toolIconsOnCanvas: canvasState.toolIconsOnCanvas,
      setToolIconsOnCanvas: canvasState.setToolIconsOnCanvas,
    }),
    [
      canvasState.agentsOnCanvas,
      canvasState.setAgentsOnCanvas,
      canvasState.abilitiesOnCanvas,
      canvasState.setAbilitiesOnCanvas,
      canvasState.drawLines,
      canvasState.setDrawLines,
      canvasState.connectingLines,
      canvasState.setConnectingLines,
      canvasState.textsOnCanvas,
      canvasState.setTextsOnCanvas,
      canvasState.imagesOnCanvas,
      canvasState.setImagesOnCanvas,
      canvasState.toolIconsOnCanvas,
      canvasState.setToolIconsOnCanvas,
    ],
  );

  const entityActionsValue = useMemo<CanvasEntityActionsContextType>(
    () => ({
      setAgentsOnCanvas: canvasState.setAgentsOnCanvas,
      setAbilitiesOnCanvas: canvasState.setAbilitiesOnCanvas,
      setDrawLines: canvasState.setDrawLines,
      setConnectingLines: canvasState.setConnectingLines,
      setTextsOnCanvas: canvasState.setTextsOnCanvas,
      setImagesOnCanvas: canvasState.setImagesOnCanvas,
      setToolIconsOnCanvas: canvasState.setToolIconsOnCanvas,
    }),
    [
      canvasState.setAgentsOnCanvas,
      canvasState.setAbilitiesOnCanvas,
      canvasState.setDrawLines,
      canvasState.setConnectingLines,
      canvasState.setTextsOnCanvas,
      canvasState.setImagesOnCanvas,
      canvasState.setToolIconsOnCanvas,
    ],
  );

  const viewValue = useMemo<CanvasViewContextType>(
    () => ({
      selectedMap: canvasState.selectedMap,
      setSelectedMap: canvasState.setSelectedMap,
      mapSide: canvasState.mapSide,
      setMapSide: canvasState.setMapSide,
      isMapTransitioning,
      setIsMapTransitioning,
      showCallouts: canvasState.showCallouts,
      setShowCallouts: canvasState.setShowCallouts,
      showUltOrbs: canvasState.showUltOrbs,
      setShowUltOrbs: canvasState.setShowUltOrbs,
      showSpawnBarriers: canvasState.showSpawnBarriers,
      setShowSpawnBarriers: canvasState.setShowSpawnBarriers,
      canvasBackground: canvasState.canvasBackground,
      setCanvasBackground: canvasState.setCanvasBackground,
    }),
    [
      canvasState.selectedMap,
      canvasState.setSelectedMap,
      canvasState.mapSide,
      canvasState.setMapSide,
      isMapTransitioning,
      canvasState.showCallouts,
      canvasState.setShowCallouts,
      canvasState.showUltOrbs,
      canvasState.setShowUltOrbs,
      canvasState.showSpawnBarriers,
      canvasState.setShowSpawnBarriers,
      canvasState.canvasBackground,
      canvasState.setCanvasBackground,
    ],
  );

  const uiValue = useMemo<CanvasUiContextType>(
    () => ({
      selectedCanvasIcon: canvasState.selectedCanvasIcon,
      setSelectedCanvasIcon: canvasState.setSelectedCanvasIcon,
      selectedCanvasItems: canvasState.selectedCanvasItems,
      setSelectedCanvasItems: canvasState.setSelectedCanvasItems,
      isSidebarDragActive: canvasState.isSidebarDragActive,
      setIsSidebarDragActive: canvasState.setIsSidebarDragActive,
      isAlly: canvasState.isAlly,
      setIsAlly: canvasState.setIsAlly,
      tool: canvasState.tool,
      setTool: canvasState.setTool,
      isDrawMode: canvasState.isDrawMode,
      setIsDrawMode: canvasState.setIsDrawMode,
      isDrawing: canvasState.isDrawing,
      isDeleteSettingsOpen: canvasState.isDeleteSettingsOpen,
      setIsDeleteSettingsOpen: canvasState.setIsDeleteSettingsOpen,
      editingTextId: canvasState.editingTextId,
      setEditingTextId: canvasState.setEditingTextId,
    }),
    [
      canvasState.selectedCanvasIcon,
      canvasState.setSelectedCanvasIcon,
      canvasState.selectedCanvasItems,
      canvasState.setSelectedCanvasItems,
      canvasState.isSidebarDragActive,
      canvasState.setIsSidebarDragActive,
      canvasState.isAlly,
      canvasState.setIsAlly,
      canvasState.tool,
      canvasState.setTool,
      canvasState.isDrawMode,
      canvasState.setIsDrawMode,
      canvasState.isDrawing,
      canvasState.isDeleteSettingsOpen,
      canvasState.setIsDeleteSettingsOpen,
      canvasState.editingTextId,
      canvasState.setEditingTextId,
    ],
  );

  const scaleValue = useMemo<CanvasScaleContextType>(
    () => ({
      currentStageScale: canvasState.currentStageScale,
      setCurrentStageScale: canvasState.setCurrentStageScale,
    }),
    [canvasState.currentStageScale, canvasState.setCurrentStageScale],
  );

  const phaseValue = useMemo<CanvasPhaseContextType>(
    () => ({
      phases: canvasState.phases,
      currentPhaseIndex: canvasState.currentPhaseIndex,
      editedPhases: canvasState.editedPhases,
      switchToPhase: canvasState.switchToPhase,
      duplicatePhase: canvasState.duplicatePhase,
      transitionToPhase: canvasState.transitionToPhase,
      isTransitioning: canvasState.isTransitioning,
    }),
    [
      canvasState.phases,
      canvasState.currentPhaseIndex,
      canvasState.editedPhases,
      canvasState.switchToPhase,
      canvasState.duplicatePhase,
      canvasState.transitionToPhase,
      canvasState.isTransitioning,
    ],
  );

  const historyValue = useMemo<CanvasHistoryContextType>(
    () => ({
      undo: canvasState.undo,
      redo: canvasState.redo,
      canUndo: canvasState.canUndo,
      canRedo: canvasState.canRedo,
      saveToHistory: canvasState.saveToHistory,
      history: canvasState.history,
    }),
    [
      canvasState.undo,
      canvasState.redo,
      canvasState.canUndo,
      canvasState.canRedo,
      canvasState.saveToHistory,
      canvasState.history,
    ],
  );

  const actionsValue = useMemo<CanvasActionsContextType>(
    () => ({
      resetState: canvasState.resetState,
      applyRemoteState: canvasState.applyRemoteState,
      rotateCanvasItemsForSideSwap: canvasState.rotateCanvasItemsForSideSwap,
      getCurrentStateForSync: canvasState.getCurrentStateForSync,
      getLatestPhases: canvasState.getLatestPhases,
      enqueueCanvasPatchEntry: canvasState.enqueueCanvasPatchEntry,
      flushCanvasPatch: canvasState.flushCanvasPatch,
      setCurrentStageScale: canvasState.setCurrentStageScale,
      agentsSettings: canvasState.agentsSettings,
      abilitiesSettings: canvasState.abilitiesSettings,
      updateAgentsSettings: canvasState.updateAgentsSettings,
      updateAbilitiesSettings: canvasState.updateAbilitiesSettings,
      registerNode: canvasState.registerNode,
      unregisterNode: canvasState.unregisterNode,
      getRegisteredNode: canvasState.getRegisteredNode,
      isLoadingLobby: canvasState.isLoadingLobby,
      isErrorLobby: canvasState.isErrorLobby,
      lobbyError: canvasState.lobbyError,
      recenterCanvasCallback,
      onUndoRedoCallback,
      onApplyHistoryStateCallback,
      notifyPhaseChangedCallback,
    }),
    [
      canvasState.resetState,
      canvasState.applyRemoteState,
      canvasState.rotateCanvasItemsForSideSwap,
      canvasState.getCurrentStateForSync,
      canvasState.getLatestPhases,
      canvasState.enqueueCanvasPatchEntry,
      canvasState.flushCanvasPatch,
      canvasState.setCurrentStageScale,
      canvasState.agentsSettings,
      canvasState.abilitiesSettings,
      canvasState.updateAgentsSettings,
      canvasState.updateAbilitiesSettings,
      canvasState.registerNode,
      canvasState.unregisterNode,
      canvasState.getRegisteredNode,
      canvasState.isLoadingLobby,
      canvasState.isErrorLobby,
      canvasState.lobbyError,
    ],
  );

  return (
    <CanvasActionsContext.Provider value={actionsValue}>
      <CanvasHistoryContext.Provider value={historyValue}>
        <CanvasViewContext.Provider value={viewValue}>
          <CanvasPhaseContext.Provider value={phaseValue}>
            <CanvasUiContext.Provider value={uiValue}>
              <CanvasScaleContext.Provider value={scaleValue}>
                <CanvasEntityActionsContext.Provider value={entityActionsValue}>
                  <CanvasEntitiesContext.Provider value={entitiesValue}>
                    <HoveredElementProvider>
                      <DrawingPreviewProvider>{children}</DrawingPreviewProvider>
                    </HoveredElementProvider>
                  </CanvasEntitiesContext.Provider>
                </CanvasEntityActionsContext.Provider>
              </CanvasScaleContext.Provider>
            </CanvasUiContext.Provider>
          </CanvasPhaseContext.Provider>
        </CanvasViewContext.Provider>
      </CanvasHistoryContext.Provider>
    </CanvasActionsContext.Provider>
  );
};

const useRequiredContext = <T,>(
  context: Context<T | undefined>,
  hookName: string,
): T => {
  const value = useContext(context);
  if (value === undefined) {
    throw new Error(`${hookName} must be used within a CanvasProvider`);
  }
  return value;
};

export const useCanvasEntities = () =>
  useRequiredContext(CanvasEntitiesContext, "useCanvasEntities");

export const useCanvasEntityActions = () =>
  useRequiredContext(CanvasEntityActionsContext, "useCanvasEntityActions");

export const useCanvasView = () =>
  useRequiredContext(CanvasViewContext, "useCanvasView");

export const useCanvasUi = () =>
  useRequiredContext(CanvasUiContext, "useCanvasUi");

export const useCanvasScale = () =>
  useRequiredContext(CanvasScaleContext, "useCanvasScale");

export const useCanvasPhase = () =>
  useRequiredContext(CanvasPhaseContext, "useCanvasPhase");

export const useCanvasHistory = () =>
  useRequiredContext(CanvasHistoryContext, "useCanvasHistory");

export const useCanvasActions = () =>
  useRequiredContext(CanvasActionsContext, "useCanvasActions");

export const useCanvas = (): CanvasContextType => {
  const entities = useCanvasEntities();
  const view = useCanvasView();
  const ui = useCanvasUi();
  const phase = useCanvasPhase();
  const history = useCanvasHistory();
  const actions = useCanvasActions();

  return useMemo(
    () => ({
      ...entities,
      ...view,
      ...ui,
      ...phase,
      ...history,
      ...actions,
    }),
    [entities, view, ui, phase, history, actions],
  );
};
