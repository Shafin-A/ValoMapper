import { Vector2d } from "konva/lib/types";

type MapUltOrbData = {
  orbs: Vector2d[];
};

export const MAP_ULT_ORBS: Record<string, MapUltOrbData> = {
  ascent: {
    orbs: [
      { x: 205, y: 517 },
      { x: 805, y: 645 },
    ],
  },
  split: {
    orbs: [
      { x: 142, y: 501 },
      { x: 1016, y: 450 },
    ],
  },
  corrode: {
    orbs: [
      { x: 117, y: 362 },
      { x: 745, y: 485 },
    ],
  },
  haven: {
    orbs: [
      { x: 45, y: 422 },
      { x: 922, y: 251 },
    ],
  },
  bind: {
    orbs: [
      { x: 75, y: 525 },
      { x: 885, y: 595 },
    ],
  },
  breeze: {
    orbs: [
      { x: 160, y: 345 },
      { x: 950, y: 530 },
    ],
  },
  fracture: {
    orbs: [
      { x: 175, y: 145 },
      { x: 911, y: 187 },
      { x: 235, y: 730 },
      { x: 765, y: 710 },
    ],
  },
  pearl: {
    orbs: [
      { x: -15, y: 447 },
      { x: 1014, y: 237 },
    ],
  },
  lotus: {
    orbs: [
      { x: 145, y: 520 },
      { x: 817, y: 303 },
    ],
  },
  sunset: {
    orbs: [
      { x: 130, y: 518 },
      { x: 884, y: 297 },
    ],
  },
  icebox: {
    orbs: [
      { x: 100, y: 605 },
      { x: 700, y: 395 },
    ],
  },
  abyss: {
    orbs: [
      { x: 115, y: 335 },
      { x: 950, y: 340 },
    ],
  },
};

export const getMapUltOrbs = (mapId: string): MapUltOrbData | undefined => {
  return MAP_ULT_ORBS[mapId];
};
