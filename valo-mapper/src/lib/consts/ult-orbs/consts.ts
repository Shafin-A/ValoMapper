import orbData from "@/lib/consts/data/map-ult-orbs.json";
import type { Vector2d } from "konva/lib/types";

type MapUltOrbData = {
  orbs: Vector2d[];
};

export const MAP_ULT_ORBS: Record<string, MapUltOrbData> = orbData;

export const getMapUltOrbs = (mapId: string): MapUltOrbData | undefined => {
  return MAP_ULT_ORBS[mapId];
};
