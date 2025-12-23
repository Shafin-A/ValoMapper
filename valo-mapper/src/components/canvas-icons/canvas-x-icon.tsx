import { CanvasIcon, CanvasIconProps } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import {
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
} from "@/lib/utils";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Group, Line } from "react-konva";
import useImage from "use-image";

interface CanvasXIconProps extends CanvasIconProps {
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
  endCircleRadius?: number;
  endCircleColor?: string;
}

export const CanvasXIcon = ({
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
  showRotationHandle = true,
  rotationHandleRadius = 12,
  rotationHandleColor = "#e54646",
  rotationHandleStrokeColor = "#ffffff",
  rotationHandleDistance = 150,
  strokeWidth,
  endCircleRadius = 8,
  endCircleColor = "#ffffff",
}: CanvasXIconProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const rotationHandleRef = useRef<Konva.Circle>(null);

  const [isInteracting, setIsInteracting] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(rotation);

  const rotationRef = useRef<number>(rotation);
  const frameRef = useRef<number | null>(null);

  const [image] = useImage(src);

  useEffect(() => {
    if (groupRef.current && image) {
      requestAnimationFrame(() => {
        if (groupRef.current) {
          groupRef.current.clearCache();
          groupRef.current.cache({ pixelRatio: 2 });
        }
      });
    }
  }, [image, currentRotation, isInteracting, isHoveringHandle]);

  useEffect(() => {
    setCurrentRotation(rotation);
    rotationRef.current = rotation;
  }, [rotation]);

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
        const adjustedAngle = angle - 45;

        rotationRef.current = adjustedAngle;

        if (!frameRef.current) {
          frameRef.current = requestAnimationFrame(() => {
            setCurrentRotation(rotationRef.current);
            frameRef.current = null;
          });
        }

        onRotationChange?.(angle);
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
            };
            copy.push(updatedItem);
            return copy;
          });
        }

        stage.off(".interaction");
      };

      stage.on("mousemove.interaction", handleInteractionMove);
      stage.on("mouseup.interaction", handleInteractionEnd);
      stage.on("mouseleave.interaction", handleInteractionEnd);
      stage.on("touchmove.interaction", handleInteractionMove);
      stage.on("touchend.interaction", handleInteractionEnd);
    },
    [id, isListening, onRotationChange, setAbilitiesOnCanvas]
  );

  const handleRotationHandleMouseOver = () => {
    if (!isListening) return;
    setIsHoveringHandle(true);
  };

  const handleRotationHandleMouseOut = () => {
    if (!isListening) return;
    setIsHoveringHandle(false);
  };

  const halfLength = lineLength / 2;
  const radians = (currentRotation * Math.PI) / 180;

  const line1StartX = -halfLength * Math.cos(radians);
  const line1StartY = -halfLength * Math.sin(radians);
  const line1EndX = halfLength * Math.cos(radians);
  const line1EndY = halfLength * Math.sin(radians);

  const perpendicularRadians = radians + Math.PI / 2;
  const line2StartX = -halfLength * Math.cos(perpendicularRadians);
  const line2StartY = -halfLength * Math.sin(perpendicularRadians);
  const line2EndX = halfLength * Math.cos(perpendicularRadians);
  const line2EndY = halfLength * Math.sin(perpendicularRadians);

  const handleRadians = radians + Math.PI / 4;

  const handleX = rotationHandleDistance * Math.cos(handleRadians);
  const handleY = rotationHandleDistance * Math.sin(handleRadians);

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

      <Circle
        x={line1StartX}
        y={line1StartY}
        radius={endCircleRadius}
        fill={endCircleColor}
      />
      <Circle
        x={line1EndX}
        y={line1EndY}
        radius={endCircleRadius}
        fill={endCircleColor}
      />

      <Circle
        x={line2StartX}
        y={line2StartY}
        radius={endCircleRadius}
        fill={endCircleColor}
      />
      <Circle
        x={line2EndX}
        y={line2EndY}
        radius={endCircleRadius}
        fill={endCircleColor}
      />

      {showRotationHandle && (
        <Circle
          ref={rotationHandleRef}
          x={handleX}
          y={handleY}
          isListening={isListening}
          radius={rotationHandleRadius}
          fill={rotationHandleColor}
          stroke={rotationHandleStrokeColor}
          strokeWidth={2}
          opacity={isInteracting || isHoveringHandle ? 0.8 : 0.6}
          onMouseDown={isListening ? handleInteractionStart : undefined}
          onTouchStart={isListening ? handleInteractionStart : undefined}
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
