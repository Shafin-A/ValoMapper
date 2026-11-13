import type { Vector2d } from "konva/lib/types";

export type MapOption = {
  id: string;
  text: string;
  textColor: string;
};

export type MapSide = "attack" | "defense";

export type CanvasBackground = "none" | "dots" | "grid";

export type Callout = {
  regionName: string;
  superRegionName: string;
  location: Vector2d;
};

export type MapCalloutData = {
  xMultiplier: number;
  yMultiplier: number;
  xScalarToAdd: number;
  yScalarToAdd: number;
  rotation: number;
  callouts: Callout[];
};

export type SpawnBarrier = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isAlly: boolean;
};

export type MapSpawnBarrierData = {
  barriers: SpawnBarrier[];
};
