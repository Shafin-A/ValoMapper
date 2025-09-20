import { MapOption } from "@/lib/types";

export const TEMP_DRAG_ID = "temp-drag-id";

export const SIDEBAR_WIDTH = "20rem";
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

export const MAP_OPTIONS: MapOption[] = [
  {
    id: "abyss",
    text: "Abyss",
    listview_src: "/maps/listviewicons/abyss.png",
    minimap_src: "/maps/minimaps/abyss.webp",
    textColor: "text-white",
  },
  {
    id: "ascent",
    text: "Ascent",
    listview_src: "/maps/listviewicons/ascent.png",
    minimap_src: "/maps/minimaps/ascent.webp",
    textColor: "text-white",
  },
  {
    id: "bind",
    text: "Bind",
    listview_src: "/maps/listviewicons/bind.png",
    minimap_src: "/maps/minimaps/bind.webp",
    textColor: "text-white",
  },
  {
    id: "breeze",
    text: "Breeze",
    listview_src: "/maps/listviewicons/breeze.png",
    minimap_src: "/maps/minimaps/breeze.webp",
    textColor: "text-white",
  },
  {
    id: "corrode",
    text: "Corrode",
    listview_src: "/maps/listviewicons/corrode.png",
    minimap_src: "/maps/minimaps/corrode.webp",
    textColor: "text-white",
  },
  {
    id: "fracture",
    text: "Fracture",
    listview_src: "/maps/listviewicons/fracture.png",
    minimap_src: "/maps/minimaps/fracture.webp",
    textColor: "text-white",
  },
  {
    id: "haven",
    text: "Haven",
    listview_src: "/maps/listviewicons/haven.png",
    minimap_src: "/maps/minimaps/haven.webp",
    textColor: "text-white",
  },
  {
    id: "icebox",
    text: "Icebox",
    listview_src: "/maps/listviewicons/icebox.png",
    minimap_src: "/maps/minimaps/icebox.webp",
    textColor: "text-white",
  },
  {
    id: "lotus",
    text: "Lotus",
    listview_src: "/maps/listviewicons/lotus.png",
    minimap_src: "/maps/minimaps/lotus.webp",
    textColor: "text-white",
  },
  {
    id: "pearl",
    text: "Pearl",
    listview_src: "/maps/listviewicons/pearl.png",
    minimap_src: "/maps/minimaps/pearl.webp",
    textColor: "text-white",
  },
  {
    id: "split",
    text: "Split",
    listview_src: "/maps/listviewicons/split.png",
    minimap_src: "/maps/minimaps/split.webp",
    textColor: "text-white",
  },
  {
    id: "sunset",
    text: "Sunset",
    listview_src: "/maps/listviewicons/sunset.png",
    minimap_src: "/maps/minimaps/sunset.webp",
    textColor: "text-white",
  },
];
