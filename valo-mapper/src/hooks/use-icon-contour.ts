import { useMemo } from "react";
import {
  createIconContourCanvas,
  type IconContourGeometry,
} from "@/lib/icon-contour";

interface UseIconContourOptions {
  image: HTMLImageElement | undefined;
  color?: string;
  thickness: number;
  width: number;
  height: number;
}

export const useIconContour = ({
  image,
  color,
  thickness,
  width,
  height,
}: UseIconContourOptions): IconContourGeometry | null => {
  return useMemo(() => {
    if (!image || !color || thickness <= 0 || width <= 0 || height <= 0) {
      return null;
    }

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    if (!sourceWidth || !sourceHeight) {
      return null;
    }

    const contour = createIconContourCanvas(image, sourceWidth, sourceHeight, {
      color,
      thickness: thickness * (sourceWidth / width),
    });
    if (!contour) {
      return null;
    }

    const scaleX = width / sourceWidth;
    const scaleY = height / sourceHeight;
    const paddingX = contour.padding * scaleX;
    const paddingY = contour.padding * scaleY;

    return {
      image: contour.canvas,
      x: -paddingX,
      y: -paddingY,
      width: width + paddingX * 2,
      height: height + paddingY * 2,
    };
  }, [image, color, thickness, width, height]);
};
