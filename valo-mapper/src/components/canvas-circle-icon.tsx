import { Group, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useRef } from "react";
import Konva from "konva";
import { CanvasIcon } from "./canvas-icon";

interface CanvasCircleIconProps {
  isAlly: boolean;
  x: number;
  y: number;
  src: string;
  draggable?: boolean;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
  opacity: number;
  radius: number;
  outerRadius: number;
  allyColor: string;
  enemyColor: string;
  strokeWidth?: number;
  stroke: string;
  fill: string;
}

export const CanvasCircleIcon = ({
  isAlly,
  x,
  y,
  src,
  draggable = true,
  onDragEnd,
  opacity,
  radius,
  outerRadius,
  allyColor,
  enemyColor,
  strokeWidth = 2,
  stroke,
  fill,
}: CanvasCircleIconProps) => {
  const groupRef = useRef<Konva.Group>(null);

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable={draggable}
      offsetX={-12.5}
      offsetY={-12.5}
      onDragEnd={onDragEnd}
    >
      <Circle
        radius={outerRadius}
        strokeWidth={strokeWidth}
        fill={fill}
        stroke={stroke}
        offsetX={12.5}
        offsetY={12.5}
      />
      <CanvasIcon
        isAlly={isAlly}
        x={0}
        y={0}
        src={src}
        draggable={false}
        width={25}
        height={25}
        radius={radius}
        opacity={opacity}
        allyColor={allyColor}
        enemyColor={enemyColor}
      />
    </Group>
  );
};
