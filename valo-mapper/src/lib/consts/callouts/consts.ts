import calloutData from "@/lib/consts/data/map-callouts.json";
import type { MapCalloutData } from "@/lib/types";

export const MAP_CALLOUTS: Record<string, MapCalloutData> = calloutData;

export const getMapCallouts = (mapId: string): MapCalloutData | undefined => {
  return MAP_CALLOUTS[mapId];
};
