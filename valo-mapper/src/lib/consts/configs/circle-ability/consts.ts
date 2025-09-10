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
  deadlock_net: {
    radius: 6.5,
    colors: { stroke: "#0f53b0", fill: "#60c8ff80" },
  },
  fade_eye: {
    radius: 30,
    colors: { stroke: "#280720", fill: "#75175e80" },
  },
  fade_seize: {
    radius: 6.58,
    colors: { stroke: "#121416", fill: "#12141680" },
  },
  gekko_molly: {
    radius: 6.2,
    colors: { stroke: "#02462d", fill: "#6ee63280" },
  },
  harbor_cove: {
    radius: 4.5,
    colors: { stroke: "#f2d6a3", fill: "#136c6b80" },
  },
  harbor_ult: {
    radius: 21.25,
    colors: { stroke: "#f2d6a3", fill: "#136c6b80" },
  },
  jett_smoke: {
    radius: 3.35,
    colors: { stroke: "#bbd3e6", fill: "#658ea780" },
  },
  kayo_molly: {
    radius: 4,
    colors: { stroke: "#ffc8ff", fill: "#20297c80" },
  },
  kayo_knife: {
    radius: 15,
    colors: { stroke: "#fe53ff", fill: "#8935af80" },
  },
  kayo_ult: {
    radius: 42.5,
    colors: { stroke: "#9001f0", fill: "#7cffff80" },
  },
  kj_alarmbot: {
    radius: 5.5,
    colors: { stroke: "#5bffff", fill: "#925ab880" },
  },
  kj_molly: {
    radius: 4.5,
    colors: { stroke: "#5bffff", fill: "#925ab880" },
  },
  kj_ult: {
    radius: 32.5,
    colors: { stroke: "#3e8174", fill: "#2d519380" },
  },
  neon_stun: {
    radius: 5,
    colors: { stroke: "#4eacee", fill: "#fdfea380" },
  },
  omen_smoke: {
    radius: 4.1,
    colors: { stroke: "#201936", fill: "#20193680" },
  },
  phoenix_molly: {
    radius: 4.5,
    colors: { stroke: "#e25457", fill: "#ff9c7b80" },
  },
  skye_heal: {
    radius: 18,
    colors: { stroke: "#669835", fill: "#bfd93a80" },
  },
  sova_shock_dart: {
    radius: 4,
    colors: { stroke: "#4f9ef5", fill: "#63edff80" },
  },
  sova_dart: {
    radius: 30,
    colors: { stroke: "#4f9ef5", fill: "#63edff80" },
  },
  tejo_drone: {
    radius: 30,
    colors: { stroke: "#9d6836", fill: "#f6b14180" },
  },
  tejo_stun: {
    radius: 5.25,
    colors: { stroke: "#eed381", fill: "#b8864980" },
  },
  tejo_missile: {
    radius: 4.5,
    colors: { stroke: "#3b1d49", fill: "#b8864980" },
  },
  viper_molly: {
    radius: 4.5,
    colors: { stroke: "#67e72a", fill: "#48a85380" },
  },
  viper_smoke: {
    radius: 4.5,
    colors: { stroke: "#206c57", fill: "#a1e94a80" },
  },
  vyse_slow: {
    radius: 6.25,
    colors: { stroke: "#2c2e58", fill: "#ea8a7d80" },
  },
  vyse_ult: {
    radius: 32.5,
    colors: { stroke: "#2c2e58", fill: "#bfc0d780" },
  },
  waylay_slow: {
    radius: 6,
    colors: { stroke: "#a8a8ce", fill: "#feffb380" },
  },
};
