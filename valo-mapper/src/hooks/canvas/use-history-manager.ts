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

const MAX_HISTORY_SIZE = 50;

const appendHistoryEntry = (
  history: UndoableState[],
  state: UndoableState,
  historyIndex: number,
): UndoableState[] => {
  const nextHistory = history.slice(0, historyIndex + 1);
  nextHistory.push(state);

  if (nextHistory.length > MAX_HISTORY_SIZE) {
    nextHistory.shift();
  }

  return nextHistory;
};

export const useHistoryManager = ({
  getCurrentState,
  applyState,
  isTrackingEnabled = true,
  onApplyHistoryState,
  onHistoryReplaySettled,
}: HistoryManagerConfig) => {
  const [history, setHistory] = useState<UndoableState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  const getCurrentStateRef = useRef(getCurrentState);
  const applyStateRef = useRef(applyState);
  const onApplyHistoryStateRef = useRef(onApplyHistoryState);
  const onHistoryReplaySettledRef = useRef(onHistoryReplaySettled);
  getCurrentStateRef.current = getCurrentState;
  applyStateRef.current = applyState;
  onApplyHistoryStateRef.current = onApplyHistoryState;
  onHistoryReplaySettledRef.current = onHistoryReplaySettled;

  const isUpdatingFromHistory = useRef(false);
  const lastSavedState = useRef<UndoableState | null>(null);
  const lastSavedStateJSON = useRef<string | null>(null);
  const pendingSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockedAutoSaveStateJSON = useRef<string | null>(null);

  const saveToHistory = useCallback(() => {
    if (!isTrackingEnabled || isUpdatingFromHistory.current) {
      return;
    }

    blockedAutoSaveStateJSON.current = null;

    const currentState = getCurrentStateRef.current();

    lastSavedState.current = currentState;
    lastSavedStateJSON.current = null;

    setHistory((prevHistory) =>
      appendHistoryEntry(prevHistory, currentState, historyIndexRef.current),
    );

    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  }, [isTrackingEnabled]);

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

    if (lastSavedState.current) {
      const lastSavedJSON =
        lastSavedStateJSON.current ?? JSON.stringify(lastSavedState.current);
      lastSavedStateJSON.current = lastSavedJSON;

      if (lastSavedJSON === currentStateJSON) {
        return;
      }
    }

    pendingSaveTimeout.current = setTimeout(() => {
      lastSavedState.current = currentState;
      lastSavedStateJSON.current = currentStateJSON;

      setHistory((prevHistory) =>
        appendHistoryEntry(prevHistory, currentState, historyIndexRef.current),
      );

      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
    }, 0);

    return () => {
      if (pendingSaveTimeout.current) {
        clearTimeout(pendingSaveTimeout.current);
        pendingSaveTimeout.current = null;
      }
    };
  }, [getCurrentState, isTrackingEnabled]);

  const resetHistory = useCallback(
    (baselineState?: UndoableState | null) => {
      const currentState = getCurrentStateRef.current();

      if (pendingSaveTimeout.current) {
        clearTimeout(pendingSaveTimeout.current);
        pendingSaveTimeout.current = null;
      }

      isUpdatingFromHistory.current = false;
      blockedAutoSaveStateJSON.current = JSON.stringify(currentState);
      lastSavedState.current = baselineState ?? null;
      lastSavedStateJSON.current = baselineState
        ? JSON.stringify(baselineState)
        : null;
      setHistory(baselineState ? [baselineState] : []);
      setHistoryIndex(baselineState ? 0 : -1);
    },
    [],
  );

  const applyHistoryState = useCallback((state: UndoableState) => {
    const previousState = getCurrentStateRef.current();

    if (pendingSaveTimeout.current) {
      clearTimeout(pendingSaveTimeout.current);
      pendingSaveTimeout.current = null;
    }

    const stateJSON = JSON.stringify(state);

    isUpdatingFromHistory.current = true;
    blockedAutoSaveStateJSON.current = stateJSON;
    lastSavedState.current = state;
    lastSavedStateJSON.current = stateJSON;
    applyStateRef.current(state, (settledState) => {
      const settledStateJSON = JSON.stringify(settledState);

      blockedAutoSaveStateJSON.current = settledStateJSON;
      lastSavedStateJSON.current = settledStateJSON;
      isUpdatingFromHistory.current = false;
      onHistoryReplaySettledRef.current?.(
        settledState,
        previousState,
        state,
      );
    });
    onApplyHistoryStateRef.current?.(state, previousState);
  }, []);

  const undo = useCallback(() => {
    const index = historyIndexRef.current;

    if (index > 0) {
      const previousState = historyRef.current[index - 1];
      setHistoryIndex((prev) => prev - 1);
      applyHistoryState(previousState);
    }
  }, [applyHistoryState]);

  const redo = useCallback(() => {
    const index = historyIndexRef.current;
    const entries = historyRef.current;

    if (index < entries.length - 1) {
      const nextState = entries[index + 1];
      setHistoryIndex((prev) => prev + 1);
      applyHistoryState(nextState);
    }
  }, [applyHistoryState]);

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
