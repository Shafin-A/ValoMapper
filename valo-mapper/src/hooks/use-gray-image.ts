import { useEffect, useState } from "react";
import useImage from "use-image";

export const useGrayImage = (
  src: string,
  isGray: boolean,
): HTMLCanvasElement | HTMLImageElement | undefined => {
  const [image] = useImage(src);
  const [grayCanvas, setGrayCanvas] = useState<
    HTMLCanvasElement | HTMLImageElement | undefined
  >(undefined);

  useEffect(() => {
    if (!image) {
      setGrayCanvas(undefined);
      return;
    }

    if (!isGray) {
      setGrayCanvas(undefined);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setGrayCanvas(undefined);
      return;
    }

    ctx.filter = "grayscale(1)";
    ctx.drawImage(image, 0, 0);

    setGrayCanvas(canvas);
  }, [image, isGray]);

  return isGray ? grayCanvas : image;
};
