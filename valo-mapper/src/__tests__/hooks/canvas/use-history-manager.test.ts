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
    applyState = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize with empty history", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState })
    );

    expect(result.current.history).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("should save state to history manually", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState })
    );

    act(() => {
      result.current.saveToHistory();
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toEqual(mockState);
  });

  it("should enable undo after saving state", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState })
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
      useHistoryManager({ getCurrentState, applyState })
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

    act(() => {
      result.current.undo();
    });

    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(applyState).toHaveBeenCalledWith(state1);
  });

  it("should redo after undo", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState })
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

    act(() => {
      result.current.undo();
      jest.advanceTimersByTime(10);
    });

    expect(result.current.canRedo).toBe(true);

    applyState.mockClear();

    act(() => {
      result.current.redo();
      jest.advanceTimersByTime(10);
    });

    // Should have called applyState (redo applies the next state in history)
    expect(applyState).toHaveBeenCalled();
    const appliedState = applyState.mock.calls[0][0];
    expect(appliedState).toBeDefined();
    expect(appliedState.currentPhaseIndex).toBeGreaterThanOrEqual(0);
  });

  it("should limit history to 50 entries", () => {
    const { result } = renderHook(() =>
      useHistoryManager({ getCurrentState, applyState })
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
      useHistoryManager({ getCurrentState, applyState })
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
      jest.advanceTimersByTime(10);
      result.current.undo();
      jest.advanceTimersByTime(10);
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
      useHistoryManager({ getCurrentState, applyState })
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
      useHistoryManager({ getCurrentState, applyState })
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
      useHistoryManager({ getCurrentState, applyState })
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
      useHistoryManager({ getCurrentState, applyState })
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
});
