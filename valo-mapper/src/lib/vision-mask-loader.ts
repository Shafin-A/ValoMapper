import { VisionMask } from "@/lib/vision-cone-visibility";

const maskPromises = new Map<string, Promise<VisionMask>>();

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${source}.`));
    image.src = source;
  });

export const loadVisionMask = (source: string) => {
  const cached = maskPromises.get(source);
  if (cached) return cached;

  const regionSource = source.replace("/vision-masks/", "/vision-regions/");
  const promise = Promise.all([
    loadImage(source),
    loadImage(regionSource),
  ]).then(([image, regionImage]) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Could not read the map vision mask.");
    }

    context.drawImage(image, 0, 0);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixels = new Uint8Array(canvas.width * canvas.height);
    for (let pixel = 0; pixel < pixels.length; pixel++) {
      const offset = pixel * 4;
      if (rgba[offset] > 127) pixels[pixel] |= 1;
      if (rgba[offset + 1] > 127) pixels[pixel] |= 2;
    }

    const regionCanvas = document.createElement("canvas");
    regionCanvas.width = regionImage.naturalWidth;
    regionCanvas.height = regionImage.naturalHeight;
    if (
      regionCanvas.width !== canvas.width ||
      regionCanvas.height !== canvas.height
    ) {
      throw new Error("Map vision mask region dimensions do not match.");
    }
    const regionContext = regionCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!regionContext) {
      throw new Error("Could not read the map vision regions.");
    }
    regionContext.drawImage(regionImage, 0, 0);
    const encodedTags = regionContext.getImageData(
      0,
      0,
      regionCanvas.width,
      regionCanvas.height,
    ).data;
    const enclosedRegionTags = new Int32Array(pixels.length);
    for (let pixel = 0; pixel < enclosedRegionTags.length; pixel++) {
      const offset = pixel * 4;
      const encoded =
        encodedTags[offset] * 65536 +
        encodedTags[offset + 1] * 256 +
        encodedTags[offset + 2];
      const regionId = encoded & 0x7fffff;
      enclosedRegionTags[pixel] = encoded & 0x800000 ? -regionId : regionId;
    }

    return {
      width: canvas.width,
      height: canvas.height,
      pixels,
      enclosedRegionTags,
    };
  });

  maskPromises.set(source, promise);
  void promise.catch(() => maskPromises.delete(source));
  return promise;
};
