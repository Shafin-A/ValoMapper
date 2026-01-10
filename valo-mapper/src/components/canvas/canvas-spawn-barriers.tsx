import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { getMapSpawnBarriers, MAP_SIZE } from "@/lib/consts";
import { Vector2d } from "konva/lib/types";
import { Group, Line } from "react-konva";

interface CanvasSpawnBarriersProps {
  mapPosition: Vector2d;
}

export const CanvasSpawnBarriers = ({
  mapPosition,
}: CanvasSpawnBarriersProps) => {
  const { selectedMap, mapSide, showSpawnBarriers } = useCanvas();
  const { agentsSettings } = useSettings();

  const allyColor = agentsSettings.allyColor;
  const enemyColor = agentsSettings.enemyColor;

  if (!showSpawnBarriers) {
    return null;
  }

  const barrierData = getMapSpawnBarriers(selectedMap.id);

  if (!barrierData) {
    return null;
  }

  const { barriers } = barrierData;

  const mapCenterX = mapPosition.x + MAP_SIZE / 2;
  const mapCenterY = mapPosition.y + MAP_SIZE / 2;

  return (
    <Group>
      {barriers.map((barrier, index) => {
        let x1 = mapPosition.x + barrier.startX;
        let y1 = mapPosition.y + barrier.startY;
        let x2 = mapPosition.x + barrier.endX;
        let y2 = mapPosition.y + barrier.endY;

        if (mapSide === "attack") {
          x1 = 2 * mapCenterX - x1;
          y1 = 2 * mapCenterY - y1;
          x2 = 2 * mapCenterX - x2;
          y2 = 2 * mapCenterY - y2;
        }

        const color = barrier.isAlly ? allyColor : enemyColor;

        return (
          <Line
            key={`spawn-barrier-${index}`}
            points={[x1, y1, x2, y2]}
            stroke={color}
            strokeWidth={10}
            listening={false}
            opacity={0.7}
          />
        );
      })}
    </Group>
  );
};
