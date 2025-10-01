import { MAP_OPTIONS, TEMP_DRAG_ID } from "@/lib/consts";
import {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  DrawLine,
  ImageCanvas,
  MapOption,
  TextCanvas,
  Tool,
  UndoableState,
} from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

export const useCanvasState = () => {
  const [isAlly, setIsAlly] = useState(true);
  const [textsOnCanvas, setTextsOnCanvas] = useState<TextCanvas[]>([]);
  const [imagesOnCanvas, setImagesOnCanvas] = useState<ImageCanvas[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const [agentsOnCanvas, setAgentsOnCanvas] = useState<AgentCanvas[]>([]);
  const [abilitiesOnCanvas, setAbilitiesOnCanvas] = useState<AbilityCanvas[]>(
    []
  );
  const [selectedCanvasIcon, setSelectedCanvasIcon] = useState<
    Agent | AbilityIconItem | null
  >(null);

  const [selectedMap, setSelectedMap] = useState<MapOption>(MAP_OPTIONS[1]); // Default Ascent

  const [currentStroke, setCurrentStroke] = useState<DrawLine | null>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [drawLines, setDrawLines] = useState<DrawLine[]>([]);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const isDrawing = useRef(false);

  const [history, setHistory] = useState<UndoableState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUpdatingFromHistory = useRef(false);
  const lastSavedState = useRef<UndoableState | null>(null);

  const getCurrentUndoableState = useCallback(
    (): UndoableState => ({
      agentsOnCanvas,
      abilitiesOnCanvas,
      selectedMap,
      drawLines,
      textsOnCanvas,
      imagesOnCanvas,
    }),
    [
      agentsOnCanvas,
      abilitiesOnCanvas,
      selectedMap,
      drawLines,
      textsOnCanvas,
      imagesOnCanvas,
    ]
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

  const applyHistoryState = useCallback((state: UndoableState) => {
    isUpdatingFromHistory.current = true;

    setAgentsOnCanvas(state.agentsOnCanvas);
    setAbilitiesOnCanvas(state.abilitiesOnCanvas);
    setSelectedMap(state.selectedMap);
    setDrawLines(state.drawLines);
    setTextsOnCanvas(state.textsOnCanvas);
    setImagesOnCanvas(state.imagesOnCanvas);

    setTimeout(() => {
      isUpdatingFromHistory.current = false;
    }, 10);
  }, []);

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

  const resetState = useCallback(() => {
    setAgentsOnCanvas([]);
    setAbilitiesOnCanvas([]);
    setSelectedCanvasIcon(null);
    setDrawLines([]);
    setTextsOnCanvas([]);
    setImagesOnCanvas([]);
    setEditingTextId(null);
  }, []);

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
  };
};
