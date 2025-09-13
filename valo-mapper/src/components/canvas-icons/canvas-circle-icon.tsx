import { Group, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useRef } from "react";
import Konva from "konva";
import { CanvasIcon } from "./canvas-icon";

interface CanvasCircleIconProps {
  id: string;
  isAlly: boolean;
  x: number;
  y: number;
  src: string;
  draggable?: boolean;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
  opacity: number;
  boxRadius: number;
  circleRadius: number;
  outerCircleRadius?: number;
  allyColor: string;
  enemyColor: string;
  strokeWidth?: number;
  stroke: string;
  fill: string;
  width: number;
  height: number;
}

export const CanvasCircleIcon = ({
  id,
  isAlly,
  x,
  y,
  src,
  draggable = true,
  onDragEnd,
  opacity,
  boxRadius,
  circleRadius,
  outerCircleRadius,
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

  const handleDragStart = () => {
    if (groupRef.current) {
      groupRef.current.draggable(draggable);
      groupRef.current.opacity(0.7);
    }
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (groupRef.current) {
      groupRef.current.draggable(draggable);
      groupRef.current.opacity(1);
    }
    onDragEnd?.(e);
  };

  return (
    <Group
      id={id}
      ref={groupRef}
      x={x}
      y={y}
      draggable={draggable}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Circle
        radius={circleRadius}
        strokeWidth={strokeWidth}
        fill={fill}
        stroke={stroke}
        listening={false}
      />
      {outerCircleRadius && (
        <Circle
          radius={outerCircleRadius}
          strokeWidth={strokeWidth}
          stroke={"white"}
          opacity={0.3}
          listening={false}
        />
      )}
      <CanvasIcon
        id={id}
        isAlly={isAlly}
        x={0}
        y={0}
        src={src}
        draggable={false}
        width={width}
        height={height}
        radius={boxRadius}
        opacity={opacity}
        allyColor={allyColor}
        enemyColor={enemyColor}
      />
    </Group>
  );
};
