import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import type { KonvaEventObject } from "konva/lib/Node";

interface AgentIconProps {
  x: number;
  y: number;
  src: string;
  draggable?: boolean;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
}

const AgentIcon = ({
  x,
  y,
  src,
  draggable = true,
  onDragEnd,
}: AgentIconProps) => {
  const [image] = useImage(src);
  return (
    <KonvaImage
      image={image}
      x={x}
      y={y}
      width={50}
      height={50}
      draggable={draggable}
      onDragEnd={onDragEnd}
    />
  );
};

export default AgentIcon;
