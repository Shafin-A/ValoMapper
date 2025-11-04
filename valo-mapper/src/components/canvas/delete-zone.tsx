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
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <Trash2 size={24} color="#ff0000" />
      </svg>
    );

    const dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;

    const img = new window.Image();

    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setIconImg(img);
      } else {
        console.error("Image loaded but has 0 dimensions");
      }
    };

    img.onerror = (e) => {
      console.error("Failed to load delete icon:", e);
    };

    img.src = dataUrl;
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
      {iconImg && iconImg.naturalWidth > 0 && iconImg.naturalHeight > 0 && (
        <KonvaImage
          image={iconImg}
          x={(100 - 32) / 2}
          y={(100 - 32) / 2}
          width={32}
          height={32}
        />
      )}
    </Group>
  );
};
