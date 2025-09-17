import {
  CanvasCircleIcon,
  CanvasDoubleLineIcon,
  CanvasIcon,
  CanvasIconProps,
  CanvasLineIcon,
  CanvasXIcon,
} from "@/components/canvas-icons";
import {
  ADJUSTABLE_LINE_ABILITY_CONFIGS,
  CIRCLE_ABILITY_CONFIGS,
  DOUBLE_LINE_ABILITY_CONFIGS,
  LINE_ABILITY_CONFIGS,
  X_LINE_ABILITY_CONFIGS,
} from "@/lib/consts";
import { AbilityAction } from "@/lib/types";
import {
  isAdjustableLineAbility,
  isCircleAbility,
  isDoubleLineAbility,
  isLineAbility,
  isXLineAbility,
  mToPixels,
} from "@/lib/utils";
import { ReactNode } from "react";

interface AbilityIconProps extends CanvasIconProps {
  action: AbilityAction;
  rotation?: number;
}

const getCircleConfig = (action: AbilityAction) => {
  if (isCircleAbility(action)) {
    return {
      radius: CIRCLE_ABILITY_CONFIGS[action].radius,
      colors: CIRCLE_ABILITY_CONFIGS[action].colors,
      activeRadius: CIRCLE_ABILITY_CONFIGS[action].activeRadius,
    };
  }

  throw new Error(`${action} is not a circle ability`);
};

const renderCircleAbility = (props: AbilityIconProps) => {
  const { radius, colors, activeRadius } = getCircleConfig(props.action);

  return (
    <CanvasCircleIcon
      circleRadius={mToPixels(radius)}
      stroke={colors.stroke}
      fill={colors.fill}
      boxRadius={props.radius}
      outerCircleRadius={activeRadius ? mToPixels(activeRadius) : undefined}
      {...props}
    />
  );
};

const getAdjustableLineConfig = (action: AbilityAction) => {
  if (isAdjustableLineAbility(action)) {
    return {
      lineLength: ADJUSTABLE_LINE_ABILITY_CONFIGS[action].lineLength,
      stroke: ADJUSTABLE_LINE_ABILITY_CONFIGS[action].stroke,
      strokeWidth: ADJUSTABLE_LINE_ABILITY_CONFIGS[action].strokeWidth,
      iconPosition: ADJUSTABLE_LINE_ABILITY_CONFIGS[action].iconPosition,
      minLength: ADJUSTABLE_LINE_ABILITY_CONFIGS[action].minLength,
      maxLength: ADJUSTABLE_LINE_ABILITY_CONFIGS[action].maxLength,
      iconLineGap: ADJUSTABLE_LINE_ABILITY_CONFIGS[action].iconLineGap,
      showThickEnd: ADJUSTABLE_LINE_ABILITY_CONFIGS[action].showThickEnd,
      thickEndLength: ADJUSTABLE_LINE_ABILITY_CONFIGS[action].thickEndLength,
      thickEndWidth: ADJUSTABLE_LINE_ABILITY_CONFIGS[action].thickEndWidth,
      thickEndStroke: ADJUSTABLE_LINE_ABILITY_CONFIGS[action].thickEndStroke,
    };
  }

  throw new Error(`${action} is not an adjustable line ability`);
};

const renderAdjustableLineAbility = (props: AbilityIconProps) => {
  const {
    lineLength,
    stroke,
    iconPosition,
    strokeWidth,
    minLength,
    maxLength,
    iconLineGap,
    showThickEnd,
    thickEndLength,
    thickEndWidth,
    thickEndStroke,
  } = getAdjustableLineConfig(props.action);

  return (
    <CanvasLineIcon
      handleMode="length"
      lineLength={mToPixels(lineLength)}
      stroke={stroke}
      iconPosition={iconPosition}
      lineStrokeWidth={strokeWidth ? mToPixels(strokeWidth) : undefined}
      minLength={minLength ? mToPixels(minLength) : undefined}
      maxLength={mToPixels(maxLength)}
      iconLineGap={iconLineGap ? mToPixels(iconLineGap) : undefined}
      showThickEnd={showThickEnd}
      thickEndLength={thickEndLength ? mToPixels(thickEndLength) : undefined}
      thickEndWidth={thickEndWidth ? mToPixels(thickEndWidth) : undefined}
      thickEndStroke={thickEndStroke}
      {...props}
    />
  );
};

