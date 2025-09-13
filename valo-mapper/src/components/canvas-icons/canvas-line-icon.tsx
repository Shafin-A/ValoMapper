import { CanvasIcon, CanvasIconProps } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import {
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
} from "@/lib/utils";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useRef, useState } from "react";
import { Circle, Group, Line } from "react-konva";

type IconPosition = "middle" | "start";

interface CanvasLineIconProps extends CanvasIconProps {
  lineLength: number;
  lineStrokeWidth?: number;
  stroke: string;
  rotation?: number;
  onRotationChange?: (rotation: number) => void;
  showRotationHandle?: boolean;
  rotationHandleRadius?: number;
  rotationHandleColor?: string;
  rotationHandleStrokeColor?: string;
  rotationHandleDistance?: number;
  iconPosition?: IconPosition;
}

export const CanvasLineIcon = ({
  id,
  isAlly,
  x,
  y,
  src,
  draggable = true,
  onDragEnd,
  borderOpacity,
  radius,
  lineLength,
  allyColor,
  enemyColor,
  lineStrokeWidth = 6,
  stroke,
  width,
  height,
  rotation = 0,
  onRotationChange,
  showRotationHandle = true,
  rotationHandleRadius = 12,
  rotationHandleColor = "#e54646",
  rotationHandleStrokeColor = "#ffffff",
  rotationHandleDistance = 150,
  strokeWidth,
  iconPosition = "start",
}: CanvasLineIconProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(rotation);
  const rotationRef = useRef<number>(rotation);

  const { setAbilitiesOnCanvas } = useCanvas();

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!groupRef.current) return;
    const className = e.target.getClassName();
    if (className === "Line" || className === "Image") {
      groupRef.current.draggable(true);
    } else if (className === "Circle") {
      // Disable dragging when interacting with rotation handle
      groupRef.current.draggable(false);
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

  const handleRotationMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setIsRotating(true);

    const stage = e.target.getStage();
    if (!stage) return;

    const handleRotationMouseMove = () => {
      if (!groupRef.current || !stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const groupPosition = groupRef.current.getAbsolutePosition();

      const deltaX = pointer.x - groupPosition.x;
      const deltaY = pointer.y - groupPosition.y;
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      setCurrentRotation(angle);
      rotationRef.current = angle;
      onRotationChange?.(angle);
    };

    const handleRotationMouseUp = () => {
      setIsRotating(false);

      if (setAbilitiesOnCanvas) {
        setAbilitiesOnCanvas((prev) => {
          const index = prev.findIndex((ability) => ability.id === id);
          if (index === -1) return prev;

          const copy = prev.slice();
          const [item] = copy.splice(index, 1);
          const updatedItem = { ...item, currentRotation: rotationRef.current };
          copy.push(updatedItem);

          return copy;
        });
      }

      stage.off("mousemove", handleRotationMouseMove);
      stage.off("mouseup", handleRotationMouseUp);
    };

    stage.on("mousemove", handleRotationMouseMove);
    stage.on("mouseup", handleRotationMouseUp);
  };

  const halfLength = lineLength / 2;
  const radians = (currentRotation * Math.PI) / 180;

  const startX = iconPosition === "start" ? 0 : -halfLength * Math.cos(radians);
  const startY = iconPosition === "start" ? 0 : -halfLength * Math.sin(radians);
  const endX =
    iconPosition === "start"
      ? lineLength * Math.cos(radians)
      : halfLength * Math.cos(radians);
  const endY =
    iconPosition === "start"
      ? lineLength * Math.sin(radians)
      : halfLength * Math.sin(radians);

  const handleX = rotationHandleDistance * Math.cos(radians);
  const handleY = rotationHandleDistance * Math.sin(radians);

  return (
    <Group
      id={id}
      ref={groupRef}
      x={x}
      y={y}
      draggable={draggable}
      onMouseOver={handleMouseOverGrabCursor}
      onMouseOut={handleMouseOutDefaultCursor}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Line
        points={[startX, startY, endX, endY]}
        strokeWidth={lineStrokeWidth}
        stroke={stroke}
      />

      {showRotationHandle && (
        <Circle
          x={handleX}
          y={handleY}
          radius={rotationHandleRadius}
          fill={rotationHandleColor}
          stroke={rotationHandleStrokeColor}
          strokeWidth={2}
          opacity={isRotating ? 0.8 : 0.6}
          onMouseDown={handleRotationMouseDown}
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
        radius={radius}
        borderOpacity={borderOpacity}
        strokeWidth={strokeWidth}
        allyColor={allyColor}
        enemyColor={enemyColor}
      />
    </Group>
  );
};
