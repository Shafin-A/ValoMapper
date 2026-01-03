import { useEffect, useRef } from "react";
import type { AbilityCanvas, AgentCanvas } from "@/lib/types";

interface Dimensions {
  width: number;
  height: number;
}

export const usePositionScaling = (
  dimensions: Dimensions,
  previousDimensions: Dimensions,
  agentsOnCanvas: AgentCanvas[],
  setAgentsOnCanvas: React.Dispatch<React.SetStateAction<AgentCanvas[]>>,
  abilitiesOnCanvas: AbilityCanvas[],
  setAbilitiesOnCanvas: React.Dispatch<React.SetStateAction<AbilityCanvas[]>>,
  mapSize: number
) => {
  const lastProcessedDimensions = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (
      previousDimensions.width === 0 ||
      previousDimensions.height === 0 ||
      (dimensions.width === previousDimensions.width &&
        dimensions.height === previousDimensions.height) ||
      (dimensions.width === lastProcessedDimensions.current.width &&
        dimensions.height === lastProcessedDimensions.current.height)
    ) {
      return;
    }

    lastProcessedDimensions.current = { ...dimensions };

    const scalePositions = (items: (AgentCanvas | AbilityCanvas)[]) => {
      if (items.length === 0) return items;

      return items.map((item) => {
        const prevMapCenterX = previousDimensions.width / 2;
        const prevMapCenterY = previousDimensions.height / 2;
        const newMapCenterX = dimensions.width / 2;
        const newMapCenterY = dimensions.height / 2;

        const relativeX = item.x - prevMapCenterX;
        const relativeY = item.y - prevMapCenterY;

        return {
          ...item,
          x: newMapCenterX + relativeX,
          y: newMapCenterY + relativeY,
        };
      });
    };

    if (agentsOnCanvas.length > 0) {
      setAgentsOnCanvas((prev) => scalePositions(prev) as AgentCanvas[]);
    }

    if (abilitiesOnCanvas.length > 0) {
      setAbilitiesOnCanvas((prev) => scalePositions(prev) as AbilityCanvas[]);
    }
  }, [
    dimensions.width,
    dimensions.height,
    previousDimensions.width,
    previousDimensions.height,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    mapSize,
    dimensions,
    agentsOnCanvas.length,
    abilitiesOnCanvas.length,
  ]);
};
