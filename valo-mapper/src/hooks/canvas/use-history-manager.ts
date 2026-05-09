import { TEMP_DRAG_ID } from "@/lib/consts";
import { UndoableState } from "@/lib/types";
import { useState, useRef, useCallback, useEffect } from "react";

interface HistoryManagerConfig {
  getCurrentState: () => UndoableState;
  applyState: (
    state: UndoableState,
    onSettled?: (settledState: UndoableState) => void,
  ) => void;
  isTrackingEnabled?: boolean;
  onApplyHistoryState?: (
    state: UndoableState,
    previousState: UndoableState,
  ) => void;
  onHistoryReplaySettled?: (
    settledState: UndoableState,
    previousState: UndoableState,
    targetState: UndoableState,
  ) => void;
}

export const useHistoryManager = ({
  getCurrentState,
  applyState,
  isTrackingEnabled = true,
  onApplyHistoryState,
  onHistoryReplaySettled,
}: HistoryManagerConfig) => {
  const [history, setHistory] = useState<UndoableState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUpdatingFromHistory = useRef(false);
  const lastSavedState = useRef<UndoableState | null>(null);
  const pendingSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockedAutoSaveStateJSON = useRef<string | null>(null);

  const saveToHistory = useCallback(() => {
    if (!isTrackingEnabled || isUpdatingFromHistory.current) {
      return;
    }

    blockedAutoSaveStateJSON.current = null;

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
  }, [getCurrentState, historyIndex, isTrackingEnabled]);

  useEffect(() => {
    if (!isTrackingEnabled || isUpdatingFromHistory.current) {
      return;
    }

    const currentState = getCurrentState();
    const currentStateJSON = JSON.stringify(currentState);

    if (blockedAutoSaveStateJSON.current === currentStateJSON) {
      return;
    }

    if (blockedAutoSaveStateJSON.current !== null) {
      blockedAutoSaveStateJSON.current = null;
    }

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
      JSON.stringify(lastSavedState.current) === currentStateJSON
    ) {
      return;
    }

    pendingSaveTimeout.current = setTimeout(() => {
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

    return () => {
      if (pendingSaveTimeout.current) {
        clearTimeout(pendingSaveTimeout.current);
        pendingSaveTimeout.current = null;
      }
    };
  }, [getCurrentState, historyIndex, history.length, isTrackingEnabled]);

  const resetHistory = useCallback(
    (baselineState?: UndoableState | null) => {
      const currentState = getCurrentState();

      if (pendingSaveTimeout.current) {
        clearTimeout(pendingSaveTimeout.current);
        pendingSaveTimeout.current = null;
      }

      isUpdatingFromHistory.current = false;
      blockedAutoSaveStateJSON.current = JSON.stringify(currentState);
      lastSavedState.current = baselineState ?? null;
      setHistory(baselineState ? [baselineState] : []);
      setHistoryIndex(baselineState ? 0 : -1);
    },
    [getCurrentState],
  );

  const applyHistoryState = useCallback(
    (state: UndoableState) => {
      const previousState = getCurrentState();

      if (pendingSaveTimeout.current) {
        clearTimeout(pendingSaveTimeout.current);
        pendingSaveTimeout.current = null;
      }

      isUpdatingFromHistory.current = true;
      blockedAutoSaveStateJSON.current = JSON.stringify(state);
      lastSavedState.current = state;
      applyState(state, (settledState) => {
        blockedAutoSaveStateJSON.current = JSON.stringify(settledState);
        isUpdatingFromHistory.current = false;
        onHistoryReplaySettled?.(settledState, previousState, state);
      });
      onApplyHistoryState?.(state, previousState);
    },
    [applyState, getCurrentState, onApplyHistoryState, onHistoryReplaySettled],
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
    resetHistory,
  };
};
