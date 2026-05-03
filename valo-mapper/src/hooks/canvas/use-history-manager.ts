import { TEMP_DRAG_ID } from "@/lib/consts";
import { UndoableState } from "@/lib/types";
import { useState, useRef, useCallback, useEffect } from "react";

interface HistoryManagerConfig {
  getCurrentState: () => UndoableState;
  applyState: (state: UndoableState) => void;
  onApplyHistoryState?: (
    state: UndoableState,
    previousState: UndoableState,
  ) => void;
}

export const useHistoryManager = ({
  getCurrentState,
  applyState,
  onApplyHistoryState,
}: HistoryManagerConfig) => {
  const [history, setHistory] = useState<UndoableState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUpdatingFromHistory = useRef(false);
  const lastSavedState = useRef<UndoableState | null>(null);

  const saveToHistory = useCallback(() => {
    if (isUpdatingFromHistory.current) return;

    const currentState = getCurrentState();
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
  }, [getCurrentState, historyIndex]);

  useEffect(() => {
    if (isUpdatingFromHistory.current) return;

    const currentState = getCurrentState();
    const currentPhase = currentState.phases[currentState.currentPhaseIndex];

    const hasTempAgents = currentPhase.agentsOnCanvas.some(
      (agent) => agent.id === TEMP_DRAG_ID,
    );
    const hasTempAbilities = currentPhase.abilitiesOnCanvas.some(
      (ability) => ability.id === TEMP_DRAG_ID,
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
  }, [getCurrentState, historyIndex, history.length]);

  const applyHistoryState = useCallback(
    (state: UndoableState) => {
      const previousState = getCurrentState();
      isUpdatingFromHistory.current = true;
      lastSavedState.current = state;
      applyState(state);
      onApplyHistoryState?.(state, previousState);
      setTimeout(() => {
        isUpdatingFromHistory.current = false;
      }, 10);
    },
    [applyState, getCurrentState, onApplyHistoryState],
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

  return {
    history,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    saveToHistory,
  };
};
