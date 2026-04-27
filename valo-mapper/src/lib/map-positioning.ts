import { MAP_SIZE } from "@/lib/consts";
import { MapCalloutData, MapSide } from "@/lib/types";

export const CANVAS_MAP_RENDER_SCALE = 1.25;

type Point2D = {
  x: number;
  y: number;
};

type MapWorldTransform = Pick<
  MapCalloutData,
  "xMultiplier" | "yMultiplier" | "xScalarToAdd" | "yScalarToAdd" | "rotation"
>;

const rotatePointAroundCenter = (
  point: Point2D,
  center: Point2D,
  rotationDegrees: number,
) => {
  if (rotationDegrees === 0) {
    return point;
  }

  const radians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
};

export const transformRiotWorldToCanvasPoint = ({
  position,
  transform,
  mapPosition,
  mapSide,
  mapSize = MAP_SIZE,
  scale = CANVAS_MAP_RENDER_SCALE,
}: {
  position: Point2D;
  transform: MapWorldTransform;
  mapPosition: Point2D;
  mapSide: MapSide;
  mapSize?: number;
  scale?: number;
}) => {
  const mapCenter = {
    x: mapPosition.x + mapSize / 2,
    y: mapPosition.y + mapSize / 2,
  };
  const scaledSize = mapSize * scale;

  // Riot world coordinates map onto the canvas with x/y swapped first.
  const normalizedX =
    position.y * transform.xMultiplier + transform.xScalarToAdd;
  const normalizedY =
    position.x * transform.yMultiplier + transform.yScalarToAdd;

  const rotatedPoint = rotatePointAroundCenter(
    {
      x: (normalizedX - 0.5) * scaledSize + mapCenter.x,
      y: (normalizedY - 0.5) * scaledSize + mapCenter.y,
    },
    mapCenter,
    transform.rotation,
  );

  if (mapSide === "attack") {
    return {
      x: 2 * mapCenter.x - rotatedPoint.x,
      y: 2 * mapCenter.y - rotatedPoint.y,
    };
  }

  return rotatedPoint;
};
