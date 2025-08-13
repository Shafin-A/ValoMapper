import { Group, Image as KonvaImage, Rect } from "react-konva";
import useImage from "use-image";
import type { KonvaEventObject } from "konva/lib/Node";

interface AgentIconProps {
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

const AgentIcon = ({
  isAlly,
  x,
  y,
  src,
  draggable = true,
  onDragEnd,
  width,
  height,
  radius,
  opacity,
  allyColor,
  enemyColor,
}: AgentIconProps) => {
  const [image] = useImage(src);

  return (
    <Group x={x} y={y} draggable={draggable} onDragEnd={onDragEnd}>
      <Rect
        width={width}
        height={height}
        fill={isAlly ? allyColor : enemyColor}
        cornerRadius={radius}
        opacity={opacity}
      />
      <KonvaImage
        image={image}
        width={width}
        height={height}
        cornerRadius={radius}
      />
    </Group>
  );
};

export default AgentIcon;
