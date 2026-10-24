import {
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
} from "@/lib/utils";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef } from "react";
import { Group, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import { useGrayImage } from "@/hooks/use-gray-image";
import { useIconContour } from "@/hooks/use-icon-contour";

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
  contourColor?: string;
  contourWidth?: number;
  isGray?: boolean;
  hasShadow?: boolean;
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
  contourColor,
  contourWidth = 0,
  onDragMove,
  onDragEnd,
  rotation = 0,
  registerNode,
  unregisterNode,
  isGray = false,
  hasShadow = false,
}: CanvasIconProps) => {
  const [iconImage] = useImage(src);
  const resolvedImage = useGrayImage(iconImage, isGray);
  const contour = useIconContour({
    image: iconImage,
    color: contourColor,
    thickness: contourWidth,
    width,
    height,
  });
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
      {contour && (
        <KonvaImage
          image={contour.image}
          x={contour.x}
          y={contour.y}
          width={contour.width}
          height={contour.height}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
      <KonvaImage
        image={resolvedImage}
        width={width}
        height={height}
        cornerRadius={radius}
        stroke={isAlly ? allyColor + alphaHex : enemyColor + alphaHex}
        strokeWidth={strokeWidth}
        fill={fill}
        {...(hasShadow && {
          shadowColor: "#000000",
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
        })}
      />
    </Group>
  );
};
