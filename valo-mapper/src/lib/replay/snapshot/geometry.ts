import { getMapCallouts, MAP_SIZE, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "@/lib/consts";
import {
  CANVAS_MAP_RENDER_SCALE,
  transformRiotWorldToCanvasPoint,
} from "@/lib/map-positioning";
import type { MapSide } from "@/lib/types";
import { REPLAY_VIEW_VECTOR_LENGTH } from "./constants";

export const getReplayMapPosition = () => ({
  x: (VIRTUAL_WIDTH - MAP_SIZE) / 2,
  y: (VIRTUAL_HEIGHT - MAP_SIZE) / 2,
});

/** Extra canvas units an icon may overhang the map image before it is hidden. */
export const REPLAY_MAP_ICON_MARGIN = 24;

/**
 * True when a canvas point lands on the rendered map image. Hides actors whose
 * world position is outside the playable map (Iso arena, out-of-bounds spawns).
 */
export const isReplayPointOnMap = ({
  point,
  mapPosition = getReplayMapPosition(),
  margin = REPLAY_MAP_ICON_MARGIN,
}: {
  point: { x: number; y: number };
  mapPosition?: { x: number; y: number };
  margin?: number;
}) => {
  const centerX = mapPosition.x + MAP_SIZE / 2;
  const centerY = mapPosition.y + MAP_SIZE / 2;
  const halfExtent = (MAP_SIZE * CANVAS_MAP_RENDER_SCALE) / 2 + margin;

  return (
    Math.abs(point.x - centerX) <= halfExtent &&
    Math.abs(point.y - centerY) <= halfExtent
  );
};

export const toReplayCanvasPoint = ({
  mapId,
  mapSide,
  position,
}: {
  mapId: string;
  mapSide: MapSide;
  position?: { x: number; y: number };
}) => {
  if (!position) {
    return null;
  }

  const transform = getMapCallouts(mapId);
  if (!transform) {
    return null;
  }

  return transformRiotWorldToCanvasPoint({
    position,
    transform,
    mapPosition: getReplayMapPosition(),
    mapSide,
  });
};

export const toReplayCanvasRotation = ({
  mapId,
  mapSide,
  location,
  viewRadians,
}: {
  mapId: string;
  mapSide: MapSide;
  location?: { x: number; y: number };
  viewRadians?: number;
}) => {
  if (
    !location ||
    typeof viewRadians !== "number" ||
    !Number.isFinite(viewRadians)
  ) {
    return 0;
  }

  const transform = getMapCallouts(mapId);
  if (!transform) {
    return 0;
  }

  const mapPosition = getReplayMapPosition();
  const origin = transformRiotWorldToCanvasPoint({
    position: location,
    transform,
    mapPosition,
    mapSide,
  });
  const facingPoint = transformRiotWorldToCanvasPoint({
    position: {
      x: location.x + Math.cos(viewRadians) * REPLAY_VIEW_VECTOR_LENGTH,
      y: location.y + Math.sin(viewRadians) * REPLAY_VIEW_VECTOR_LENGTH,
    },
    transform,
    mapPosition,
    mapSide,
  });

  if (!origin || !facingPoint) {
    return 0;
  }

  return (
    (Math.atan2(facingPoint.y - origin.y, facingPoint.x - origin.x) * 180) /
    Math.PI
  );
};
