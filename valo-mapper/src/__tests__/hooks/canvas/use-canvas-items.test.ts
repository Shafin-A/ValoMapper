import { renderHook, act } from "@testing-library/react";
import { useCanvasItems } from "@/hooks/canvas/use-canvas-items";
import { usePhaseManager } from "@/hooks/canvas/use-phase-manager";
import type { AbilityCanvas } from "@/lib/types";

const createAbility = (id: string): AbilityCanvas => ({
  id,
  name: "knife",
  action: "kayo_knife",
  isAlly: true,
  x: 0,
  y: 0,
});

const useCanvasItemsHarness = () => {
  const phaseManager = usePhaseManager({ initialPhaseCount: 1 });

  return useCanvasItems(
    phaseManager.currentPhase,
    phaseManager.updateCurrentPhase,
  );
};

describe("useCanvasItems", () => {
  it("composes sequential functional ability updates against the latest phase state", () => {
    const { result } = renderHook(() => useCanvasItemsHarness());

    act(() => {
      result.current.setAbilitiesOnCanvas((prev) => [
        ...prev,
        createAbility("ability-1"),
      ]);
      result.current.setAbilitiesOnCanvas((prev) => [
        ...prev,
        createAbility("ability-2"),
      ]);
    });

    expect(
      result.current.abilitiesOnCanvas.map((ability) => ability.id),
    ).toEqual(["ability-1", "ability-2"]);
  });
});
