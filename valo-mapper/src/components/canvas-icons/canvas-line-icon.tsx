import { Group, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useRef } from "react";
import Konva from "konva";
import { CanvasIcon, CanvasIconProps } from "@/components/canvas-icons";

interface CanvasLineIconProps extends CanvasIconProps {
  lineLength: number;
  strokeWidth?: number;
  stroke: string;
  rotation?: number;
}

export const CanvasLineIcon = ({
  id,
  isAlly,
  x,
  y,
  src,
  draggable = true,
  onDragEnd,
  opacity,
  radius,
  lineLength,
  allyColor,
  enemyColor,
  strokeWidth = 6,
  stroke,
  width,
  height,
  rotation = 0,
}: CanvasLineIconProps) => {
  const groupRef = useRef<Konva.Group>(null);

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!groupRef.current) return;
    const className = e.target.getClassName();
    if (className === "Line" || className === "Image") {
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

  const halfLength = lineLength / 2;
  const radians = (rotation * Math.PI) / 180;

  const startX = -halfLength * Math.cos(radians);
  const startY = -halfLength * Math.sin(radians);
  const endX = halfLength * Math.cos(radians);
  const endY = halfLength * Math.sin(radians);

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
      <Line
        points={[startX, startY, endX, endY]}
        strokeWidth={strokeWidth}
        stroke={stroke}
        listening={true}
      />
      <CanvasIcon
        id={id}
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
