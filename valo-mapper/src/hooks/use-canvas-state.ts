import { MAP_OPTIONS, TEMP_DRAG_ID } from "@/lib/consts";
import {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  DrawLine,
  ImageCanvas,
  MapOption,
  PhaseState,
  TextCanvas,
  Tool,
  UndoableState,
} from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePhaseTransitions } from "@/hooks/use-phase-transition";

const createEmptyPhaseState = (): PhaseState => ({
  agentsOnCanvas: [],
  abilitiesOnCanvas: [],
  drawLines: [],
  textsOnCanvas: [],
  imagesOnCanvas: [],
});

export const useCanvasState = () => {
  const [isAlly, setIsAlly] = useState(true);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phases, setPhases] = useState<PhaseState[]>(
    Array.from({ length: 10 }, () => createEmptyPhaseState())
  );
  const [editedPhases, setEditedPhases] = useState<Set<number>>(new Set([0]));

  const currentPhase = phases[currentPhaseIndex];
  const textsOnCanvas = currentPhase.textsOnCanvas;
  const imagesOnCanvas = currentPhase.imagesOnCanvas;
  const agentsOnCanvas = currentPhase.agentsOnCanvas;
  const abilitiesOnCanvas = currentPhase.abilitiesOnCanvas;
  const drawLines = currentPhase.drawLines;

  const [selectedCanvasIcon, setSelectedCanvasIcon] = useState<
    Agent | AbilityIconItem | null
  >(null);

  const [selectedMap, setSelectedMap] = useState<MapOption>(MAP_OPTIONS[1]); // Default Ascent
  const [mapSide, setMapSide] = useState<"attack" | "defense">("defense");

  const [currentStroke, setCurrentStroke] = useState<DrawLine | null>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [isDrawMode, setIsDrawMode] = useState(false);
  const isDrawing = useRef(false);

  const [isDeleteSettingsOpen, setIsDeleteSettingsOpen] = useState(false);

  const [history, setHistory] = useState<UndoableState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUpdatingFromHistory = useRef(false);
  const lastSavedState = useRef<UndoableState | null>(null);

  const updateCurrentPhase = useCallback(
    (updates: Partial<PhaseState>) => {
      setPhases((prevPhases) => {
        const newPhases = [...prevPhases];
        newPhases[currentPhaseIndex] = {
          ...newPhases[currentPhaseIndex],
          ...updates,
        };
        return newPhases;
      });
      setEditedPhases((prev) => new Set(prev).add(currentPhaseIndex));
    },
    [currentPhaseIndex]
  );

  const setTextsOnCanvas = useCallback(
    (value: TextCanvas[] | ((prev: TextCanvas[]) => TextCanvas[])) => {
      const newValue =
        typeof value === "function" ? value(textsOnCanvas) : value;
      updateCurrentPhase({ textsOnCanvas: newValue });
    },
    [textsOnCanvas, updateCurrentPhase]
  );

  const setImagesOnCanvas = useCallback(
    (value: ImageCanvas[] | ((prev: ImageCanvas[]) => ImageCanvas[])) => {
      const newValue =
        typeof value === "function" ? value(imagesOnCanvas) : value;
      updateCurrentPhase({ imagesOnCanvas: newValue });
    },
    [imagesOnCanvas, updateCurrentPhase]
  );

  const setAgentsOnCanvas = useCallback(
    (value: AgentCanvas[] | ((prev: AgentCanvas[]) => AgentCanvas[])) => {
      const newValue =
        typeof value === "function" ? value(agentsOnCanvas) : value;
      updateCurrentPhase({ agentsOnCanvas: newValue });
    },
    [agentsOnCanvas, updateCurrentPhase]
  );

  const setAbilitiesOnCanvas = useCallback(
    (value: AbilityCanvas[] | ((prev: AbilityCanvas[]) => AbilityCanvas[])) => {
      const newValue =
        typeof value === "function" ? value(abilitiesOnCanvas) : value;
      updateCurrentPhase({ abilitiesOnCanvas: newValue });
    },
    [abilitiesOnCanvas, updateCurrentPhase]
  );

  const setDrawLines = useCallback(
    (value: DrawLine[] | ((prev: DrawLine[]) => DrawLine[])) => {
      const newValue = typeof value === "function" ? value(drawLines) : value;
      updateCurrentPhase({ drawLines: newValue });
    },
    [drawLines, updateCurrentPhase]
  );

  const getCurrentUndoableState = useCallback(
    (): UndoableState => ({
      agentsOnCanvas,
      abilitiesOnCanvas,
      selectedMap,
      mapSide,
      drawLines,
      textsOnCanvas,
      imagesOnCanvas,
      currentPhaseIndex,
    }),
    [
      agentsOnCanvas,
      abilitiesOnCanvas,
      selectedMap,
      mapSide,
      drawLines,
      textsOnCanvas,
      imagesOnCanvas,
      currentPhaseIndex,
    ]
  );

  const saveToHistory = useCallback(() => {
    if (isUpdatingFromHistory.current) return;

    const currentState = getCurrentUndoableState();
    lastSavedState.current = currentState;

    setHistory((prevHistory) => {
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      newHistory.push(currentState);

      const maxHistorySize = 50;
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }

      return newHistory;
    });

    setHistoryIndex((prev) => prev + 1);
  }, [getCurrentUndoableState, historyIndex]);

  const switchToPhase = useCallback(
    (index: number) => {
      if (index < 0 || index > 9) return;

      if (!editedPhases.has(index)) {
        const editedPhasesBeforeCurrent = Array.from(editedPhases).filter(
          (p) => p < index
        );
        const highestEditedPhase =
          editedPhasesBeforeCurrent.length > 0
            ? Math.max(...editedPhasesBeforeCurrent)
            : 0;
        const phaseToClone = phases[highestEditedPhase];
        const clonedPhase = JSON.parse(JSON.stringify(phaseToClone));

        setPhases((prev) => {
          const newPhases = [...prev];
          newPhases[index] = clonedPhase;
          return newPhases;
        });
      }

      setCurrentPhaseIndex(index);
    },
    [editedPhases, phases]
  );

  const deletePhase = useCallback((index: number) => {
    setPhases((prev) => {
      const newPhases = [...prev];
      newPhases[index] = createEmptyPhaseState();
      return newPhases;
    });
    setEditedPhases((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      newSet.add(0);
      return newSet;
    });
  }, []);

  const duplicatePhase = useCallback(
    (index: number) => {
      if (index < 9) {
        const duplicated = JSON.parse(JSON.stringify(phases[index]));
        setPhases((prev) => {
          const newPhases = [...prev];
          newPhases[index + 1] = duplicated;
          return newPhases;
        });
        setEditedPhases((prev) => new Set(prev).add(index + 1));
        setCurrentPhaseIndex(index + 1);
      }
    },
    [phases]
  );

  useEffect(() => {
    if (isUpdatingFromHistory.current) return;

    const currentState = getCurrentUndoableState();

    const hasTempAgents = currentState.agentsOnCanvas.some(
      (agent) => agent.id === TEMP_DRAG_ID
    );
    const hasTempAbilities = currentState.abilitiesOnCanvas.some(
      (ability) => ability.id === TEMP_DRAG_ID
    );

    if (hasTempAgents || hasTempAbilities) {
      return;
    }

    if (
      lastSavedState.current &&
      JSON.stringify(lastSavedState.current) === JSON.stringify(currentState)
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      lastSavedState.current = currentState;

      setHistory((prevHistory) => {
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        newHistory.push(currentState);

        const maxHistorySize = 50;
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
          return newHistory;
        }

        return newHistory;
      });

      setHistoryIndex((prev) => {
        const newIndex = prev + 1;
        if (history.length >= 50) {
          return 49;
        }
        return newIndex;
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [
    agentsOnCanvas,
    abilitiesOnCanvas,
    selectedMap,
    getCurrentUndoableState,
    historyIndex,
    history.length,
  ]);

  const applyHistoryState = useCallback(
    (state: UndoableState) => {
      isUpdatingFromHistory.current = true;

      if (state.currentPhaseIndex !== undefined) {
        setCurrentPhaseIndex(state.currentPhaseIndex);
        setEditedPhases((prev) => new Set(prev).add(state.currentPhaseIndex));
      }

      updateCurrentPhase({
        agentsOnCanvas: state.agentsOnCanvas,
        abilitiesOnCanvas: state.abilitiesOnCanvas,
        drawLines: state.drawLines,
        textsOnCanvas: state.textsOnCanvas,
        imagesOnCanvas: state.imagesOnCanvas,
      });

      setSelectedMap(state.selectedMap);
      setMapSide(state.mapSide);

      setTimeout(() => {
        isUpdatingFromHistory.current = false;
      }, 10);
    },
    [updateCurrentPhase]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setHistoryIndex((prev) => prev - 1);
      applyHistoryState(previousState);
    }
  }, [history, historyIndex, applyHistoryState]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex((prev) => prev + 1);
      applyHistoryState(nextState);
    }
  }, [history, historyIndex, applyHistoryState]);

  const resetState = useCallback(
    (resetAllPhases: boolean = false) => {
      if (resetAllPhases) {
        setPhases(Array.from({ length: 10 }, () => createEmptyPhaseState()));
        setEditedPhases(new Set([0]));
        setCurrentPhaseIndex(0);
      } else {
        deletePhase(currentPhaseIndex);
      }
      setSelectedCanvasIcon(null);
      setEditingTextId(null);
    },
    [deletePhase, currentPhaseIndex]
  );

  const { transitionToPhase, registerNode, unregisterNode, isTransitioning } =
    usePhaseTransitions();

  return {
    agentsOnCanvas,
    abilitiesOnCanvas,
    selectedCanvasIcon,
    selectedMap,
    isAlly,
    setIsAlly,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setSelectedCanvasIcon,
    setSelectedMap,
    tool,
    setTool,
    drawLines,
    setDrawLines,
    currentStroke,
    setCurrentStroke,
    isDrawMode,
    setIsDrawMode,
    isDrawing,
    isDeleteSettingsOpen,
    setIsDeleteSettingsOpen,
    history,
    undo,
    redo,
    resetState,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    saveToHistory,
    textsOnCanvas,
    setTextsOnCanvas,
    imagesOnCanvas,
    setImagesOnCanvas,
    editingTextId,
    setEditingTextId,
    mapSide,
    setMapSide,
    phases,
    currentPhaseIndex,
    switchToPhase,
    duplicatePhase,
    editedPhases,
    transitionToPhase,
    registerNode,
    unregisterNode,
    isTransitioning,
  };
};
