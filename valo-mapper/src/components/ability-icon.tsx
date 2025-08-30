import { KonvaEventObject } from "konva/lib/Node";
import DraggableIcon from "./draggable-icon";
import { ReactNode } from "react";
import { AbilityAction } from "@/lib/types";

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
  static: () => null, // To be implemented
  animated: () => null, // To be implemented
  interactive: () => null, // To be implemented
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
