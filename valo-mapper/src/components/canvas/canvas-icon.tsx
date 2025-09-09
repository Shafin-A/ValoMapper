import { Group, Image as KonvaImage, Rect } from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";

interface CanvasIconProps {
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

const handleMouseOver = (e: Konva.KonvaEventObject<MouseEvent>) => {
  e.target.getStage()!.container().style.cursor = "grab";
};

const handleMouseOut = (e: Konva.KonvaEventObject<MouseEvent>) => {
  e.target.getStage()!.container().style.cursor = "default";
};

export const CanvasIcon = ({
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

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      offsetX={width / 2}
      offsetY={height / 2}
      onDragEnd={onDragEnd}
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
