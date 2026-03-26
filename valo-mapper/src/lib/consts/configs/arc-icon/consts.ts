import { ArcAbility } from "@/lib/types";

interface ArcAbilityConfig {
  arcRadius: number;
  fov: number;
  outerCircleRadius?: number;
  useFillGradient?: boolean;
  fill?: string;
  showOuterArc?: boolean;
  outerArcThickness?: number;
  outerArcFill?: string;
  outerArcOpacity?: number;
  rotationHandleDistance?: number;
}

export const ARC_ABILITY_CONFIGS: Record<ArcAbility, ArcAbilityConfig> = {
  kj_turret: {
    arcRadius: 8,
    fov: 100,
    outerCircleRadius: 42.5,
    useFillGradient: true,
  },
  miks_ult: {
    arcRadius: 44.5,
    fov: 60,
    useFillGradient: false,
    fill: "#541a3a80",
    showOuterArc: true,
    outerArcThickness: 1,
    outerArcFill: "#d39c5480",
    outerArcOpacity: 1,
    rotationHandleDistance: 150,
  },
  vision_cone_30: {
    arcRadius: 10,
    fov: 30,
    useFillGradient: true,
    fill: "#ffffff",
    rotationHandleDistance: 70,
  },
  vision_cone_60: {
    arcRadius: 12,
    fov: 60,
    useFillGradient: true,
    fill: "#ffffff",
    rotationHandleDistance: 80,
  },
  vision_cone_90: {
    arcRadius: 14,
    fov: 90,
    useFillGradient: true,
    fill: "#ffffff",
    rotationHandleDistance: 90,
  },
};
