import { CircleAbility } from "@/lib/types";

export const CIRCLE_ABILITY_CONFIGS: Record<
  CircleAbility,
  { radius: number; colors: { stroke: string; fill: string } }
> = {
  astra_stun: {
    radius: 4.75,
    colors: { stroke: "#ffe17a", fill: "#4f007680" },
  },
  astra_suck: {
    radius: 4.75,
    colors: { stroke: "#ffe17a", fill: "#4f007680" },
  },
  astra_smoke: {
    radius: 4.75,
    colors: { stroke: "#ffe17a", fill: "#4f007680" },
  },
  brim_smoke: {
    radius: 4.15,
    colors: { stroke: "#fffe1a", fill: "#eb953f80" },
  },
  brim_stim: {
    radius: 6,
    colors: { stroke: "#7bddc3", fill: "#eb953f80" },
  },
  brim_molly: {
    radius: 4.5,
    colors: { stroke: "#e0392d", fill: "#57205780" },
  },
  brim_ult: {
    radius: 9,
    colors: { stroke: "#e0392d", fill: "#eb953f80" },
  },
  chamber_trip: {
    radius: 10,
    colors: { stroke: "#d37c48", fill: "#d37c4880" },
  },
  chamber_tp: {
    radius: 18,
    colors: { stroke: "#fcbf07", fill: "#fcbf0780" },
  },
  clove_meddle: {
    radius: 6,
    colors: { stroke: "#f674ff", fill: "#fbd7ff80" },
  },
  clove_smoke: {
    radius: 4,
    colors: { stroke: "#c9d3eb", fill: "#f674ff80" },
  },
  cypher_cage: {
    radius: 3.72,
    colors: { stroke: "#def4ff", fill: "#9a9da580" },
  },
  harbor_cove: {
    radius: 4.5,
    colors: { stroke: "#f2d6a3", fill: "#136c6b80" },
  },
};
