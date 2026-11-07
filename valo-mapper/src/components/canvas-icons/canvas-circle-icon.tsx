import { CanvasIcon, CanvasIconProps } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import {
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
} from "@/lib/utils";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef } from "react";
import { Circle, Group, Shape } from "react-konva";
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
  lifetimeProgress?: number;
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
  lifetimeProgress,
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
    const group = groupRef.current;
    if (!group || !image) return;
    if (lifetimeProgress !== undefined) {
      group.clearCache();
      return;
    }
    requestAnimationFrame(() => {
      if (groupRef.current) {
        groupRef.current.clearCache();
        groupRef.current.cache({ pixelRatio: 2 });
      }
    });
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
    lifetimeProgress,
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
            stroke={lifetimeProgress === undefined ? stroke : "transparent"}
            listening={false}
          />
          {lifetimeProgress !== undefined && (
            <Shape
              listening={false}
              perfectDrawEnabled={false}
              sceneFunc={(context) => {
                // Clockwise wipe: the elapsed fraction is transparent, with a
                // short smoothstep band so the leading edge fades softly.
                const progress = Math.max(
                  0,
                  Math.min(1, lifetimeProgress ?? 0),
                );
                context.save();
                context.setAttr("lineWidth", circleStrokeWidth);
                context.setAttr("strokeStyle", stroke);
                context.setAttr("lineCap", "butt");
                if (progress <= 0) {
                  context.beginPath();
                  context.arc(0, 0, circleRadius, 0, Math.PI * 2);
                  context.stroke();
                  context.restore();
                  return;
                }
                if (progress >= 1) {
                  context.restore();
                  return;
                }
                const segments = 180;
                const step = (Math.PI * 2) / segments;
                const fade = 0.055;
                const start = -Math.PI / 2;
                for (let index = 0; index < segments; index += 1) {
                  const elapsed = index / segments;
                  if (elapsed < progress) {
                    continue;
                  }
                  const edge = Math.min(1, (elapsed - progress) / fade);
                  const alpha = edge * edge * (3 - 2 * edge);
                  if (alpha <= 0) {
                    continue;
                  }
                  context.setAttr("globalAlpha", alpha);
                  context.beginPath();
                  context.arc(
                    0,
                    0,
                    circleRadius,
                    start + index * step,
                    start + (index + 1) * step + 0.002,
                  );
                  context.stroke();
                }
                context.restore();
              }}
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
