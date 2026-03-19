import { MapOption } from "@/lib/types";

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

export const DEFAULT_MAP_IDS: string[] = [
  "bind",
  "breeze",
  "haven",
  "lotus",
  "pearl",
  "split",
];

export const DEFAULT_MAP_OPTIONS: MapOption[] = MAP_OPTIONS.filter((m) =>
  DEFAULT_MAP_IDS.includes(m.id),
);
