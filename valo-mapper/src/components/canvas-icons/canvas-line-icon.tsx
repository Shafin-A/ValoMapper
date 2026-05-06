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
import useImage from "use-image";

type IconPosition = "middle" | "start";
type HandleMode = "rotation" | "length";

interface CanvasLineIconProps extends CanvasIconProps {
  lineLength: number;
  lineStrokeWidth?: number;
  stroke: string;
  showAbilityShape?: boolean;
  rotation?: number;
  onRotationChange?: (rotation: number) => void;
  onLengthChange?: (length: number) => void;
  onInteractionEnd?: (data: {
    currentRotation: number;
    currentLength: number;
  }) => void;
  showRotationHandle?: boolean;
  rotationHandleRadius?: number;
  rotationHandleColor?: string;
  rotationHandleStrokeColor?: string;
  rotationHandleDistance?: number;
  showInactiveRotationHandleRing?: boolean;
  iconPosition?: IconPosition;
  handleMode?: HandleMode;
  minLength?: number;
  maxLength?: number;
  iconLineGap?: number;
  showThickEnd?: boolean;
  thickEndLength?: number;
  thickEndWidth?: number;
  thickEndStroke?: string;
}

export const CanvasLineIcon = ({
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
  onInteractionEnd,
  showRotationHandle = true,
  rotationHandleRadius = 12,
  rotationHandleColor = "#e54646",
  rotationHandleStrokeColor = "#ffffff",
  rotationHandleDistance = 150,
  showInactiveRotationHandleRing = false,
  strokeWidth,
  iconPosition = "start",
  handleMode = "rotation",
  minLength = 0,
  maxLength = 500,
  iconLineGap = 0,
  showThickEnd = false,
  thickEndLength = 10,
  thickEndWidth = 0,
  thickEndStroke = "#ffffff",
  showAbilityShape = true,
  registerNode,
  unregisterNode,
}: CanvasLineIconProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const rotationHandleRef = useRef<Konva.Circle>(null);

  const [isInteracting, setIsInteracting] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(rotation);
  const [currentLength, setCurrentLength] = useState(lineLength);

  const rotationRef = useRef<number>(rotation);
  const lengthRef = useRef<number>(lineLength);
  const frameRef = useRef<number | null>(null);

  const [image] = useImage(src);

  const { setAbilitiesOnCanvas, mapSide } = useCanvas();

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    registerNode?.(id, group);

    return () => {
      unregisterNode?.(id);
    };
  }, [id, registerNode, unregisterNode]);

  useEffect(() => {
    if (groupRef.current && image) {
      requestAnimationFrame(() => {
        if (groupRef.current) {
          groupRef.current.clearCache();
          groupRef.current.cache({ pixelRatio: 2 });
        }
      });
    }
  }, [
    image,
    currentRotation,
    currentLength,
    isInteracting,
    isHoveringHandle,
    isAlly,
    mapSide,
    showAbilityShape,
    width,
    height,
    radius,
    borderOpacity,
    strokeWidth,
    allyColor,
    enemyColor,
  ]);

  useEffect(() => {
    setCurrentRotation(rotation);
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    setCurrentLength(lineLength);
    lengthRef.current = lineLength;
  }, [lineLength]);

  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!groupRef.current) return;
    const className = e.target.getClassName();
    groupRef.current.draggable(className === "Image");
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
    [draggable, onDragEnd],
  );

  const handleInteractionStart = useCallback(
    (e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>) => {
      if (!isListening) return;
      e.cancelBubble = true;
      setIsInteracting(true);

      const stage = e.target.getStage();
      if (!stage || !groupRef.current) return;

      const handleInteractionMove = () => {
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
            Math.min(maxLength, adjustedDistance),
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

      const handleInteractionEnd = () => {
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

        onInteractionEnd?.({
          currentRotation: rotationRef.current,
          currentLength: lengthRef.current,
        });

        stage.off(".interaction");
      };

      stage.on("mousemove.interaction", handleInteractionMove);
      stage.on("mouseup.interaction", handleInteractionEnd);
      stage.on("mouseleave.interaction", handleInteractionEnd);
      stage.on("touchmove.interaction", handleInteractionMove);
      stage.on("touchend.interaction", handleInteractionEnd);
    },
    [
      handleMode,
      iconLineGap,
      id,
      isListening,
      maxLength,
      minLength,
      onInteractionEnd,
      onLengthChange,
      onRotationChange,
      setAbilitiesOnCanvas,
    ],
  );

  const handleRotationHandleMouseOver = () => {
    if (!isListening) return;
    setIsHoveringHandle(true);
  };

  const handleRotationHandleMouseOut = () => {
    if (!isListening) return;
    setIsHoveringHandle(false);
  };

  const halfLength = currentLength / 2;
  const radians = (currentRotation * Math.PI) / 180;

  const gapOffsetX = iconLineGap * Math.cos(radians);
  const gapOffsetY = iconLineGap * Math.sin(radians);

  const startX =
    iconPosition === "start" ? gapOffsetX : -halfLength * Math.cos(radians);
  const startY =
    iconPosition === "start" ? gapOffsetY : -halfLength * Math.sin(radians);
  const endX =
    iconPosition === "start"
      ? (currentLength + iconLineGap) * Math.cos(radians)
      : halfLength * Math.cos(radians);
  const endY =
    iconPosition === "start"
      ? (currentLength + iconLineGap) * Math.sin(radians)
      : halfLength * Math.sin(radians);

  const handleDistance =
    handleMode === "length"
      ? currentLength + iconLineGap
      : rotationHandleDistance;
  const handleX = handleDistance * Math.cos(radians);
  const handleY = handleDistance * Math.sin(radians);

  const isHandleActive = isInteracting || isHoveringHandle;
  const activeHandleColor =
    handleMode === "length" ? "#46e546" : rotationHandleColor;
  const handleColor = isHandleActive
    ? activeHandleColor
    : showInactiveRotationHandleRing
      ? "rgba(0, 0, 0, 0)"
      : activeHandleColor;

  return (
    <Group
      id={id}
      ref={groupRef}
      x={x}
      y={y}
      listening={isListening}
      draggable={draggable}
      onMouseOver={isListening ? handleMouseOverGrabCursor : undefined}
      onMouseOut={isListening ? handleMouseOutDefaultCursor : undefined}
      onMouseDown={isListening ? handleMouseDown : undefined}
      onDragStart={isListening ? handleDragStart : undefined}
      onDragMove={isListening ? onDragMove : undefined}
      onDragEnd={isListening ? handleDragEnd : undefined}
    >
      {showAbilityShape && (
        <>
          <Line
            listening={false}
            points={[startX, startY, endX, endY]}
            strokeWidth={lineStrokeWidth}
            stroke={stroke}
          />

          {showThickEnd && (
            <Line
              listening={false}
              points={[
                endX - thickEndLength * Math.cos(radians),
                endY - thickEndLength * Math.sin(radians),
                endX,
                endY,
              ]}
              strokeWidth={lineStrokeWidth + thickEndWidth}
              stroke={thickEndStroke}
              opacity={1}
            />
          )}

          {showRotationHandle && (
            <Circle
              ref={rotationHandleRef}
              x={handleX}
              y={handleY}
              listening={isListening}
              radius={rotationHandleRadius}
              fill={handleColor}
              stroke={rotationHandleStrokeColor}
              strokeWidth={2}
              opacity={isHandleActive ? 0.8 : 0.6}
              onMouseDown={isListening ? handleInteractionStart : undefined}
              onTouchStart={isListening ? handleInteractionStart : undefined}
              onMouseOver={
                isListening ? handleRotationHandleMouseOver : undefined
              }
              onMouseOut={
                isListening ? handleRotationHandleMouseOut : undefined
              }
            />
          )}
        </>
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
