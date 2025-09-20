import { ArcAbility } from "@/lib/types";

export const ARC_ABILITY_CONFIGS: Record<
  ArcAbility,
  {
    arcRadius: number;
    fov: number;
    outerCircleRadius: number;
  }
> = {
  kj_turret: {
    arcRadius: 50,
    fov: 100,
    outerCircleRadius: 40,
  },
};
