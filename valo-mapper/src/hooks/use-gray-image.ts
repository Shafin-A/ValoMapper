import { useEffect, useState } from "react";

export const useGrayImage = (
  image: HTMLImageElement | undefined,
  isGray: boolean,
): HTMLCanvasElement | HTMLImageElement | undefined => {
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

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      setGrayCanvas(undefined);
      return;
    }

    ctx.drawImage(image, 0, 0);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      for (let index = 0; index < pixels.length; index += 4) {
        const gray =
          pixels[index] * 0.299 +
          pixels[index + 1] * 0.587 +
          pixels[index + 2] * 0.114;

        pixels[index] = gray;
        pixels[index + 1] = gray;
        pixels[index + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Cross-origin images taint the canvas; fall back to the native filter.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = "grayscale(1)";
      ctx.drawImage(image, 0, 0);
    }

    setGrayCanvas(canvas);
  }, [image, isGray]);

  return isGray ? grayCanvas : image;
};
