import { SIDEBAR_WIDTH } from "@/lib/consts";
import Konva from "konva";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Group, Rect, Image as KonvaImage } from "react-konva";

interface CanvasAgentProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
  width: number;
}

export const DeleteZone = ({ deleteGroupRef, width }: CanvasAgentProps) => {
  const [iconImg, setIconImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const svgString = renderToStaticMarkup(
      <Trash2 size={32} color="#ff0000" />
    );
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new window.Image();

    img.onload = () => {
      setIconImg(img);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, []);

  return (
    <Group
      ref={deleteGroupRef}
      x={width - 100 - SIDEBAR_WIDTH - 20}
      y={20}
      width={100}
      height={100}
      opacity={0.5}
    >
      <Rect
        width={100}
        height={100}
        dash={[15, 5]}
        stroke="#ff0000"
        cornerRadius={10}
      />
      {iconImg && (
        <KonvaImage
          image={iconImg}
          x={(100 - iconImg.width) / 2}
          y={(100 - iconImg.height) / 2}
        />
      )}
    </Group>
  );
};
