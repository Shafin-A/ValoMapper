import { Group, Image as KonvaImage, Circle, Rect } from "react-konva";
import useImage from "use-image";
import type { KonvaEventObject } from "konva/lib/Node";

interface DraggableCircleIconProps {
  isAlly: boolean;
  x: number;
  y: number;
  src: string;
  draggable?: boolean;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
  opacity: number;
  radius: number;
  circleRadius: number;
  allyColor: string;
  enemyColor: string;
  strokeWidth?: number;
  stroke: string;
  fill: string;
}

const DraggableCircleIcon = ({
  isAlly,
  x,
  y,
  src,
  draggable = true,
  onDragEnd,
  opacity,
  radius,
  circleRadius,
  allyColor,
  enemyColor,
  strokeWidth = 2,
  stroke,
  fill,
}: DraggableCircleIconProps) => {
  const [image] = useImage(src);
  const outerRadius = circleRadius;

  return (
    <Group x={x} y={y} draggable={draggable} onDragEnd={onDragEnd}>
      <Circle
        radius={outerRadius}
        strokeWidth={strokeWidth}
        fill={fill}
        stroke={stroke}
        offsetX={-12.5}
        offsetY={-12.5}
      />
      <Rect
        width={25}
        height={25}
        fill={isAlly ? allyColor : enemyColor}
        cornerRadius={radius}
        opacity={opacity}
      />
      <KonvaImage image={image} width={25} height={25} cornerRadius={radius} />
    </Group>
  );
};

export default DraggableCircleIcon;
