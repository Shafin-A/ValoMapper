import {
  CanvasArcIcon,
  CanvasCircleIcon,
  CanvasCurvableLineIcon,
  CanvasDoubleLineIcon,
  CanvasIcon,
  CanvasIconProps,
  CanvasLineIcon,
  CanvasXIcon,
} from "@/components/canvas-icons";
import {
  ADJUSTABLE_LINE_ABILITY_CONFIGS,
  ARC_ABILITY_CONFIGS,
  CIRCLE_ABILITY_CONFIGS,
  CURVABLE_LINE_ABILITY_CONFIGS,
  DOUBLE_LINE_ABILITY_CONFIGS,
  LINE_ABILITY_CONFIGS,
  X_LINE_ABILITY_CONFIGS,
} from "@/lib/consts";
import { AbilityAction } from "@/lib/types";
import {
  isAdjustableLineAbility,
  isArcAbility,
  isCircleAbility,
  isCurvableLineAbility,
  isDoubleLineAbility,
  isLineAbility,
  isXLineAbility,
  mToPixels,
} from "@/lib/utils";
import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { ReactNode } from "react";

type InteractionData =
  | { currentRotation: number }
  | { currentRotation: number; currentLength: number }
  | { currentPath: Vector2d[] };

interface AbilityIconProps extends CanvasIconProps {
  action: AbilityAction;
  rotation?: number;
  currentPath?: Vector2d[];
  currentLength?: number;
  iconOnly?: boolean;
  showOuterCircle?: boolean;
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
  onInteractionEnd?: (data: InteractionData) => void;
}

const getConfig = <T,>(
  action: AbilityAction,
  configMap: Record<string, T>,
  validator: (action: AbilityAction) => boolean,
  abilityType: string,
): T => {
  if (!validator(action)) {
    throw new Error(`${action} is not a ${abilityType} ability`);
  }
  return configMap[action];
};

const renderCircleAbility = (props: AbilityIconProps): ReactNode => {
  const { radius, colors, activeRadius } = getConfig(
    props.action,
    CIRCLE_ABILITY_CONFIGS,
    isCircleAbility,
    "circle",
  );

  return (
    <CanvasCircleIcon
      showAbilityShape={!props.iconOnly}
      showOuterCircle={props.showOuterCircle}
      circleRadius={mToPixels(radius)}
      stroke={colors.stroke}
      fill={colors.fill}
      boxRadius={props.radius}
      outerCircleRadius={activeRadius ? mToPixels(activeRadius) : undefined}
      {...props}
    />
  );
};

const renderAdjustableLineAbility = (props: AbilityIconProps): ReactNode => {
  const config = getConfig(
    props.action,
    ADJUSTABLE_LINE_ABILITY_CONFIGS,
    isAdjustableLineAbility,
    "adjustable line",
  );

  return (
    <CanvasLineIcon
      showAbilityShape={!props.iconOnly}
      handleMode="length"
      lineLength={props.currentLength || mToPixels(config.lineLength)}
      stroke={config.stroke}
      iconPosition={config.iconPosition}
      lineStrokeWidth={
        config.strokeWidth ? mToPixels(config.strokeWidth) : undefined
      }
      minLength={config.minLength ? mToPixels(config.minLength) : undefined}
      maxLength={mToPixels(config.maxLength)}
      iconLineGap={
        config.iconLineGap ? mToPixels(config.iconLineGap) : undefined
      }
      showThickEnd={config.showThickEnd}
      thickEndLength={
        config.thickEndLength ? mToPixels(config.thickEndLength) : undefined
      }
      thickEndWidth={
        config.thickEndWidth ? mToPixels(config.thickEndWidth) : undefined
      }
      thickEndStroke={config.thickEndStroke}
      {...props}
    />
  );
};

