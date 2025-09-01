import { KonvaEventObject } from "konva/lib/Node";
import DraggableIcon from "./draggable-icon";
import { ReactNode } from "react";
import { AbilityAction } from "@/lib/types";
import DraggableCircleIcon from "./draggable-circle-icon";
import { isCircleAbility, mToPixels } from "@/lib/utils";
import { CIRCLE_ABILITY_CONFIG } from "@/lib/consts";

interface AbilityIconProps {
  action: AbilityAction;
  isAlly: boolean;
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
      radius: CIRCLE_ABILITY_CONFIG[action].radius,
      colors: CIRCLE_ABILITY_CONFIG[action].colors,
    };
  }

  throw new Error(`${action} is not a circle ability`);
};

const renderCircleAbility = (props: AbilityIconProps) => {
  const { radius, colors } = getCircleConfig(props.action);
  return (
    <DraggableCircleIcon
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
  draggable: (props) => <DraggableIcon {...props} />,
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
  harbor_cove: renderCircleAbility,
};

const AbilityIcon = ({ action, ...props }: AbilityIconProps) => {
  const renderAction = actionRenderers[action];

  if (!renderAction) {
    console.warn(`Unknown action: ${action}`);
    return null;
  }

  return renderAction({ action, ...props });
};

export default AbilityIcon;
