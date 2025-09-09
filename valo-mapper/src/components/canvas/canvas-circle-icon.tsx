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
  width: number;
  height: number;
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
  width,
  height,
}: CanvasCircleIconProps) => {
  const groupRef = useRef<Konva.Group>(null);

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!groupRef.current) return;
    const className = e.target.getClassName();
    if (className === "Rect" || className === "Image") {
      groupRef.current.draggable(true);
    } else {
      groupRef.current.draggable(false);
    }
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (groupRef.current) {
      groupRef.current.draggable(draggable);
    }
    onDragEnd?.(e);
  };

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable={draggable}
      onMouseDown={handleMouseDown}
      onDragEnd={handleDragEnd}
    >
      <Circle
        radius={outerRadius}
        strokeWidth={strokeWidth}
        fill={fill}
        stroke={stroke}
      />
      <CanvasIcon
        isAlly={isAlly}
        x={0}
        y={0}
        src={src}
        draggable={false}
        width={width}
        height={height}
        radius={radius}
        opacity={opacity}
        allyColor={allyColor}
        enemyColor={enemyColor}
      />
    </Group>
  );
};
