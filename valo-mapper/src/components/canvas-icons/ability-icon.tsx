import { KonvaEventObject } from "konva/lib/Node";
import { ReactNode } from "react";
import { AbilityAction } from "@/lib/types";
import { isCircleAbility, mToPixels } from "@/lib/utils";
import { CIRCLE_ABILITY_CONFIGS } from "@/lib/consts";
import { CanvasCircleIcon } from "./canvas-circle-icon";
import { CanvasIcon } from "./canvas-icon";

interface AbilityIconProps {
  id: string;
  isAlly: boolean;
  action: AbilityAction;
  x: number;
  y: number;
  src: string;
  draggable?: boolean;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
  width: number;
  height: number;
  opacity: number;
  radius: number;
  allyColor: string;
  enemyColor: string;
}

const getCircleConfig = (action: AbilityAction) => {
  if (isCircleAbility(action)) {
    return {
      radius: CIRCLE_ABILITY_CONFIGS[action].radius,
      colors: CIRCLE_ABILITY_CONFIGS[action].colors,
    };
  }

  throw new Error(`${action} is not a circle ability`);
};

const renderCircleAbility = (props: AbilityIconProps) => {
  const { radius, colors } = getCircleConfig(props.action);

  return (
    <CanvasCircleIcon
      outerRadius={mToPixels(radius)}
      stroke={colors.stroke}
      fill={colors.fill}
      {...props}
    />
  );
};

const actionRenderers: Record<
  AbilityAction,
  (props: AbilityIconProps) => ReactNode
> = {
  icon: (props) => <CanvasIcon {...props} />,
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