const renderLineAbility = (props: AbilityIconProps): ReactNode => {
  const config = getConfig(
    props.action,
    LINE_ABILITY_CONFIGS,
    isLineAbility,
    "line",
  );

  return (
    <CanvasLineIcon
      showAbilityShape={!props.iconOnly}
      lineLength={mToPixels(config.lineLength)}
      stroke={config.stroke}
      iconPosition={config.iconPosition}
      lineStrokeWidth={
        config.strokeWidth ? mToPixels(config.strokeWidth) : undefined
      }
      rotationHandleDistance={config.rotationHandleDistance}
      iconLineGap={
        config.iconLineGap ? mToPixels(config.iconLineGap) : undefined
      }
      showThickEnd={config.showThickEnd}
      thickEndLength={
        config.thickEndLength ? mToPixels(config.thickEndLength) : undefined
      }
      thickEndWidth={
        config.thickEndWidth ? mToPixels(config.thickEndWidth) : undefined
      }
      thickEndStroke={config.thickEndStroke}
      {...props}
    />
  );
};

const renderDoubleLineAbility = (props: AbilityIconProps): ReactNode => {
  const config = getConfig(
    props.action,
    DOUBLE_LINE_ABILITY_CONFIGS,
    isDoubleLineAbility,
    "double line",
  );

  return (
    <CanvasDoubleLineIcon
      showAbilityShape={!props.iconOnly}
      handleMode="length"
      lineLength={props.currentLength || mToPixels(config.lineLength)}
      stroke={config.stroke}
      iconPosition={config.iconPosition}
      lineStrokeWidth={
        config.strokeWidth ? mToPixels(config.strokeWidth) : undefined
      }
      minLength={config.minLength ? mToPixels(config.minLength) : undefined}
      maxLength={mToPixels(config.maxLength)}
      iconLineGap={
        config.iconLineGap ? mToPixels(config.iconLineGap) : undefined
      }
      showThickEnd={config.showThickEnd}
      thickEndLength={
        config.thickEndLength ? mToPixels(config.thickEndLength) : undefined
      }
      thickEndWidth={
        config.thickEndWidth ? mToPixels(config.thickEndWidth) : undefined
      }
      thickEndStroke={config.thickEndStroke}
      lineGap={config.lineGap ? mToPixels(config.lineGap) : undefined}
      {...props}
    />
  );
};

const renderXLineAbility = (props: AbilityIconProps): ReactNode => {
  const config = getConfig(
    props.action,
    X_LINE_ABILITY_CONFIGS,
    isXLineAbility,
    "X line",
  );

  return (
    <CanvasXIcon
      showAbilityShape={!props.iconOnly}
      lineLength={mToPixels(config.lineLength)}
      stroke={config.stroke}
      lineStrokeWidth={
        config.strokeWidth ? mToPixels(config.strokeWidth) : undefined
      }
      endCircleRadius={
        config.endCircleRadius ? mToPixels(config.endCircleRadius) : undefined
      }
      endCircleColor={config.endCircleColor}
      rotationHandleDistance={config.rotationHandleDistance}
      {...props}
    />
  );
};

const renderCurvableLineAbility = (props: AbilityIconProps): ReactNode => {
  const config = getConfig(
    props.action,
    CURVABLE_LINE_ABILITY_CONFIGS,
    isCurvableLineAbility,
    "curvable line",
  );

  return (
    <CanvasCurvableLineIcon
      showAbilityShape={!props.iconOnly}
      maxDistance={mToPixels(config.maxDistance)}
      stroke={config.stroke}
      initialPath={props.currentPath}
      {...props}
    />
  );
};

const renderArcAbility = (props: AbilityIconProps): ReactNode => {
  const config = getConfig(
    props.action,
    ARC_ABILITY_CONFIGS,
    isArcAbility,
    "arc",
  );

  const isVisionCone =
    props.action === "vision_cone_30" ||
    props.action === "vision_cone_60" ||
    props.action === "vision_cone_90";

  return (
    <CanvasArcIcon
      showAbilityShape={!props.iconOnly}
      showOuterCircle={props.showOuterCircle}
      boxRadius={props.radius}
      arcRadius={props.currentLength || mToPixels(config.arcRadius)}
      fov={config.fov}
      fill={config.fill || (props.isAlly ? props.allyColor : props.enemyColor)}
      useFillGradient={config.useFillGradient !== false}
      showOuterArc={config.showOuterArc}
      outerArcThickness={
        config.outerArcThickness
          ? mToPixels(config.outerArcThickness)
          : undefined
      }
      outerArcFill={config.outerArcFill}
      outerArcOpacity={config.outerArcOpacity}
      outerCircleRadius={
        config.outerCircleRadius
          ? mToPixels(config.outerCircleRadius)
          : undefined
      }
      rotationHandleDistance={config.rotationHandleDistance}
      allowLengthAdjustment={isVisionCone}
      {...props}
    />
  );
};

