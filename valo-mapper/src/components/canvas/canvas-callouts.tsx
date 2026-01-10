import { useCanvas } from "@/contexts/canvas-context";
import { getMapCallouts, MAP_SIZE } from "@/lib/consts";
import { Vector2d } from "konva/lib/types";
import { Group, Label, Tag, Text } from "react-konva";

interface CanvasCalloutsProps {
  mapPosition: Vector2d;
}

export const CanvasCallouts = ({ mapPosition }: CanvasCalloutsProps) => {
  const { selectedMap, mapSide, showCallouts, isMapTransitioning } =
    useCanvas();

  if (!showCallouts || isMapTransitioning) {
    return null;
  }

  const calloutData = getMapCallouts(selectedMap.id);

  if (!calloutData) {
    return null;
  }

  const {
    xMultiplier,
    yMultiplier,
    xScalarToAdd,
    yScalarToAdd,
    rotation,
    callouts,
  } = calloutData;

  const scale = 1.25;
  const scaledSize = MAP_SIZE * scale;

  const mapCenterX = mapPosition.x + MAP_SIZE / 2;
  const mapCenterY = mapPosition.y + MAP_SIZE / 2;

  return (
    <Group>
      {callouts.map((callout, index) => {
        // The swap of game_x and game_y at the start is correct.
        const normalizedX = callout.location.y * xMultiplier + xScalarToAdd;
        const normalizedY = callout.location.x * yMultiplier + yScalarToAdd;

        let x = (normalizedX - 0.5) * scaledSize + mapCenterX;
        let y = (normalizedY - 0.5) * scaledSize + mapCenterY;

        if (rotation !== 0) {
          const rad = (rotation * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const dx = x - mapCenterX;
          const dy = y - mapCenterY;
          x = mapCenterX + dx * cos - dy * sin;
          y = mapCenterY + dx * sin + dy * cos;
        }

        if (mapSide === "attack") {
          x = 2 * mapCenterX - x;
          y = 2 * mapCenterY - y;
        }

        const displayText = callout.superRegionName
          ? `${callout.superRegionName} ${callout.regionName}`
          : callout.regionName;

        const estimatedWidth = displayText.length * 11 * 0.6 + 6;
        const estimatedHeight = 11 + 6;

        return (
          <Label
            key={`${callout.regionName}-${callout.superRegionName}-${index}`}
            x={x}
            y={y}
            offsetX={estimatedWidth / 2}
            offsetY={estimatedHeight / 2}
            listening={false}
          >
            <Tag
              fill="rgba(0, 0, 0, 0.6)"
              cornerRadius={3}
              pointerDirection="none"
            />
            <Text
              text={displayText}
              fontSize={12}
              fontStyle="bold"
              fill="#ffffff"
              padding={3}
              align="center"
            />
          </Label>
        );
      })}
    </Group>
  );
};
