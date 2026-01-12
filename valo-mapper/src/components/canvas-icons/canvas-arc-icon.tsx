import { CanvasIcon, CanvasIconProps } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useEffect, useRef, useState } from "react";
import { Arc, Circle, Group } from "react-konva";
import useImage from "use-image";

interface CanvasArcIconProps extends CanvasIconProps {
  boxRadius: number;
  arcRadius: number;
  fov: number;
  outerCircleRadius?: number;
  circleStrokeWidth?: number;
  fill: string;
  rotation?: number;
  showRotationHandle?: boolean;
  rotationHandleDistance?: number;
  rotationHandleRadius?: number;
  rotationHandleColor?: string;
  rotationHandleStrokeColor?: string;
}

export const CanvasArcIcon = ({
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
  boxRadius,
  arcRadius,
  strokeWidth,
  outerCircleRadius,
  allyColor,
  enemyColor,
  circleStrokeWidth = 2,
  fill,
  width,
  height,
  fov,
  rotation = 0,
  showRotationHandle = true,
  rotationHandleDistance = 70,
  rotationHandleRadius = 12,
  rotationHandleColor = "#e54646",
  rotationHandleStrokeColor = "#ffffff",
}: CanvasArcIconProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const rotationHandleRef = useRef<Konva.Circle>(null);
  const [currentRotation, setCurrentRotation] = useState(rotation);

  const [isInteracting, setIsInteracting] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  const frameRef = useRef<number | null>(null);

  const rotationRef = useRef<number>(rotation);

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
  }, [image, currentRotation, isInteracting, isHoveringHandle, isAlly]);

  useEffect(() => {
    setCurrentRotation(rotation);
    rotationRef.current = rotation;
  }, [rotation]);

  const { setAbilitiesOnCanvas } = useCanvas();

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!groupRef.current) return;
    const className = e.target.getClassName();
    if (className === "Image") {
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

        rotationRef.current = angle;

        if (!frameRef.current) {
          frameRef.current = requestAnimationFrame(() => {
            setCurrentRotation(rotationRef.current);
            frameRef.current = null;
          });
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
            };
            copy.push(updatedItem);
            return copy;
          });
        }

        stage.container().style.cursor = "default";

        stage.off(".interaction");
      };

      stage.on("mousemove.interaction", handleInteractionMove);
      stage.on("mouseup.interaction", handleInteractionEnd);
      stage.on("mouseleave.interaction", handleInteractionEnd);
      stage.on("touchmove.interaction", handleInteractionMove);
      stage.on("touchend.interaction", handleInteractionEnd);
    },
    [id, isListening, setAbilitiesOnCanvas]
  );

  const radians = (currentRotation * Math.PI) / 180;

  const handleX = rotationHandleDistance * Math.cos(radians);
  const handleY = rotationHandleDistance * Math.sin(radians);

  const handleRotationHandleMouseOver = () => {
    if (!isListening) return;
    setIsHoveringHandle(true);
  };

  const handleRotationHandleMouseOut = () => {
    if (!isListening) return;
    setIsHoveringHandle(false);
  };

  return (
    <Group
      id={id}
      ref={groupRef}
      x={x}
      y={y}
      isListening={isListening}
      draggable={draggable}
      onMouseDown={isListening ? handleMouseDown : undefined}
      onDragStart={isListening ? handleDragStart : undefined}
      onDragMove={isListening ? onDragMove : undefined}
      onDragEnd={isListening ? handleDragEnd : undefined}
    >
      <Arc
        strokeWidth={circleStrokeWidth}
        angle={fov}
        innerRadius={0}
        outerRadius={arcRadius}
        rotation={currentRotation - fov / 2}
        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndRadius={arcRadius}
        fillRadialGradientColorStops={[
          0,
          fill,
          0.3,
          fill + "CC",
          0.5,
          fill + "66",
          1,
          fill + "00",
        ]}
      />
      {outerCircleRadius && (
        <Circle
          radius={outerCircleRadius}
          strokeWidth={circleStrokeWidth}
          stroke={"#ffffff"}
          opacity={0.3}
          listening={false}
          dash={[10, 5]}
        />
      )}
      {showRotationHandle && (
        <Circle
          ref={rotationHandleRef}
          x={handleX}
          y={handleY}
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
        radius={boxRadius}
        borderOpacity={borderOpacity}
        allyColor={allyColor}
        enemyColor={enemyColor}
        strokeWidth={strokeWidth}
      />
    </Group>
  );
};
