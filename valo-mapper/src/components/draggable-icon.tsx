import { Group, Image as KonvaImage, Rect } from "react-konva";
import useImage from "use-image";
import type { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";

interface DraggableIconProps {
  isAlly: boolean;
  x: number;
  y: number;
  src: string;
  draggable?: boolean;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
  width: number;
  height: number;
  opacity: number;
  radius: number;
  allyColor: string;
  enemyColor: string;
}

const handleMouseOver = (e: Konva.KonvaEventObject<MouseEvent>) => {
  e.target.getStage()!.container().style.cursor = "grab";
};

const handleMouseOut = (e: Konva.KonvaEventObject<MouseEvent>) => {
  e.target.getStage()!.container().style.cursor = "default";
};

const DraggableIcon = ({
  isAlly,
  x,
  y,
  src,
  draggable = true,
  onDragEnd,
  width,
  height,
  radius,
  opacity,
  allyColor,
  enemyColor,
}: DraggableIconProps) => {
  const [image] = useImage(src);

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={onDragEnd}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      offsetX={25}
      offsetY={25}
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

export default DraggableIcon;
