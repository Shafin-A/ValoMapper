import { KonvaEventObject } from "konva/lib/Node";
import DraggableIcon from "./draggable-icon";
import { ReactNode } from "react";
import { AbilityAction } from "@/lib/types";
import DraggableCircleIcon from "./draggable-circle-icon";
import { mToPixels } from "@/lib/utils";

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

type ActionRendererProps = Omit<AbilityIconProps, "action">;

const actionRenderers: Record<
  AbilityAction,
  (props: ActionRendererProps) => ReactNode
> = {
  draggable: (props) => <DraggableIcon {...props} />,
  harbor_cove: (props) => (
    <DraggableCircleIcon
      circleRadius={mToPixels(4.5)}
      stroke="#f2d6a3"
      fill="#136c6b80"
      {...props}
    />
  ),
};

const AbilityIcon = ({ action, ...props }: AbilityIconProps) => {
  const renderAction = actionRenderers[action];

  if (!renderAction) {
    console.warn(`Unknown action: ${action}`);
    return null;
  }

  return renderAction(props);
};

export default AbilityIcon;
