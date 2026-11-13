import mapData from "@/lib/consts/data/maps.json";
import type { MapOption } from "@/lib/types";

export const MAP_OPTIONS: MapOption[] = mapData.mapOptions;

export const DEFAULT_MAP_IDS: string[] = mapData.defaultMapIds;

export const DEFAULT_MAP_OPTIONS: MapOption[] = MAP_OPTIONS.filter((m) =>
  DEFAULT_MAP_IDS.includes(m.id),
);
