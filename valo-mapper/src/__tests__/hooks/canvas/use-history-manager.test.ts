import { renderHook, act } from "@testing-library/react";
import { useHistoryManager } from "@/hooks/canvas/use-history-manager";
import { UndoableState } from "@/lib/types";

describe("useHistoryManager", () => {
  let mockState: UndoableState;
  let getCurrentState: jest.Mock;
  let applyState: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    mockState = {
      phases: Array.from({ length: 10 }, () => ({
        agentsOnCanvas: [],
        abilitiesOnCanvas: [],
        drawLines: [],
        textsOnCanvas: [],
        connectingLines: [],
        imagesOnCanvas: [],
        toolIconsOnCanvas: [],
      })),
      selectedMap: { id: "haven", text: "Haven", textColor: "text-white" },
      mapSide: "attack",
      currentPhaseIndex: 0,
      editedPhases: [0],
      agentsSettings: {
        scale: 1,
        borderOpacity: 1,
        borderWidth: 2,
        radius: 20,
        allyColor: "#00ff00",
        enemyColor: "#ff0000",
      },
      abilitiesSettings: {
        scale: 1,
        borderOpacity: 1,
        borderWidth: 2,
        radius: 20,
        allyColor: "#00ff00",
        enemyColor: "#ff0000",
      },
    };

    getCurrentState = jest.fn(() => mockState);
    applyState = jest.fn(
      (
        state: UndoableState,
        onSettled?: (settledState: UndoableState) => void,
      ) => {
        onSettled?.(state);
      },
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize with empty history", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    expect(result.current.history).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("should save state to history manually", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    act(() => {
      result.current.saveToHistory();
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toEqual(mockState);
  });

  it("should enable undo after saving state", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    act(() => {
      result.current.saveToHistory();
    });

    expect(result.current.canUndo).toBe(false);

    act(() => {
      mockState = {
        ...mockState,
        currentPhaseIndex: 1,
      };
      result.current.saveToHistory();
    });

    expect(result.current.canUndo).toBe(true);
  });

  it("should undo to previous state", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    const state1 = { ...mockState, currentPhaseIndex: 0 };
    const state2 = { ...mockState, currentPhaseIndex: 1 };

    getCurrentState.mockReturnValueOnce(state1);
    act(() => {
      result.current.saveToHistory();
    });

    getCurrentState.mockReturnValueOnce(state2);
    act(() => {
      result.current.saveToHistory();
    });

    getCurrentState.mockReturnValue(state2);

    act(() => {
      result.current.undo();
    });

    expect(applyState).toHaveBeenCalledWith(state1, expect.any(Function));
  });

  it("should redo after undo", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    const state1 = { ...mockState, currentPhaseIndex: 0 };
    const state2 = { ...mockState, currentPhaseIndex: 1 };

    getCurrentState.mockReturnValueOnce(state1);
    act(() => {
      result.current.saveToHistory();
    });

    getCurrentState.mockReturnValueOnce(state2);
    act(() => {
      result.current.saveToHistory();
    });

    getCurrentState.mockReturnValue(state2);

    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    applyState.mockClear();

    act(() => {
      result.current.redo();
    });

    // Should have called applyState (redo applies the next state in history)
    expect(applyState).toHaveBeenCalled();
    const appliedState = applyState.mock.calls[0][0];
    expect(appliedState).toBeDefined();
    expect(appliedState.currentPhaseIndex).toBeGreaterThanOrEqual(0);
  });

  it("should limit history to 50 entries", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    for (let i = 0; i < 52; i++) {
      getCurrentState.mockReturnValueOnce({
        ...mockState,
        currentPhaseIndex: i,
      });
      act(() => {
        result.current.saveToHistory();
      });
    }

    expect(result.current.history.length).toBeLessThanOrEqual(50);
  });

  it("should clear redo history when new state is saved after undo", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    for (let i = 0; i < 3; i++) {
      getCurrentState.mockReturnValueOnce({
        ...mockState,
        currentPhaseIndex: i,
      });
      act(() => {
        result.current.saveToHistory();
      });
    }

    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    getCurrentState.mockReturnValueOnce({
      ...mockState,
      currentPhaseIndex: 99,
    });
    act(() => {
      result.current.saveToHistory();
    });

    expect(result.current.canRedo).toBe(false);
  });

  it("should not undo beyond first state", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    act(() => {
      result.current.saveToHistory();
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canUndo).toBe(false);
  });

  it("should not redo beyond last state", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    act(() => {
      result.current.saveToHistory();
    });

    act(() => {
      result.current.redo();
    });

    expect(result.current.canRedo).toBe(false);
  });

  it("should not save duplicate states automatically", () => {
    const { result, rerender } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    // Trigger automatic save via useEffect
    rerender();
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const historyLengthAfterFirst = result.current.history.length;

    // Rerender with same state
    rerender();
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.history.length).toBe(historyLengthAfterFirst);
  });

  it("should not save state with temp drag items", () => {
    getCurrentState.mockReturnValue(mockState);
    const { result, rerender } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    // Trigger initial auto-save
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const initialHistoryLength = result.current.history.length;

    const stateWithTempAgent = {
      ...mockState,
      phases: [
        {
          ...mockState.phases[0],
          agentsOnCanvas: [{ id: "temp-drag-id", name: "Jett", x: 0, y: 0 }],
        },
        ...mockState.phases.slice(1),
      ],
    };
    getCurrentState.mockReturnValue(stateWithTempAgent);

    rerender();
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.history.length).toBe(initialHistoryLength);
  });

  it("should reset history and clear any pending automatic save", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    act(() => {
      result.current.saveToHistory();
    });

    act(() => {
      mockState = {
        ...mockState,
        currentPhaseIndex: 1,
      };
      result.current.saveToHistory();
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.resetHistory();
    });

    expect(result.current.history).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    const { result: autoSaveResult } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    act(() => {
      autoSaveResult.current.resetHistory();
      jest.advanceTimersByTime(0);
    });

    expect(autoSaveResult.current.history).toEqual([]);
  });

  it("should seed history with a baseline state when resetting", () => {
    let currentState = mockState;
    getCurrentState.mockImplementation(() => currentState);

    const { result, rerender } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    const baselineState = {
      ...mockState,
      currentPhaseIndex: 3,
    };

    act(() => {
      result.current.resetHistory(baselineState);
    });

    expect(result.current.history).toEqual([baselineState]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    currentState = baselineState;
    rerender();

    act(() => {
      jest.advanceTimersByTime(0);
    });

    currentState = {
      ...baselineState,
      currentPhaseIndex: 4,
    };

    act(() => {
      result.current.saveToHistory();
    });

    expect(result.current.canUndo).toBe(true);
  });

  it("should not auto-save a second entry after seeding the current state as baseline", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState }),
    );

    act(() => {
      result.current.resetHistory(mockState);
      jest.advanceTimersByTime(0);
    });

    expect(result.current.history).toEqual([mockState]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("should skip the first automatic save after resetting to a baseline", () => {
    const states = [
      { ...mockState, currentPhaseIndex: 1 },
      { ...mockState, currentPhaseIndex: 1 },
      { ...mockState, currentPhaseIndex: 2 },
    ];

    const { result, rerender } = renderHook(
      ({
        version,
        isTrackingEnabled,
      }: {
        version: number;
        isTrackingEnabled: boolean;
      }) =>
        useHistoryManager({
          getCurrentState: () => states[version],
          applyState,
          isTrackingEnabled,
        }),
      {
        initialProps: {
          version: 0,
          isTrackingEnabled: false,
        },
      },
    );

    const baselineState = { ...mockState, currentPhaseIndex: 0 };

    act(() => {
      result.current.resetHistory(baselineState);
    });

    rerender({ version: 1, isTrackingEnabled: true });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.history).toEqual([baselineState]);
    expect(result.current.canUndo).toBe(false);

    rerender({ version: 2, isTrackingEnabled: true });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.history).toEqual([baselineState, states[2]]);
    expect(result.current.canUndo).toBe(true);
  });

  it("should preserve redo after undo when the restored state rerenders", () => {
    const states = [
      { ...mockState, currentPhaseIndex: 0 },
      { ...mockState, currentPhaseIndex: 1 },
    ];

    const { result, rerender } = renderHook(
      ({ version }: { version: 0 | 1 }) =>
        useHistoryManager({
          getCurrentState: () => states[version],
          applyState,
        }),
      {
        initialProps: { version: 0 as 0 | 1 },
      },
    );

    act(() => {
      result.current.saveToHistory();
    });

    rerender({ version: 1 });

    act(() => {
      result.current.saveToHistory();
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    rerender({ version: 0 });

    rerender({ version: 0 });

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.history).toEqual(states);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it("should preserve redo when the settled undo state differs from the history target", () => {
    const historyStates = [
      { ...mockState, currentPhaseIndex: 0, editedPhases: [0] },
      { ...mockState, currentPhaseIndex: 1, editedPhases: [0, 1] },
    ];
    const settledUndoState = {
      ...historyStates[0],
      editedPhases: [0, 1],
    };

    let liveState = historyStates[0];
    const applyHistoryStateMock = jest.fn(
      (
        state: UndoableState,
        onSettled?: (settledState: UndoableState) => void,
      ) => {
        liveState =
          state.currentPhaseIndex === historyStates[0].currentPhaseIndex
            ? settledUndoState
            : state;
        onSettled?.(liveState);
      },
    );

    const { result, rerender } = renderHook(() =>
      useHistoryManager({
        getCurrentState: () => liveState,
        applyState: applyHistoryStateMock,
      }),
    );

    act(() => {
      result.current.saveToHistory();
    });

    liveState = historyStates[1];

    act(() => {
      result.current.saveToHistory();
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    rerender();

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.history).toEqual(historyStates);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it("should notify when history replay settles", () => {
    const onHistoryReplaySettled = jest.fn();
    const state1 = { ...mockState, currentPhaseIndex: 0 };
    const state2 = { ...mockState, currentPhaseIndex: 1 };
    let liveState = state1;
    const applyHistoryState = jest.fn(
      (
        state: UndoableState,
        onSettled?: (settledState: UndoableState) => void,
      ) => {
        liveState = state;
        onSettled?.(state);
      },
    );

    const { result } = renderHook(() =>
      useHistoryManager({
        getCurrentState: () => liveState,
        applyState: applyHistoryState,
        onHistoryReplaySettled,
      }),
    );

    act(() => {
      result.current.saveToHistory();
    });

    liveState = state2;

    act(() => {
      result.current.saveToHistory();
    });

    act(() => {
      result.current.undo();
    });

    expect(onHistoryReplaySettled).toHaveBeenCalledWith(state1, state2, state1);
  });

  it("should not auto-save while tracking is disabled", () => {
    const { result, rerender } = renderHook(
      ({ isTrackingEnabled }: { isTrackingEnabled: boolean }) =>
        useHistoryManager({
          getCurrentState,
          applyState,
          isTrackingEnabled,
        }),
      {
        initialProps: { isTrackingEnabled: false },
      },
    );

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.history).toEqual([]);

    act(() => {
      result.current.resetHistory(mockState);
    });

    rerender({ isTrackingEnabled: true });

    expect(result.current.history).toEqual([mockState]);
    expect(result.current.canUndo).toBe(false);
  });
});
