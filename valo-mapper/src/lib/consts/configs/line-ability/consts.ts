import {
  AdjustableLineAbility,
  DoubleLineAbility,
  LineAbility,
  XLineAbility,
} from "@/lib/types";

export const X_LINE_ABILITY_CONFIGS: Record<
  XLineAbility,
  {
    stroke: string;
    lineLength: number;
    strokeWidth?: number;
    iconLineGap?: number;
    endCircleRadius?: number;
    endCircleColor?: string;
    rotationHandleDistance?: number;
  }
> = {
  deadlock_wall: {
    lineLength: 20,
    stroke: "#60c8ff",
    endCircleColor: "#60c8ff",
    rotationHandleDistance: 100,
  },
};

export const DOUBLE_LINE_ABILITY_CONFIGS: Record<
  DoubleLineAbility,
  {
    stroke: string;
    iconPosition?: "start" | "middle";
    lineLength: number;
    strokeWidth?: number;
    minLength?: number;
    maxLength: number;
    iconLineGap?: number;
    showThickEnd?: boolean;
    thickEndLength?: number;
    thickEndWidth?: number;
    thickEndStroke?: string;
    lineGap?: number;
  }
> = {
  neon_wall: {
    stroke: "#4eacee",
    lineLength: 12,
    minLength: 8,
    maxLength: 46.5,
    lineGap: 3.5,
  },
};

export const ADJUSTABLE_LINE_ABILITY_CONFIGS: Record<
  AdjustableLineAbility,
  {
    stroke: string;
    iconPosition?: "start" | "middle";
    lineLength: number;
    strokeWidth: number;
    minLength?: number;
    maxLength: number;
    iconLineGap?: number;
    showThickEnd?: boolean;
    thickEndLength?: number;
    thickEndWidth?: number;
    thickEndStroke?: string;
  }
> = {
  breach_stun: {
    stroke: "#ffde2180",
    lineLength: 12,
    strokeWidth: 7.5,
    minLength: 8,
    maxLength: 56,
    iconLineGap: 8,
  },
  cypher_trip: {
    stroke: "#ffffffb3",
    lineLength: 7,
    strokeWidth: 0.5,
    minLength: 4,
    maxLength: 15,
  },
  harbor_cascade_wall: {
    showThickEnd: true,
    thickEndLength: 1,
    thickEndStroke: "#5c98a1",
    stroke: "#5c98a180",
    lineLength: 12,
    strokeWidth: 9.75,
    minLength: 2,
    maxLength: 35,
    iconLineGap: 4,
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
    iconLineGap?: number;
    showThickEnd?: boolean;
    thickEndLength?: number;
    thickEndWidth?: number;
    thickEndStroke?: string;
  }
> = {
  astra_ult: {
    lineLength: 200,
    stroke: "#4f0076",
    iconPosition: "middle",
  },
  breach_aftershock: {
    stroke: "#ffde2180",
    lineLength: 10,
    strokeWidth: 6,
    rotationHandleDistance: 80,
  },
  breach_ult: {
    stroke: "#ffde2180",
    lineLength: 32,
    strokeWidth: 23,
    iconLineGap: 8,
    rotationHandleDistance: 200,
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
  iso_wall: {
    lineLength: 27.5,
    stroke: "#4d43aa80",
    strokeWidth: 5.25,
    showThickEnd: true,
    thickEndLength: 2,
    thickEndStroke: "#4d43aa",
    iconLineGap: 5,
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
