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
  astra_ult: { lineLength: 200, stroke: "#4f0076", iconPosition: "middle" },
  viper_wall: { lineLength: 68, stroke: "#48a853", iconPosition: "start" },
};
