import useImage from "use-image";
import { Image } from "react-konva";
import { MAP_SIZE } from "@/lib/consts";
import { Vector2d } from "konva/lib/types";
import { useCanvas } from "@/contexts/canvas-context";

interface CanvasMapBackgroundProps {
  mapPosition: Vector2d;
}

export const CanvasMapBackground = ({
  mapPosition,
}: CanvasMapBackgroundProps) => {
  const { selectedMap } = useCanvas();
  const [mapImage] = useImage(selectedMap.minimap_src);

  return (
    mapImage && (
      <Image
        alt={selectedMap.text}
        image={mapImage}
        width={MAP_SIZE}
        height={MAP_SIZE}
        x={mapPosition.x + MAP_SIZE / 2}
        y={mapPosition.y + MAP_SIZE / 2}
        offsetX={MAP_SIZE / 2}
        offsetY={MAP_SIZE / 2}
        scale={{ x: 1.25, y: 1.25 }}
      />
    )
  );
};
