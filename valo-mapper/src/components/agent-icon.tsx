import { Group, Image as KonvaImage, Rect } from "react-konva";
import useImage from "use-image";
import type { KonvaEventObject } from "konva/lib/Node";

interface AgentIconProps {
  isAlly: boolean;
  x: number;
  y: number;
  src: string;
  draggable?: boolean;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
}

const AgentIcon = ({
  isAlly,
  x,
  y,
  src,
  draggable = true,
  onDragEnd,
}: AgentIconProps) => {
  const [image] = useImage(src);

  return (
    <Group x={x} y={y} draggable={draggable} onDragEnd={onDragEnd}>
      <Rect
        width={50}
        height={50}
        fill={isAlly ? "#18636c" : "#FF4655"}
        cornerRadius={8}
      />
      <KonvaImage image={image} width={50} height={50} />
    </Group>
  );
};

export default AgentIcon;
