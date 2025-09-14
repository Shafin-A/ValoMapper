import { LineAbility } from "@/lib/types";

export const LINE_ABILITY_CONFIGS: Record<
  LineAbility,
  {
    lineLength: number;
    strokeWidth?: number;
    stroke: string;
    iconPosition?: "start" | "middle";
  }
> = {
  astra_ult: {
    lineLength: 200,
    stroke: "#4f0076",
    iconPosition: "middle",
  },
  fade_ult: {
    lineLength: 40,
    stroke: "#00000080",
    strokeWidth: 24,
  },
  sova_ult: {
    lineLength: 66,
    stroke: "#63edff80",
    strokeWidth: 3.52,
  },
  viper_wall: {
    lineLength: 68,
    stroke: "#48a853",
  },
};
