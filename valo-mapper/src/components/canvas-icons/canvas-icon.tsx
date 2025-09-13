import {
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
} from "@/lib/utils";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { useRef } from "react";
import { Group, Image as KonvaImage, Rect } from "react-konva";
import useImage from "use-image";

export interface CanvasIconProps {
  id: string;
  isAlly: boolean;
  x: number;
  y: number;
  src: string;
  draggable?: boolean;
  width: number;
  height: number;
  opacity: number;
  radius: number;
  allyColor: string;
  enemyColor: string;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
}

export const CanvasIcon = ({
  id,
  isAlly,
  x,
  y,
  src,
  draggable,
  width,
  height,
  radius,
  opacity,
  allyColor,
  enemyColor,
  onDragEnd,
}: CanvasIconProps) => {
  const [image] = useImage(src);
  const groupRef = useRef<Konva.Group>(null);

  const handleOnDragStart = () => {
    if (groupRef.current) groupRef.current.opacity(0.5);
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (groupRef.current) groupRef.current.opacity(1);
    onDragEnd?.(e);
  };

  return (
    <Group
      id={id}
      ref={groupRef}
      x={x}
      y={y}
      draggable={draggable}
      onMouseOver={handleMouseOverGrabCursor}
      onMouseOut={handleMouseOutDefaultCursor}
      offsetX={width / 2}
      offsetY={height / 2}
      onDragStart={handleOnDragStart}
      onDragEnd={handleDragEnd}
    >
      <Rect
        width={width}
        height={height}
        fill={isAlly ? allyColor : enemyColor}
        cornerRadius={radius}
        opacity={opacity}
      />
      <KonvaImage
        image={image}
        width={width}
        height={height}
        cornerRadius={radius}
      />
    </Group>
  );
};