const getLineConfig = (action: AbilityAction) => {
  if (isLineAbility(action)) {
    return {
      lineLength: LINE_ABILITY_CONFIGS[action].lineLength,
      stroke: LINE_ABILITY_CONFIGS[action].stroke,
      strokeWidth: LINE_ABILITY_CONFIGS[action].strokeWidth,
      iconPosition: LINE_ABILITY_CONFIGS[action].iconPosition,
      rotationHandleDistance:
        LINE_ABILITY_CONFIGS[action].rotationHandleDistance,
      iconLineGap: LINE_ABILITY_CONFIGS[action].iconLineGap,
      showThickEnd: LINE_ABILITY_CONFIGS[action].showThickEnd,
      thickEndLength: LINE_ABILITY_CONFIGS[action].thickEndLength,
      thickEndWidth: LINE_ABILITY_CONFIGS[action].thickEndWidth,
      thickEndStroke: LINE_ABILITY_CONFIGS[action].thickEndStroke,
    };
  }

  throw new Error(`${action} is not a line ability`);
};

const renderLineAbility = (props: AbilityIconProps) => {
  const {
    lineLength,
    stroke,
    iconPosition,
    strokeWidth,
    rotationHandleDistance,
    iconLineGap,
    showThickEnd,
    thickEndLength,
    thickEndWidth,
    thickEndStroke,
  } = getLineConfig(props.action);

  return (
    <CanvasLineIcon
      lineLength={mToPixels(lineLength)}
      stroke={stroke}
      iconPosition={iconPosition}
      lineStrokeWidth={strokeWidth ? mToPixels(strokeWidth) : undefined}
      rotationHandleDistance={
        rotationHandleDistance ? rotationHandleDistance : undefined
      }
      iconLineGap={iconLineGap ? mToPixels(iconLineGap) : undefined}
      showThickEnd={showThickEnd}
      thickEndLength={thickEndLength ? mToPixels(thickEndLength) : undefined}
      thickEndWidth={thickEndWidth ? mToPixels(thickEndWidth) : undefined}
      thickEndStroke={thickEndStroke}
      {...props}
    />
  );
};

const getDoubleLineConfig = (action: AbilityAction) => {
  if (isDoubleLineAbility(action)) {
    return {
      lineLength: DOUBLE_LINE_ABILITY_CONFIGS[action].lineLength,
      stroke: DOUBLE_LINE_ABILITY_CONFIGS[action].stroke,
      strokeWidth: DOUBLE_LINE_ABILITY_CONFIGS[action].strokeWidth,
      iconPosition: DOUBLE_LINE_ABILITY_CONFIGS[action].iconPosition,
      iconLineGap: DOUBLE_LINE_ABILITY_CONFIGS[action].iconLineGap,
      showThickEnd: DOUBLE_LINE_ABILITY_CONFIGS[action].showThickEnd,
      thickEndLength: DOUBLE_LINE_ABILITY_CONFIGS[action].thickEndLength,
      thickEndWidth: DOUBLE_LINE_ABILITY_CONFIGS[action].thickEndWidth,
      thickEndStroke: DOUBLE_LINE_ABILITY_CONFIGS[action].thickEndStroke,
      lineGap: DOUBLE_LINE_ABILITY_CONFIGS[action].lineGap,
      minLength: DOUBLE_LINE_ABILITY_CONFIGS[action].minLength,
      maxLength: DOUBLE_LINE_ABILITY_CONFIGS[action].maxLength,
    };
  }

  throw new Error(`${action} is not a double line ability`);
};

const renderDoubleLineAbility = (props: AbilityIconProps) => {
  const {
    lineLength,
    stroke,
    iconPosition,
    strokeWidth,
    minLength,
    maxLength,
    iconLineGap,
    showThickEnd,
    thickEndLength,
    thickEndWidth,
    thickEndStroke,
    lineGap,
  } = getDoubleLineConfig(props.action);

  return (
    <CanvasDoubleLineIcon
      handleMode="length"
      lineLength={mToPixels(lineLength)}
      stroke={stroke}
      iconPosition={iconPosition}
      lineStrokeWidth={strokeWidth ? mToPixels(strokeWidth) : undefined}
      minLength={minLength ? mToPixels(minLength) : undefined}
      maxLength={mToPixels(maxLength)}
      iconLineGap={iconLineGap ? mToPixels(iconLineGap) : undefined}
      showThickEnd={showThickEnd}
      thickEndLength={thickEndLength ? mToPixels(thickEndLength) : undefined}
      thickEndWidth={thickEndWidth ? mToPixels(thickEndWidth) : undefined}
      thickEndStroke={thickEndStroke}
      lineGap={lineGap ? mToPixels(lineGap) : undefined}
      {...props}
    />
  );
};

