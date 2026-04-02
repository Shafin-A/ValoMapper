import Konva from "konva";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Group, Rect, Image as KonvaImage } from "react-konva";
import { useIsMobile } from "@/hooks/use-mobile";

interface DeleteZoneProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
}

export const DeleteZone = ({ deleteGroupRef }: DeleteZoneProps) => {
  const isMobile = useIsMobile();
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
      </svg>,
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

  const DELETE_ZONE_SIZE = isMobile ? 84 : 100;
  const ICON_SIZE = isMobile ? 28 : 32;

  return (
    <Group
      ref={deleteGroupRef}
      x={0}
      y={0}
      width={DELETE_ZONE_SIZE}
      height={DELETE_ZONE_SIZE}
      opacity={0.5}
    >
      <Rect
        width={DELETE_ZONE_SIZE}
        height={DELETE_ZONE_SIZE}
        dash={[15, 5]}
        stroke="#ff0000"
        cornerRadius={10}
      />
      {iconImg && iconImg.naturalWidth > 0 && iconImg.naturalHeight > 0 && (
        <KonvaImage
          image={iconImg}
          x={(DELETE_ZONE_SIZE - ICON_SIZE) / 2}
          y={(DELETE_ZONE_SIZE - ICON_SIZE) / 2}
          width={ICON_SIZE}
          height={ICON_SIZE}
        />
      )}
    </Group>
  );
};
