import useImage from "use-image";
import { Image, Group } from "react-konva";
import { MAP_SIZE } from "@/lib/consts";
import { Vector2d } from "konva/lib/types";
import { useCanvas } from "@/contexts/canvas-context";
import { RefObject, useEffect, useRef, useState } from "react";
import { Stage as KonvaStage } from "konva/lib/Stage";
import Konva from "konva";

interface CanvasMapBackgroundProps {
  mapPosition: Vector2d;
}

interface CachedMap {
  id: string;
  image: HTMLImageElement;
}

export const CanvasMapBackground = ({
  mapPosition,
  stageRef,
}: CanvasMapBackgroundProps & { stageRef: RefObject<KonvaStage | null> }) => {
  const { selectedMap, mapSide, setIsMapTransitioning } = useCanvas();
  const [mapImage, status] = useImage(`/maps/minimaps/${selectedMap.id}.webp`);

  const [currentMap, setCurrentMap] = useState<CachedMap | null>(null);
  const [previousMap, setPreviousMap] = useState<CachedMap | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentImageRef = useRef<Konva.Image>(null);
  const prevImageRef = useRef<Konva.Image>(null);

  useEffect(() => {
    if (currentMap && selectedMap.id !== currentMap.id) {
      setIsMapTransitioning(true);
    }
  }, [selectedMap.id, currentMap, setIsMapTransitioning]);

  useEffect(() => {
    if (status === "loaded" && mapImage && selectedMap.id !== currentMap?.id) {
      if (currentMap && !isTransitioning) {
        setIsTransitioning(true);
        setPreviousMap(currentMap);
        setCurrentMap({ id: selectedMap.id, image: mapImage });
      } else if (!currentMap) {
        setCurrentMap({ id: selectedMap.id, image: mapImage });
      }

      if (stageRef.current) {
        stageRef.current.batchDraw();
      }
    }
  }, [status, mapImage, selectedMap.id, currentMap, stageRef, isTransitioning]);

  useEffect(() => {
    if (isTransitioning && previousMap && currentMap) {
      const animationId = requestAnimationFrame(() => {
        prevImageRef.current?.to({
          opacity: 0,
          duration: 0.15,
          onFinish: () => {
            setPreviousMap(null);
            setIsTransitioning(false);
            setIsMapTransitioning(false);
          },
        });

        if (currentImageRef.current) {
          currentImageRef.current.opacity(0);
          currentImageRef.current.to({
            opacity: 1,
            duration: 0.15,
          });
        }
      });

      return () => {
        cancelAnimationFrame(animationId);
      };
    }
  }, [isTransitioning, previousMap, currentMap, setIsMapTransitioning]);

  const commonProps = {
    width: MAP_SIZE,
    height: MAP_SIZE,
    x: mapPosition.x + MAP_SIZE / 2,
    y: mapPosition.y + MAP_SIZE / 2,
    offsetX: MAP_SIZE / 2,
    offsetY: MAP_SIZE / 2,
    scale: { x: 1.25, y: 1.25 },
    rotation: mapSide === "defense" ? 0 : 180,
  };

  return (
    <Group>
      {previousMap && (
        <Image
          ref={prevImageRef}
          alt={"Previous map"}
          image={previousMap.image}
          {...commonProps}
          opacity={1}
        />
      )}

      {currentMap && (
        <Image
          ref={currentImageRef}
          alt={selectedMap.text}
          image={currentMap.image}
          {...commonProps}
          opacity={previousMap ? 0 : 1}
        />
      )}
    </Group>
  );
};
