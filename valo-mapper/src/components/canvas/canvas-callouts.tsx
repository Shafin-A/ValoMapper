import { useCanvas } from "@/contexts/canvas-context";
import { getMapCallouts, MAP_SIZE } from "@/lib/consts";
import { transformRiotWorldToCanvasPoint } from "@/lib/map-positioning";
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

  const { callouts } = calloutData;

  const scale = 1.25;

  return (
    <Group>
      {callouts.map((callout, index) => {
        const { x, y } = transformRiotWorldToCanvasPoint({
          position: callout.location,
          transform: calloutData,
          mapPosition,
          mapSide,
          mapSize: MAP_SIZE,
          scale,
        });

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
