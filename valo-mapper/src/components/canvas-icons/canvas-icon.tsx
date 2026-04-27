import {
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
} from "@/lib/utils";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef } from "react";
import { Group, Image as KonvaImage } from "react-konva";
import { useGrayImage } from "@/hooks/use-gray-image";

export interface CanvasIconProps {
  id: string;
  isAlly: boolean;
  x: number;
  y: number;
  src: string;
  isListening?: boolean;
  draggable?: boolean;
  width: number;
  height: number;
  borderOpacity: number;
  radius: number;
  allyColor: string;
  enemyColor: string;
  fill?: string;
  strokeWidth: number;
  isGray?: boolean;
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
  rotation?: number;
  registerNode?: (id: string, node: Konva.Node) => void;
  unregisterNode?: (id: string) => void;
}

export const CanvasIcon = ({
  id,
  isAlly,
  x,
  y,
  src,
  isListening,
  draggable,
  width,
  height,
  radius,
  borderOpacity,
  allyColor,
  enemyColor,
  fill = "#1b1b1b",
  strokeWidth,
  onDragMove,
  onDragEnd,
  rotation = 0,
  registerNode,
  unregisterNode,
  isGray = false,
}: CanvasIconProps) => {
  const resolvedImage = useGrayImage(src, isGray);
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    if (registerNode) registerNode(id, group);

    return () => {
      if (unregisterNode) unregisterNode(id);
    };
  }, [id, registerNode, unregisterNode]);

  const handleOnDragStart = () => {
    if (groupRef.current) groupRef.current.opacity(0.5);
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (groupRef.current) groupRef.current.opacity(1);
    onDragEnd?.(e);
  };

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    onDragMove?.(e);
  };

  const alphaHex = Math.round(borderOpacity * 255)
    .toString(16)
    .padStart(2, "0");

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
      offsetX={width / 2}
      offsetY={height / 2}
      onDragStart={isListening ? handleOnDragStart : undefined}
      onDragMove={isListening ? handleDragMove : undefined}
      onDragEnd={isListening ? handleDragEnd : undefined}
      rotation={rotation}
    >
      <KonvaImage
        image={resolvedImage}
        width={width}
        height={height}
        cornerRadius={radius}
        stroke={isAlly ? allyColor + alphaHex : enemyColor + alphaHex}
        strokeWidth={strokeWidth}
        fill={fill}
      />
    </Group>
  );
};
