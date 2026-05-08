import type {
  TraversalMovement,
  TraversalSelection,
  TraversalTimeOption,
  TraversalWeapon,
} from "@/lib/types";
import { PIXELS_PER_METER } from "./misc/consts";

export type TraversalTimeConfig = {
  value: TraversalTimeOption;
  label: string;
  metersPerSecond: number;
  imageSrc?: string;
  imageAlt?: string;
};

export const TRAVERSAL_TIME_OPTIONS: TraversalTimeConfig[] = [
  {
    value: "knife-run",
    label: "Knife Run",
    metersPerSecond: 6.75,
    imageSrc: "/weapons/2F59173C-4BED-B6C3-2191-DEA9B58BE9C7_killstream.png",
    imageAlt: "Knife",
  },
  {
    value: "knife-walk",
    label: "Knife Walk",
    metersPerSecond: 4.5,
    imageSrc: "/weapons/2F59173C-4BED-B6C3-2191-DEA9B58BE9C7_killstream.png",
    imageAlt: "Knife",
  },
  {
    value: "phantom-vandal-run",
    label: "Phantom/Vandal Run",
    metersPerSecond: 5.4,
    imageSrc: "/weapons/9C82E19D-4575-0200-1A81-3EACF00CF872_killstream.png",
    imageAlt: "Vandal",
  },
  {
    value: "phantom-vandal-walk",
    label: "Phantom/Vandal Walk",
    metersPerSecond: 3.6,
    imageSrc: "/weapons/9C82E19D-4575-0200-1A81-3EACF00CF872_killstream.png",
    imageAlt: "Vandal",
  },
];

export const TRAVERSAL_TIME_BY_OPTION = Object.fromEntries(
  TRAVERSAL_TIME_OPTIONS.map((option) => [option.value, option]),
) as Record<TraversalTimeOption, TraversalTimeConfig>;

export const TRAVERSAL_WEAPON_OPTIONS = TRAVERSAL_TIME_OPTIONS.filter(
  (option) => option.value.endsWith("run"),
).map((option) => ({
  value: option.value.startsWith("knife")
    ? ("knife" as const)
    : ("phantom-vandal" as const),
  label: option.label.replace(/ Run$/, ""),
  imageSrc: option.imageSrc,
  imageAlt: option.imageAlt,
}));

export const TRAVERSAL_TIME_BY_PARTS: Record<
  TraversalWeapon,
  Record<TraversalMovement, TraversalTimeOption>
> = {
  knife: {
    run: "knife-run",
    walk: "knife-walk",
  },
  "phantom-vandal": {
    run: "phantom-vandal-run",
    walk: "phantom-vandal-walk",
  },
};

export const getTraversalSelection = (
  traversalTime: TraversalTimeOption | null | undefined,
): TraversalSelection => {
  if (!traversalTime) {
    return {
      weapon: null,
      movement: null,
    };
  }

  return {
    weapon: traversalTime.startsWith("knife")
      ? ("knife" as const)
      : ("phantom-vandal" as const),
    movement: traversalTime.endsWith("run")
      ? ("run" as const)
      : ("walk" as const),
  };
};

export const getTraversalDurationSeconds = (
  pathLength: number,
  traversalTime: TraversalTimeOption,
) => {
  const traversalConfig = TRAVERSAL_TIME_BY_OPTION[traversalTime];

  if (!traversalConfig || traversalConfig.metersPerSecond <= 0) {
    return null;
  }

  const pathLengthInMeters = pathLength / PIXELS_PER_METER;

  return pathLengthInMeters / traversalConfig.metersPerSecond;
};
