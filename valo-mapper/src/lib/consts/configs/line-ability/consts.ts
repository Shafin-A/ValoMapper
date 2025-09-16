import { AdjustableLineAbility, LineAbility } from "@/lib/types";

export const ADJUSTABLE_LINE_ABILITY_CONFIGS: Record<
  AdjustableLineAbility,
  {
    stroke: string;
    iconPosition?: "start" | "middle";
    lineLength: number;
    strokeWidth: number;
    minLength?: number;
    maxLength: number;
  }
> = {
  cypher_trip: {
    stroke: "#ffffffb3",
    lineLength: 7,
    strokeWidth: 0.5,
    minLength: 1,
    maxLength: 15,
  },
};

export const LINE_ABILITY_CONFIGS: Record<
  LineAbility,
  {
    lineLength: number;
    strokeWidth?: number;
    stroke: string;
    iconPosition?: "start" | "middle";
    rotationHandleDistance?: number;
  }
> = {
  astra_ult: {
    lineLength: 200,
    stroke: "#4f0076",
    iconPosition: "middle",
  },
  deadlock_trip: {
    lineLength: 9,
    stroke: "#60c8ff80",
    strokeWidth: 8,
    rotationHandleDistance: 100,
  },
  fade_ult: {
    lineLength: 40,
    stroke: "#00000080",
    strokeWidth: 24,
  },
  iso_vuln: {
    lineLength: 34.875,
    stroke: "#4d43aa80",
    strokeWidth: 6,
  },
  iso_ult: {
    lineLength: 48,
    stroke: "#4d43aa80",
    strokeWidth: 15,
  },
  omen_blind: {
    lineLength: 34.5,
    stroke: "#261c4a80",
    strokeWidth: 8.6,
  },
  sage_wall: {
    lineLength: 10.4,
    strokeWidth: 1.5,
    stroke: "#27e8a2",
    iconPosition: "middle",
    rotationHandleDistance: 100,
  },
  sova_ult: {
    lineLength: 66,
    stroke: "#63edff80",
    strokeWidth: 3.52,
  },
  tejo_ult: {
    lineLength: 32,
    stroke: "#b8864980",
    strokeWidth: 10,
  },
  viper_wall: {
    lineLength: 68,
    stroke: "#48a853",
  },
  vyse_wall: {
    lineLength: 12,
    strokeWidth: 1,
    stroke: "#353237",
    iconPosition: "middle",
    rotationHandleDistance: 100,
  },
  waylay_ult: {
    lineLength: 36,
    stroke: "#94c36580",
    strokeWidth: 18,
  },
};
