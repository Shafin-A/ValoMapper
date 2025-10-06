import { CanvasIcon, CanvasIconProps } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import {
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
} from "@/lib/utils";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useRef, useState, useCallback, useEffect } from "react";
import { Circle, Group, Line } from "react-konva";

type IconPosition = "middle" | "start";
type HandleMode = "rotation" | "length";

interface CanvasDoubleLineIconProps extends CanvasIconProps {
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
  iconLineGap?: number;
  lineGap?: number;
  showThickEnd?: boolean;
  thickEndLength?: number;
  thickEndWidth?: number;
  thickEndStroke?: string;
}

export const CanvasDoubleLineIcon = ({
  id,
  isAlly,
  x,
  y,
  src,
  isListening,
  draggable = true,
  onDragMove,
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
  iconLineGap = 0,
  lineGap = 20,
  showThickEnd = false,
  thickEndLength = 30,
  thickEndWidth = 4,
  thickEndStroke = "#ffffff",
}: CanvasDoubleLineIconProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const rotationHandleRef = useRef<Konva.Circle>(null);

  const [isInteracting, setIsInteracting] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(rotation);
  const [currentLength, setCurrentLength] = useState(lineLength);

  const rotationRef = useRef(rotation);
  const lengthRef = useRef(lineLength);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentRotation(rotation);
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    setCurrentLength(lineLength);
    lengthRef.current = lineLength;
  }, [lineLength]);

  const { setAbilitiesOnCanvas } = useCanvas();

  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!groupRef.current) return;
    const className = e.target.getClassName();
    groupRef.current.draggable(className === "Line" || className === "Image");
  }, []);

  const handleDragStart = useCallback(() => {
    if (groupRef.current) {
      groupRef.current.draggable(draggable);
      groupRef.current.opacity(0.7);
    }
  }, [draggable]);

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (groupRef.current) {
        groupRef.current.draggable(draggable);
        groupRef.current.opacity(1);
      }
      onDragEnd?.(e);
    },
    [draggable, onDragEnd]
  );

  const handleInteractionMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isListening) return;
      e.cancelBubble = true;
      setIsInteracting(true);

      const stage = e.target.getStage();
      if (!stage || !groupRef.current) return;

      const handleInteractionMouseMove = () => {
        if (!groupRef.current) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const groupPosition = groupRef.current.getAbsolutePosition();
        const stageScale = stage.scaleX();

        const deltaX = (pointer.x - groupPosition.x) / stageScale;
        const deltaY = (pointer.y - groupPosition.y) / stageScale;

        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        if (handleMode === "rotation") {
          rotationRef.current = angle;

          if (!frameRef.current) {
            frameRef.current = requestAnimationFrame(() => {
              setCurrentRotation(rotationRef.current);
              frameRef.current = null;
            });
          }

          onRotationChange?.(angle);
        } else {
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          const adjustedDistance = Math.max(0, distance - iconLineGap);
          const clampedDistance = Math.max(
            minLength,
            Math.min(maxLength, adjustedDistance)
          );

          rotationRef.current = angle;
          lengthRef.current = clampedDistance;

          if (!frameRef.current) {
            frameRef.current = requestAnimationFrame(() => {
              setCurrentRotation(rotationRef.current);
              setCurrentLength(lengthRef.current);
              frameRef.current = null;
            });
          }

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

        stage.off(".interaction");
      };

      stage.on("mousemove.interaction", handleInteractionMouseMove);
      stage.on("mouseup.interaction", handleInteractionMouseUp);
      stage.on("mouseleave.interaction", handleInteractionMouseUp);
    },
    [
      isListening,
      handleMode,
      onRotationChange,
      iconLineGap,
      minLength,
      maxLength,
      onLengthChange,
      setAbilitiesOnCanvas,
      id,
    ]
  );

  const handleRotationHandleMouseOver = () => {
    if (!isListening) return;
    if (rotationHandleRef.current) rotationHandleRef.current.opacity(0.8);
  };

  const handleRotationHandleMouseOut = () => {
    if (!isListening) return;
    if (rotationHandleRef.current) rotationHandleRef.current.opacity(0.6);
  };

  const halfLength = currentLength / 2;
  const radians = (currentRotation * Math.PI) / 180;
  const halfGap = lineGap / 2;

  const perpX = -Math.sin(radians) * halfGap;
  const perpY = Math.cos(radians) * halfGap;

  const gapOffsetX = iconLineGap * Math.cos(radians);
  const gapOffsetY = iconLineGap * Math.sin(radians);

  const baseStartX =
    iconPosition === "start" ? gapOffsetX : -halfLength * Math.cos(radians);
  const baseStartY =
    iconPosition === "start" ? gapOffsetY : -halfLength * Math.sin(radians);
  const baseEndX =
    iconPosition === "start"
      ? (currentLength + iconLineGap) * Math.cos(radians)
      : halfLength * Math.cos(radians);
  const baseEndY =
    iconPosition === "start"
      ? (currentLength + iconLineGap) * Math.sin(radians)
      : halfLength * Math.sin(radians);

  const line1StartX = baseStartX + perpX;
  const line1StartY = baseStartY + perpY;
  const line1EndX = baseEndX + perpX;
  const line1EndY = baseEndY + perpY;

  const line2StartX = baseStartX - perpX;
  const line2StartY = baseStartY - perpY;
  const line2EndX = baseEndX - perpX;
  const line2EndY = baseEndY - perpY;

  const handleDistance =
    handleMode === "length"
      ? currentLength + iconLineGap
      : rotationHandleDistance;
  const handleX = handleDistance * Math.cos(radians);
  const handleY = handleDistance * Math.sin(radians);

  const handleColor = handleMode === "length" ? "#46e546" : rotationHandleColor;

  return (
    <Group
      id={id}
      ref={groupRef}
      x={x}
      y={y}
      isListening={isListening}
      draggable={draggable}
      onMouseOver={isListening ? handleMouseOverGrabCursor : undefined}
      onMouseOut={isListening ? handleMouseOutDefaultCursor : undefined}
      onMouseDown={isListening ? handleMouseDown : undefined}
      onDragStart={isListening ? handleDragStart : undefined}
      onDragMove={isListening ? onDragMove : undefined}
      onDragEnd={isListening ? handleDragEnd : undefined}
    >
      <Line
        points={[line1StartX, line1StartY, line1EndX, line1EndY]}
        strokeWidth={lineStrokeWidth}
        stroke={stroke}
      />

      <Line
        points={[line2StartX, line2StartY, line2EndX, line2EndY]}
        strokeWidth={lineStrokeWidth}
        stroke={stroke}
      />

      {showThickEnd && (
        <>
          <Line
            points={[
              line1EndX - thickEndLength * Math.cos(radians),
              line1EndY - thickEndLength * Math.sin(radians),
              line1EndX,
              line1EndY,
            ]}
            strokeWidth={lineStrokeWidth + thickEndWidth}
            stroke={thickEndStroke}
          />
          <Line
            points={[
              line2EndX - thickEndLength * Math.cos(radians),
              line2EndY - thickEndLength * Math.sin(radians),
              line2EndX,
              line2EndY,
            ]}
            strokeWidth={lineStrokeWidth + thickEndWidth}
            stroke={thickEndStroke}
          />
        </>
      )}

      {showRotationHandle && (
        <Circle
          ref={rotationHandleRef}
          x={handleX}
          y={handleY}
          isListening={isListening}
          radius={rotationHandleRadius}
          fill={handleColor}
          stroke={rotationHandleStrokeColor}
          strokeWidth={2}
          opacity={isInteracting ? 0.8 : 0.6}
          onMouseDown={isListening ? handleInteractionMouseDown : undefined}
          onMouseOver={isListening ? handleRotationHandleMouseOver : undefined}
          onMouseOut={isListening ? handleRotationHandleMouseOut : undefined}
        />
      )}

      <CanvasIcon
        id={id}
        isAlly={isAlly}
        x={0}
        y={0}
        src={src}
        isListening={isListening}
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
