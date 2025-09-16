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
type HandleMode = "rotation" | "length";

interface CanvasLineIconProps extends CanvasIconProps {
  lineLength: number;
  lineStrokeWidth?: number;
  stroke: string;
  rotation?: number;
  onRotationChange?: (rotation: number) => void;
  onLengthChange?: (length: number) => void;
  showRotationHandle?: boolean;
  rotationHandleRadius?: number;
  rotationHandleColor?: string;
  rotationHandleStrokeColor?: string;
  rotationHandleDistance?: number;
  iconPosition?: IconPosition;
  handleMode?: HandleMode;
  minLength?: number;
  maxLength?: number;
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
  onLengthChange,
  showRotationHandle = true,
  rotationHandleRadius = 12,
  rotationHandleColor = "#e54646",
  rotationHandleStrokeColor = "#ffffff",
  rotationHandleDistance = 150,
  strokeWidth,
  iconPosition = "start",
  handleMode = "rotation",
  minLength = 0,
  maxLength = 500,
}: CanvasLineIconProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(rotation);
  const [currentLength, setCurrentLength] = useState(lineLength);
  const rotationRef = useRef<number>(rotation);
  const lengthRef = useRef<number>(lineLength);
  const rotationHandleRef = useRef<Konva.Circle>(null);

  const { setAbilitiesOnCanvas } = useCanvas();

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!groupRef.current) return;
    const className = e.target.getClassName();
    if (className === "Line" || className === "Image") {
      groupRef.current.draggable(true);
    } else if (className === "Circle") {
      // Disable dragging when interacting with handle
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

  const handleInteractionMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    setIsInteracting(true);

    const stage = e.target.getStage();
    if (!stage) return;

    const handleInteractionMouseMove = () => {
      if (rotationHandleRef.current) rotationHandleRef.current.opacity(1);

      if (!groupRef.current || !stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const groupPosition = groupRef.current.getAbsolutePosition();
      const stageScale = stage.scaleX();

      const deltaX = (pointer.x - groupPosition.x) / stageScale;
      const deltaY = (pointer.y - groupPosition.y) / stageScale;

      if (handleMode === "rotation") {
        // Rotation only mode - change angle, keep fixed distance
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        setCurrentRotation(angle);
        rotationRef.current = angle;
        onRotationChange?.(angle);
      } else if (handleMode === "length") {
        // Length mode - change both angle AND distance
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const clampedDistance = Math.max(
          minLength,
          Math.min(maxLength, distance)
        );

        setCurrentRotation(angle);
        setCurrentLength(clampedDistance);
        rotationRef.current = angle;
        lengthRef.current = clampedDistance;

        onRotationChange?.(angle);
        onLengthChange?.(clampedDistance);
      }
    };

    const handleInteractionMouseUp = () => {
      if (rotationHandleRef.current) rotationHandleRef.current.opacity(0.6);
      setIsInteracting(false);

      if (setAbilitiesOnCanvas) {
        setAbilitiesOnCanvas((prev) => {
          const index = prev.findIndex((ability) => ability.id === id);
          if (index === -1) return prev;

          const copy = prev.slice();
          const [item] = copy.splice(index, 1);
          const updatedItem = {
            ...item,
            currentRotation: rotationRef.current,
            currentLength: lengthRef.current,
          };
          copy.push(updatedItem);

          return copy;
        });
      }

      stage.off("mousemove", handleInteractionMouseMove);
      stage.off("mouseup", handleInteractionMouseUp);
    };

    stage.on("mousemove", handleInteractionMouseMove);
    stage.on("mouseup", handleInteractionMouseUp);
  };

  const handleRotationHandleMouseOver = () => {
    if (rotationHandleRef.current) {
      rotationHandleRef.current.opacity(0.8);
    }
  };

  const handleRotationHandleMouseOut = () => {
    if (rotationHandleRef.current) {
      rotationHandleRef.current.opacity(0.6);
    }
  };

  const activeLength = currentLength;
  const activeRotation = currentRotation;

  const halfLength = activeLength / 2;
  const radians = (activeRotation * Math.PI) / 180;

  const startX = iconPosition === "start" ? 0 : -halfLength * Math.cos(radians);
  const startY = iconPosition === "start" ? 0 : -halfLength * Math.sin(radians);
  const endX =
    iconPosition === "start"
      ? activeLength * Math.cos(radians)
      : halfLength * Math.cos(radians);
  const endY =
    iconPosition === "start"
      ? activeLength * Math.sin(radians)
      : halfLength * Math.sin(radians);

  const handleDistance =
    handleMode === "length" ? activeLength : rotationHandleDistance;
  const handleX = handleDistance * Math.cos(radians);
  const handleY = handleDistance * Math.sin(radians);

  const handleColor = handleMode === "length" ? "#46e546" : rotationHandleColor;

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
          ref={rotationHandleRef}
          x={handleX}
          y={handleY}
          radius={rotationHandleRadius}
          fill={handleColor}
          stroke={rotationHandleStrokeColor}
          strokeWidth={2}
          opacity={isInteracting ? 0.8 : 0.6}
          onMouseDown={handleInteractionMouseDown}
          onMouseOver={handleRotationHandleMouseOver}
          onMouseOut={handleRotationHandleMouseOut}
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
