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
    listview_src: "/maps/listviewicons/abyss.webp",
    minimap_src: "/maps/minimaps/abyss.webp",
    textColor: "text-white",
  },
  {
    id: "ascent",
    text: "Ascent",
    listview_src: "/maps/listviewicons/ascent.webp",
    minimap_src: "/maps/minimaps/ascent.webp",
    textColor: "text-white",
  },
  {
    id: "bind",
    text: "Bind",
    listview_src: "/maps/listviewicons/bind.webp",
    minimap_src: "/maps/minimaps/bind.webp",
    textColor: "text-white",
  },
  {
    id: "breeze",
    text: "Breeze",
    listview_src: "/maps/listviewicons/breeze.webp",
    minimap_src: "/maps/minimaps/breeze.webp",
    textColor: "text-white",
  },
  {
    id: "corrode",
    text: "Corrode",
    listview_src: "/maps/listviewicons/corrode.webp",
    minimap_src: "/maps/minimaps/corrode.webp",
    textColor: "text-white",
  },
  {
    id: "fracture",
    text: "Fracture",
    listview_src: "/maps/listviewicons/fracture.webp",
    minimap_src: "/maps/minimaps/fracture.webp",
    textColor: "text-white",
  },
  {
    id: "haven",
    text: "Haven",
    listview_src: "/maps/listviewicons/haven.webp",
    minimap_src: "/maps/minimaps/haven.webp",
    textColor: "text-white",
  },
  {
    id: "icebox",
    text: "Icebox",
    listview_src: "/maps/listviewicons/icebox.webp",
    minimap_src: "/maps/minimaps/icebox.webp",
    textColor: "text-white",
  },
  {
    id: "lotus",
    text: "Lotus",
    listview_src: "/maps/listviewicons/lotus.webp",
    minimap_src: "/maps/minimaps/lotus.webp",
    textColor: "text-white",
  },
  {
    id: "pearl",
    text: "Pearl",
    listview_src: "/maps/listviewicons/pearl.webp",
    minimap_src: "/maps/minimaps/pearl.webp",
    textColor: "text-white",
  },
  {
    id: "split",
    text: "Split",
    listview_src: "/maps/listviewicons/split.webp",
    minimap_src: "/maps/minimaps/split.webp",
    textColor: "text-white",
  },
  {
    id: "sunset",
    text: "Sunset",
    listview_src: "/maps/listviewicons/sunset.webp",
    minimap_src: "/maps/minimaps/sunset.webp",
    textColor: "text-white",
  },
];
