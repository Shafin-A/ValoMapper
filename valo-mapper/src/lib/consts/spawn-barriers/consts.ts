import barrierData from "@/lib/consts/data/map-spawn-barriers.json";
import type { MapSpawnBarrierData } from "@/lib/types";

export const MAP_SPAWN_BARRIERS: Record<string, MapSpawnBarrierData> =
  barrierData;

export const getMapSpawnBarriers = (
  mapId: string,
): MapSpawnBarrierData | undefined => {
  return MAP_SPAWN_BARRIERS[mapId];
};
