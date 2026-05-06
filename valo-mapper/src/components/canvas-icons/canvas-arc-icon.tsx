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
  showAbilityShape?: boolean;
  showOuterCircle?: boolean;
  outerCircleRadius?: number;
  showOuterArc?: boolean;
  outerArcThickness?: number;
  outerArcFill?: string;
  outerArcOpacity?: number;
  circleStrokeWidth?: number;
  fill: string;
  useFillGradient?: boolean;
  rotation?: number;
  onInteractionEnd?: (data: {
    currentRotation: number;
    currentLength?: number;
  }) => void;
  showRotationHandle?: boolean;
  rotationHandleDistance?: number;
  rotationHandleRadius?: number;
  rotationHandleColor?: string;
  rotationHandleStrokeColor?: string;
  allowLengthAdjustment?: boolean;
  showCenterIcon?: boolean;
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
  showOuterArc = false,
  outerCircleRadius,
  showOuterCircle = true,
  outerArcThickness = 1,
  outerArcFill = "#ffffff",
  outerArcOpacity = 1,
  allyColor,
  enemyColor,
  circleStrokeWidth = 2,
  fill,
  useFillGradient = true,
  width,
  height,
  fov,
  rotation = 0,
  onInteractionEnd,
  showRotationHandle = true,
  rotationHandleDistance = 70,
  rotationHandleRadius = 12,
  rotationHandleColor = "#e54646",
  rotationHandleStrokeColor = "#ffffff",
  showAbilityShape = true,
  allowLengthAdjustment = false,
  showCenterIcon = true,
  registerNode,
  unregisterNode,
}: CanvasArcIconProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const rotationHandleRef = useRef<Konva.Circle>(null);
  const [currentRotation, setCurrentRotation] = useState(rotation);
  const [currentArcRadius, setCurrentArcRadius] = useState(arcRadius);

  const [isInteracting, setIsInteracting] = useState(false);
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  const frameRef = useRef<number | null>(null);

  const rotationRef = useRef<number>(rotation);
  const arcRadiusRef = useRef<number>(arcRadius);
  const initialArcRadiusRef = useRef<number>(arcRadius);
  const initialPointerDistanceRef = useRef<number>(0);

  const { setAbilitiesOnCanvas, mapSide } = useCanvas();

  const [image] = useImage(src);

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
    isInteracting,
    isHoveringHandle,
    isAlly,
    mapSide,
    showAbilityShape,
    showCenterIcon,
    showOuterCircle,
    width,
    height,
    boxRadius,
    borderOpacity,
    strokeWidth,
    allyColor,
    enemyColor,
  ]);

  useEffect(() => {
    setCurrentRotation(rotation);
    rotationRef.current = rotation;
    setCurrentArcRadius(arcRadius);
    arcRadiusRef.current = arcRadius;
    initialArcRadiusRef.current = arcRadius;
  }, [rotation, arcRadius]);

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

      const initialPointer = stage.getPointerPosition();
      if (initialPointer) {
        const groupPosition = groupRef.current.getAbsolutePosition();
        const stageScale = stage.scaleX();
        const initialDX = (initialPointer.x - groupPosition.x) / stageScale;
        const initialDY = (initialPointer.y - groupPosition.y) / stageScale;
        initialPointerDistanceRef.current = Math.sqrt(
          initialDX * initialDX + initialDY * initialDY,
        );
      }

      const handleInteractionMove = () => {
        if (!groupRef.current) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const groupPosition = groupRef.current.getAbsolutePosition();
        const stageScale = stage.scaleX();

        const deltaX = (pointer.x - groupPosition.x) / stageScale;
        const deltaY = (pointer.y - groupPosition.y) / stageScale;

        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const minRadius = 10;
        const maxRadius = 250;

        rotationRef.current = angle;
        if (allowLengthAdjustment) {
          const delta = distance - initialPointerDistanceRef.current;
          arcRadiusRef.current = Math.min(
            Math.max(initialArcRadiusRef.current + delta, minRadius),
            maxRadius,
          );
        }

        if (!frameRef.current) {
          frameRef.current = requestAnimationFrame(() => {
            setCurrentRotation(rotationRef.current);
            if (allowLengthAdjustment) {
              setCurrentArcRadius(arcRadiusRef.current);
            }
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
              currentLength: allowLengthAdjustment
                ? arcRadiusRef.current
                : item.currentLength,
            };
            copy.push(updatedItem);
            return copy;
          });
        }

        onInteractionEnd?.({
          currentRotation: rotationRef.current,
          currentLength: allowLengthAdjustment
            ? arcRadiusRef.current
            : undefined,
        });

        stage.container().style.cursor = "default";

        stage.off(".interaction");
      };

      stage.on("mousemove.interaction", handleInteractionMove);
      stage.on("mouseup.interaction", handleInteractionEnd);
      stage.on("mouseleave.interaction", handleInteractionEnd);
      stage.on("touchmove.interaction", handleInteractionMove);
      stage.on("touchend.interaction", handleInteractionEnd);
    },
    [
      allowLengthAdjustment,
      id,
      isListening,
      onInteractionEnd,
      setAbilitiesOnCanvas,
    ],
  );

  const radians = (currentRotation * Math.PI) / 180;

  const handleRadius = allowLengthAdjustment
    ? currentArcRadius
    : rotationHandleDistance;

  const handleX = handleRadius * Math.cos(radians);
  const handleY = handleRadius * Math.sin(radians);

  const gradientFillProps = useFillGradient
    ? {
        fillPriority: "radial-gradient",
        fillRadialGradientStartPoint: { x: 0, y: 0 },
        fillRadialGradientEndPoint: { x: 0, y: 0 },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndRadius: currentArcRadius,
        fillRadialGradientColorStops: [
          0,
          fill,
          0.3,
          fill + "CC",
          0.5,
          fill + "66",
          1,
          fill + "00",
        ],
      }
    : {};

  const resolvedOuterArcThickness = Math.max(0, outerArcThickness);

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
      listening={isListening}
      draggable={draggable}
      onMouseDown={isListening ? handleMouseDown : undefined}
      onDragStart={isListening ? handleDragStart : undefined}
      onDragMove={isListening ? onDragMove : undefined}
      onDragEnd={isListening ? handleDragEnd : undefined}
    >
      {showAbilityShape && (
        <>
          <Arc
            listening={false}
            strokeWidth={circleStrokeWidth}
            angle={fov}
            innerRadius={0}
            outerRadius={currentArcRadius}
            rotation={currentRotation - fov / 2}
            fill={fill}
            {...gradientFillProps}
          />
          {showOuterArc && (
            <Arc
              angle={fov}
              innerRadius={currentArcRadius}
              outerRadius={currentArcRadius + resolvedOuterArcThickness}
              rotation={currentRotation - fov / 2}
              fill={outerArcFill}
              opacity={outerArcOpacity}
              listening={false}
            />
          )}
          {outerCircleRadius && showOuterCircle && (
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
      {showCenterIcon && (
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
      )}
    </Group>
  );
};
