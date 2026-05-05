import { CanvasIcon, CanvasIconProps } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import {
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
} from "@/lib/utils";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef } from "react";
import { Circle, Group } from "react-konva";
import useImage from "use-image";

interface CanvasCircleIconProps extends CanvasIconProps {
  boxRadius: number;
  circleRadius: number;
  outerCircleRadius?: number;
  circleStrokeWidth?: number;
  stroke: string;
  fill: string;
  showAbilityShape?: boolean;
  showOuterCircle?: boolean;
}

export const CanvasCircleIcon = ({
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
  circleRadius,
  outerCircleRadius,
  allyColor,
  enemyColor,
  circleStrokeWidth = 2,
  strokeWidth,
  stroke,
  fill,
  width,
  height,
  showAbilityShape = true,
  showOuterCircle = true,
  registerNode,
  unregisterNode,
}: CanvasCircleIconProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const [image] = useImage(src);
  const { mapSide } = useCanvas();

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
    isAlly,
    mapSide,
    stroke,
    fill,
    circleRadius,
    showAbilityShape,
    showOuterCircle,
    width,
    height,
    boxRadius,
    borderOpacity,
    strokeWidth,
    allyColor,
    enemyColor,
  ]);

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
      onDragEnd={isListening ? handleDragEnd : undefined}
      onDragMove={isListening ? onDragMove : undefined}
    >
      {showAbilityShape && (
        <>
          <Circle
            radius={circleRadius}
            strokeWidth={circleStrokeWidth}
            fill={fill}
            stroke={stroke}
            listening={false}
          />
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
        </>
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
        borderOpacity={borderOpacity}
        allyColor={allyColor}
        enemyColor={enemyColor}
        strokeWidth={strokeWidth}
      />
    </Group>
  );
};
