import { renderHook, act } from "@testing-library/react";
import { usePhaseManager } from "@/hooks/use-phase-manager";
import { PhaseState } from "@/lib/types";

describe("usePhaseManager", () => {
  it("should initialize with 10 empty phases", () => {
    const { result } = renderHook(() => usePhaseManager());

    expect(result.current.phases).toHaveLength(10);
    expect(result.current.currentPhaseIndex).toBe(0);
    expect(result.current.editedPhases).toEqual(new Set([0]));
  });

  it("should have empty initial phase state", () => {
    const { result } = renderHook(() => usePhaseManager());

    const expectedEmptyPhase: PhaseState = {
      agentsOnCanvas: [],
      abilitiesOnCanvas: [],
      drawLines: [],
      textsOnCanvas: [],
      imagesOnCanvas: [],
      toolIconsOnCanvas: [],
    };

    expect(result.current.currentPhase).toEqual(expectedEmptyPhase);
  });

  it("should update current phase", () => {
    const { result } = renderHook(() => usePhaseManager());

    act(() => {
      result.current.updateCurrentPhase({
        agentsOnCanvas: [
          {
            id: "agent-1",
            name: "Jett",
            x: 100,
            y: 100,
            isAlly: true,
            role: "Duelist",
          },
        ],
      });
    });

    expect(result.current.currentPhase.agentsOnCanvas).toHaveLength(1);
    expect(result.current.currentPhase.agentsOnCanvas[0].name).toBe("Jett");
  });

  it("should mark phase as edited when updated", () => {
    const { result } = renderHook(() => usePhaseManager());

    expect(result.current.editedPhases).toEqual(new Set([0]));

    act(() => {
      result.current.switchToPhase(2);
    });

    act(() => {
      result.current.updateCurrentPhase({
        agentsOnCanvas: [
          {
            id: "agent-1",
            name: "Sage",
            x: 200,
            y: 200,
            isAlly: true,
            role: "Sentinel",
          },
        ],
      });
    });

    expect(result.current.editedPhases.has(2)).toBe(true);
  });

  it("should switch to a new phase", () => {
    const { result } = renderHook(() => usePhaseManager());

    act(() => {
      result.current.switchToPhase(3);
    });

    expect(result.current.currentPhaseIndex).toBe(3);
  });

  it("should not switch to phase outside range", () => {
    const { result } = renderHook(() => usePhaseManager());

    act(() => {
      result.current.switchToPhase(-1);
    });
    expect(result.current.currentPhaseIndex).toBe(0);

    act(() => {
      result.current.switchToPhase(10);
    });
    expect(result.current.currentPhaseIndex).toBe(0);
  });

  it("should clone from highest edited phase when switching to unedited phase", () => {
    const { result } = renderHook(() => usePhaseManager());

    act(() => {
      result.current.updateCurrentPhase({
        agentsOnCanvas: [
          {
            id: "agent-1",
            name: "Jett",
            x: 100,
            y: 100,
            isAlly: true,
            role: "Duelist",
          },
        ],
      });
    });

    act(() => {
      result.current.switchToPhase(2);
    });

    expect(result.current.currentPhase.agentsOnCanvas).toHaveLength(1);
    expect(result.current.currentPhase.agentsOnCanvas[0].name).toBe("Jett");
  });

  it("should delete a phase", () => {
    const { result } = renderHook(() => usePhaseManager());

    act(() => {
      result.current.updateCurrentPhase({
        agentsOnCanvas: [
          {
            id: "agent-1",
            name: "Jett",
            x: 100,
            y: 100,
            isAlly: true,
            role: "Duelist",
          },
        ],
      });
    });

    act(() => {
      result.current.deletePhase(0);
    });

    expect(result.current.phases[0].agentsOnCanvas).toHaveLength(0);
    expect(result.current.editedPhases.has(0)).toBe(true);
  });

  it("should duplicate a phase", () => {
    const { result } = renderHook(() => usePhaseManager());

    act(() => {
      result.current.updateCurrentPhase({
        agentsOnCanvas: [
          {
            id: "agent-1",
            name: "Sage",
            x: 150,
            y: 150,
            isAlly: true,
            role: "Sentinel",
          },
        ],
      });
    });

    act(() => {
      result.current.duplicatePhase(0);
    });

    expect(result.current.currentPhaseIndex).toBe(1);
    expect(result.current.phases[1].agentsOnCanvas).toHaveLength(1);
    expect(result.current.phases[1].agentsOnCanvas[0].name).toBe("Sage");
    expect(result.current.editedPhases.has(1)).toBe(true);
  });

  it("should not duplicate phase 9 (out of bounds)", () => {
    const { result } = renderHook(() => usePhaseManager());

    act(() => {
      result.current.switchToPhase(9);
    });

    const initialEditedPhases = new Set(result.current.editedPhases);

    act(() => {
      result.current.duplicatePhase(9);
    });

    expect(result.current.currentPhaseIndex).toBe(9);
    expect(result.current.editedPhases).toEqual(initialEditedPhases);
  });

  it("should reset all phases", () => {
    const { result } = renderHook(() => usePhaseManager());

    act(() => {
      result.current.updateCurrentPhase({
        agentsOnCanvas: [
          {
            id: "agent-1",
            name: "Jett",
            x: 100,
            y: 100,
            isAlly: true,
            role: "Duelist",
          },
        ],
      });
      result.current.switchToPhase(2);
      result.current.updateCurrentPhase({
        agentsOnCanvas: [
          {
            id: "agent-2",
            name: "Sage",
            x: 200,
            y: 200,
            isAlly: true,
            role: "Sentinel",
          },
        ],
      });
    });

    act(() => {
      result.current.resetAllPhases();
    });

    expect(result.current.currentPhaseIndex).toBe(0);
    expect(result.current.editedPhases).toEqual(new Set([0]));
    expect(result.current.phases[0].agentsOnCanvas).toHaveLength(0);
    expect(result.current.phases[2].agentsOnCanvas).toHaveLength(0);
  });
});
