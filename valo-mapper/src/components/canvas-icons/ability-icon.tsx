import { ReactNode } from "react";
import { AbilityAction } from "@/lib/types";
import { isCircleAbility, isLineAbility, mToPixels } from "@/lib/utils";
import { CIRCLE_ABILITY_CONFIGS, LINE_ABILITY_CONFIGS } from "@/lib/consts";
import {
  CanvasIcon,
  CanvasIconProps,
  CanvasCircleIcon,
} from "@/components/canvas-icons";
import { CanvasLineIcon } from "./canvas-line-icon";

interface AbilityIconProps extends CanvasIconProps {
  action: AbilityAction;
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

const getLineConfig = (action: AbilityAction) => {
  if (isLineAbility(action)) {
    return {
      lineLength: LINE_ABILITY_CONFIGS[action].lineLength,
      stroke: LINE_ABILITY_CONFIGS[action].stroke,
      strokeWidth: LINE_ABILITY_CONFIGS[action].strokeWidth,
      rotation: LINE_ABILITY_CONFIGS[action].rotation,
    };
  }

  throw new Error(`${action} is not a line ability`);
};

const renderLineAbility = (props: AbilityIconProps) => {
  const { lineLength, stroke, rotation, strokeWidth } = getLineConfig(
    props.action
  );

  return (
    <CanvasLineIcon
      lineLength={mToPixels(lineLength)}
      stroke={stroke}
      rotation={rotation}
      strokeWidth={strokeWidth}
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
  brim_smoke: renderCircleAbility,
  brim_stim: renderCircleAbility,
  brim_molly: renderCircleAbility,
  brim_ult: renderCircleAbility,
  chamber_trip: renderCircleAbility,
  chamber_tp: renderCircleAbility,
  clove_meddle: renderCircleAbility,
  clove_smoke: renderCircleAbility,
  cypher_cage: renderCircleAbility,
  deadlock_net: renderCircleAbility,
  fade_eye: renderCircleAbility,
  fade_seize: renderCircleAbility,
  gekko_molly: renderCircleAbility,
  harbor_cove: renderCircleAbility,
  harbor_ult: renderCircleAbility,
  jett_smoke: renderCircleAbility,
  kayo_molly: renderCircleAbility,
  kayo_knife: renderCircleAbility,
  kayo_ult: renderCircleAbility,
  kj_alarmbot: renderCircleAbility,
  kj_molly: renderCircleAbility,
  kj_ult: renderCircleAbility,
  neon_stun: renderCircleAbility,
  omen_smoke: renderCircleAbility,
  phoenix_molly: renderCircleAbility,
  skye_heal: renderCircleAbility,
  sova_shock_dart: renderCircleAbility,
  sova_dart: renderCircleAbility,
  tejo_drone: renderCircleAbility,
  tejo_stun: renderCircleAbility,
  tejo_missile: renderCircleAbility,
  viper_molly: renderCircleAbility,
  viper_smoke: renderCircleAbility,
  viper_wall: renderLineAbility,
  vyse_slow: renderCircleAbility,
  vyse_ult: renderCircleAbility,
  waylay_slow: renderCircleAbility,
};

export const AbilityIcon = ({ action, ...props }: AbilityIconProps) => {
  const renderAction = actionRenderers[action];

  if (!renderAction) {
    console.warn(`Unknown action: ${action}`);
    return null;
  }

  return renderAction({ action, ...props });
};
