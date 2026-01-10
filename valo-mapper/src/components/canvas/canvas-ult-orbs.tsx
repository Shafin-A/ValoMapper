import { useCanvas } from "@/contexts/canvas-context";
import { getMapUltOrbs, MAP_SIZE } from "@/lib/consts";
import { Vector2d } from "konva/lib/types";
import { Circle, Group } from "react-konva";

interface CanvasUltOrbsProps {
  mapPosition: Vector2d;
}

export const CanvasUltOrbs = ({ mapPosition }: CanvasUltOrbsProps) => {
  const { selectedMap, mapSide, showUltOrbs, isMapTransitioning } = useCanvas();

  if (!showUltOrbs || isMapTransitioning) {
    return null;
  }

  const ultOrbData = getMapUltOrbs(selectedMap.id);

  if (!ultOrbData) {
    return null;
  }

  const { orbs } = ultOrbData;

  const mapCenterX = mapPosition.x + MAP_SIZE / 2;
  const mapCenterY = mapPosition.y + MAP_SIZE / 2;

  return (
    <Group>
      {orbs.map((orb, index) => {
        let x = mapPosition.x + orb.x;
        let y = mapPosition.y + orb.y;

        if (mapSide === "attack") {
          x = 2 * mapCenterX - x;
          y = 2 * mapCenterY - y;
        }

        return (
          <Group key={`ult-orb-${index}`} x={x} y={y} listening={false}>
            <Circle radius={10} fill="#000000" />
            <Circle radius={3} fill="#ffffff" />
          </Group>
        );
      })}
    </Group>
  );
};