const ABILITY_RENDERERS: Record<
  AbilityAction,
  (props: AbilityIconProps) => ReactNode
> = {
  icon: (props) => <CanvasIcon {...props} />,

  // Astra
  astra_ult: renderLineAbility,
  astra_stun: renderCircleAbility,
  astra_suck: renderCircleAbility,
  astra_smoke: renderCircleAbility,

  // Breach
  breach_aftershock: renderLineAbility,
  breach_stun: renderAdjustableLineAbility,
  breach_ult: renderLineAbility,

  // Brimstone
  brim_smoke: renderCircleAbility,
  brim_stim: renderCircleAbility,
  brim_molly: renderCircleAbility,
  brim_ult: renderCircleAbility,

  // Chamber
  chamber_trip: renderCircleAbility,
  chamber_tp: renderCircleAbility,

  // Clove
  clove_meddle: renderCircleAbility,
  clove_smoke: renderCircleAbility,

  // Cypher
  cypher_cage: renderCircleAbility,
  cypher_trip: renderAdjustableLineAbility,

  // Deadlock
  deadlock_net: renderCircleAbility,
  deadlock_trip: renderLineAbility,
  deadlock_wall: renderXLineAbility,

  // Fade
  fade_eye: renderCircleAbility,
  fade_seize: renderCircleAbility,
  fade_ult: renderLineAbility,

  // Gekko
  gekko_molly: renderCircleAbility,

  // Harbor
  harbor_blind: renderCircleAbility,
  harbor_cove: renderCircleAbility,
  harbor_wall: renderCurvableLineAbility,
  harbor_ult: renderLineAbility,

  // Iso
  iso_wall: renderLineAbility,
  iso_vuln: renderLineAbility,
  iso_ult: renderLineAbility,

  // Jett
  jett_smoke: renderCircleAbility,

  // KAY/O
  kayo_molly: renderCircleAbility,
  kayo_knife: renderCircleAbility,
  kayo_ult: renderCircleAbility,

  // Killjoy
  kj_alarmbot: renderCircleAbility,
  kj_molly: renderCircleAbility,
  kj_turret: renderArcAbility,
  kj_ult: renderCircleAbility,

  // Miks
  miks_heal: renderCircleAbility,
  miks_stun: renderCircleAbility,
  miks_smoke: renderCircleAbility,
  miks_ult: renderArcAbility,

  // Neon
  neon_stun: renderCircleAbility,
  neon_wall: renderDoubleLineAbility,

  // Omen
  omen_blind: renderLineAbility,
  omen_smoke: renderCircleAbility,

  // Phoenix
  phoenix_molly: renderCircleAbility,
  phoenix_wall: renderCurvableLineAbility,

  // Sage
  sage_wall: renderLineAbility,

  // Skye
  skye_heal: renderCircleAbility,

  // Sova
  sova_shock_dart: renderCircleAbility,
  sova_dart: renderCircleAbility,
  sova_ult: renderLineAbility,

  // Tejo
  tejo_drone: renderCircleAbility,
  tejo_stun: renderCircleAbility,
  tejo_ult: renderLineAbility,
  tejo_missile: renderCircleAbility,

  //Veto
  veto_teleport: renderCircleAbility,
  veto_molly: renderCircleAbility,
  veto_interceptor: renderCircleAbility,

  // Viper
  viper_molly: renderCircleAbility,
  viper_smoke: renderCircleAbility,
  viper_wall: renderLineAbility,

  // Vyse
  vyse_slow: renderCircleAbility,
  vyse_wall: renderLineAbility,
  vyse_ult: renderCircleAbility,

  // Waylay
  waylay_slow: renderCircleAbility,
  waylay_ult: renderLineAbility,

  // Vision Cones
  vision_cone_30: renderArcAbility,
  vision_cone_60: renderArcAbility,
  vision_cone_90: renderArcAbility,
};

export const AbilityIcon = ({ action, ...props }: AbilityIconProps) => {
  const renderer = ABILITY_RENDERERS[action];

  if (!renderer) {
    console.warn(`Unknown action: ${action}`);
    return null;
  }

  return renderer({ action, ...props });
};
