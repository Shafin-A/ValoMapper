import { MapOption } from "@/lib/types";

export const TEMP_DRAG_ID = "temp-drag-id";

export const SIDEBAR_WIDTH = 320;
export const SCALE_FACTOR = 1.25;
export const MAP_SIZE = 1000;
export const MAX_ZOOM_SCALE = 4;
export const MIN_ZOOM_SCALE = 1;

export const ROLE_ICONS: Record<string, string> = {
  Controller: "/roles/controller.png",
  Duelist: "/roles/duelist.png",
  Initiator: "/roles/initiator.png",
  Sentinel: "/roles/sentinel.png",
};

export const PIXELS_PER_METER = 122 / 15;

export const LANDING_MESSAGES = [
  "Design strategies that win rounds",
  "Coordinate executes with pixel-perfect precision",
  "Share tactics that dominate ranked",
] as const;

export const WEAPONS = {
  sidearms: [
    { name: "classic", width: 188 / 5, height: 128 / 5 },
    { name: "shorty", width: 308 / 6, height: 100 / 6 },
    { name: "frenzy", width: 168 / 5, height: 128 / 5 },
    { name: "ghost", width: 300 / 6, height: 100 / 6 },
    { name: "sheriff", width: 248 / 5, height: 128 / 5 },
    { name: "knife", width: 100 / 2, height: 32 / 2 },
  ],
  smgs: [
    { name: "stinger", width: 328 / 5, height: 128 / 5 },
    { name: "spectre", width: 352 / 5, height: 128 / 5 },
  ],
  shotguns: [
    { name: "bucky", width: 508 / 7, height: 100 / 7 },
    { name: "judge", width: 412 / 7, height: 128 / 7 },
  ],
  rifles: [
    { name: "bulldog", width: 400 / 7, height: 124 / 7 },
    { name: "guardian", width: 508 / 7, height: 108 / 7 },
    { name: "phantom", width: 508 / 7, height: 120 / 7 },
    { name: "vandal", width: 420 / 7, height: 128 / 7 },
  ],
  snipers: [
    { name: "marshal", width: 508 / 7, height: 92 / 7 },
    { name: "outlaw", width: 512 / 7, height: 108 / 7 },
    { name: "operator", width: 504 / 7, height: 104 / 7 },
  ],
  machineGuns: [
    { name: "ares", width: 484 / 7, height: 100 / 7 },
    { name: "odin", width: 444 / 7, height: 124 / 7 },
  ],
};

export const MAP_OPTIONS: MapOption[] = [
  {
    id: "abyss",
    text: "Abyss",
    textColor: "text-white",
  },
  {
    id: "ascent",
    text: "Ascent",
    textColor: "text-white",
  },
  {
    id: "bind",
    text: "Bind",
    textColor: "text-white",
  },
  {
    id: "breeze",
    text: "Breeze",
    textColor: "text-white",
  },
  {
    id: "corrode",
    text: "Corrode",
    textColor: "text-white",
  },
  {
    id: "fracture",
    text: "Fracture",
    textColor: "text-white",
  },
  {
    id: "haven",
    text: "Haven",
    textColor: "text-white",
  },
  {
    id: "icebox",
    text: "Icebox",
    textColor: "text-white",
  },
  {
    id: "lotus",
    text: "Lotus",
    textColor: "text-white",
  },
  {
    id: "pearl",
    text: "Pearl",
    textColor: "text-white",
  },
  {
    id: "split",
    text: "Split",
    textColor: "text-white",
  },
  {
    id: "sunset",
    text: "Sunset",
    textColor: "text-white",
  },
];