const getXLineConfig = (action: AbilityAction) => {
  if (isXLineAbility(action)) {
    return {
      lineLength: X_LINE_ABILITY_CONFIGS[action].lineLength,
      stroke: X_LINE_ABILITY_CONFIGS[action].stroke,
      strokeWidth: X_LINE_ABILITY_CONFIGS[action].strokeWidth,
      endCircleRadius: X_LINE_ABILITY_CONFIGS[action].endCircleRadius,
      endCircleColor: X_LINE_ABILITY_CONFIGS[action].endCircleColor,
      rotationHandleDistance:
        X_LINE_ABILITY_CONFIGS[action].rotationHandleDistance,
    };
  }

  throw new Error(`${action} is not an X line ability`);
};

const renderXLineAbility = (props: AbilityIconProps) => {
  const {
    lineLength,
    stroke,
    strokeWidth,
    endCircleRadius,
    endCircleColor,
    rotationHandleDistance,
  } = getXLineConfig(props.action);

  return (
    <CanvasXIcon
      lineLength={mToPixels(lineLength)}
      stroke={stroke}
      lineStrokeWidth={strokeWidth ? mToPixels(strokeWidth) : undefined}
      endCircleRadius={endCircleRadius ? mToPixels(endCircleRadius) : undefined}
      endCircleColor={endCircleColor}
      rotationHandleDistance={rotationHandleDistance}
      {...props}
    />
  );
};

const actionRenderers: Record<
  AbilityAction,
  (props: AbilityIconProps) => ReactNode
> = {
  icon: (props) => <CanvasIcon {...props} />,
  astra_ult: renderLineAbility,
  astra_stun: renderCircleAbility,
  astra_suck: renderCircleAbility,
  astra_smoke: renderCircleAbility,
  breach_aftershock: renderLineAbility,
  breach_stun: renderAdjustableLineAbility,
  breach_ult: renderLineAbility,
  brim_smoke: renderCircleAbility,
  brim_stim: renderCircleAbility,
  brim_molly: renderCircleAbility,
  brim_ult: renderCircleAbility,
  chamber_trip: renderCircleAbility,
  chamber_tp: renderCircleAbility,
  clove_meddle: renderCircleAbility,
  clove_smoke: renderCircleAbility,
  cypher_cage: renderCircleAbility,
  cypher_trip: renderAdjustableLineAbility,
  deadlock_net: renderCircleAbility,
  deadlock_trip: renderLineAbility,
  deadlock_wall: renderXLineAbility,
  fade_eye: renderCircleAbility,
  fade_seize: renderCircleAbility,
  fade_ult: renderLineAbility,
  gekko_molly: renderCircleAbility,
  harbor_cascade_wall: renderAdjustableLineAbility,
  harbor_cove: renderCircleAbility,
  harbor_ult: renderCircleAbility,
  iso_wall: renderLineAbility,
  iso_vuln: renderLineAbility,
  iso_ult: renderLineAbility,
  jett_smoke: renderCircleAbility,
  kayo_molly: renderCircleAbility,
  kayo_knife: renderCircleAbility,
  kayo_ult: renderCircleAbility,
  kj_alarmbot: renderCircleAbility,
  kj_molly: renderCircleAbility,
  kj_ult: renderCircleAbility,
  neon_stun: renderCircleAbility,
  neon_wall: renderDoubleLineAbility,
  omen_blind: renderLineAbility,
  omen_smoke: renderCircleAbility,
  phoenix_molly: renderCircleAbility,
  sage_wall: renderLineAbility,
  skye_heal: renderCircleAbility,
  sova_shock_dart: renderCircleAbility,
  sova_dart: renderCircleAbility,
  sova_ult: renderLineAbility,
  tejo_drone: renderCircleAbility,
  tejo_stun: renderCircleAbility,
  tejo_ult: renderLineAbility,
  tejo_missile: renderCircleAbility,
  viper_molly: renderCircleAbility,
  viper_smoke: renderCircleAbility,
  viper_wall: renderLineAbility,
  vyse_slow: renderCircleAbility,
  vyse_wall: renderLineAbility,
  vyse_ult: renderCircleAbility,
  waylay_slow: renderCircleAbility,
  waylay_ult: renderLineAbility,
};

export const AbilityIcon = ({ action, ...props }: AbilityIconProps) => {
  const renderAction = actionRenderers[action];

  if (!renderAction) {
    console.warn(`Unknown action: ${action}`);
    return null;
  }

  return renderAction({ action, ...props });
};
