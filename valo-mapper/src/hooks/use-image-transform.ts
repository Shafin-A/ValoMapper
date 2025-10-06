import { useCanvas } from "@/contexts/canvas-context";
import {
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
} from "@/lib/utils";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useEffect, useRef, useState } from "react";

export const useImageTransform = () => {
  const { imagesOnCanvas, setImagesOnCanvas, editingTextId } = useCanvas();

  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);

  const imageNodeRefs = useRef<Map<string, Konva.Image>>(new Map());
  const imageLoaderRefs = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    imagesOnCanvas.forEach((imageItem) => {
      if (!imageLoaderRefs.current.has(imageItem.id)) {
        const img = new window.Image();
        img.src = imageItem.src;
        imageLoaderRefs.current.set(imageItem.id, img);
      }
    });
  }, [imagesOnCanvas]);

  const handleImageTransformEnd = useCallback(
    (imageId: string) => {
      const imageNode = imageNodeRefs.current.get(imageId);
      if (!imageNode) return;

      const scaleX = imageNode.scaleX();
      const scaleY = imageNode.scaleY();
      const newWidth = Math.max(5, imageNode.width() * scaleX);
      const newHeight = Math.max(5, imageNode.height() * scaleY);

      imageNode.setAttrs({
        width: newWidth,
        height: newHeight,
        scaleX: 1,
        scaleY: 1,
      });

      setImagesOnCanvas((prev) =>
        prev.map((item) =>
          item.id === imageId
            ? {
                ...item,
                width: newWidth,
                height: newHeight,
              }
            : item
        )
      );
    },
    [setImagesOnCanvas]
  );

  const handleImageMouseEnter = (
    e: KonvaEventObject<MouseEvent>,
    imageId: string
  ) => {
    if (editingTextId) return;
    handleMouseOverGrabCursor(e);
    setHoveredImageId(imageId);
  };

  const handleImageMouseLeave = (e: KonvaEventObject<MouseEvent>) => {
    if (editingTextId) return;
    handleMouseOutDefaultCursor(e);
    setHoveredImageId(null);
  };

  return {
    imageNodeRefs,
    imageLoaderRefs,
    hoveredImageId,
    handleImageMouseEnter,
    handleImageMouseLeave,
    handleImageTransformEnd,
    setHoveredImageId,
  };
};
