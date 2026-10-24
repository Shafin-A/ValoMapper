export interface IconContourOptions {
  color: string;
  thickness: number;
  steps?: number;
}

export interface IconContourCanvas {
  canvas: HTMLCanvasElement;
  padding: number;
}

export interface IconContourGeometry {
  image: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_CONTOUR_STEPS = 16;

/**
 * Konva can only stroke an image's bounding box, not its alpha contour.
 * To get an outline that follows the artwork we pre-render it offscreen:
 * stamp the silhouette around a small circle (dilating the alpha), tint the
 * result, then punch the original silhouette back out so only the ring stays.
 */
export const createIconContourCanvas = (
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  { color, thickness, steps = DEFAULT_CONTOUR_STEPS }: IconContourOptions,
): IconContourCanvas | null => {
  if (
    typeof document === "undefined" ||
    !sourceWidth ||
    !sourceHeight ||
    !color ||
    thickness <= 0
  ) {
    return null;
  }

  const padding = Math.max(1, Math.ceil(thickness));

  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth + padding * 2;
  canvas.height = sourceHeight + padding * 2;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  getIconContourOffsets(thickness, steps).forEach(({ x, y }) => {
    context.drawImage(
      image,
      padding + x,
      padding + y,
      sourceWidth,
      sourceHeight,
    );
  });

  context.globalCompositeOperation = "source-in";
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalCompositeOperation = "destination-out";
  context.drawImage(image, padding, padding, sourceWidth, sourceHeight);

  context.globalCompositeOperation = "source-over";

  return { canvas, padding };
};

export const getIconContourOffsets = (
  thickness: number,
  steps = DEFAULT_CONTOUR_STEPS,
) => {
  const resolvedSteps = Math.max(1, Math.round(steps));
  const offsets: { x: number; y: number }[] = [];

  for (let step = 0; step < resolvedSteps; step += 1) {
    const angle = (step * Math.PI * 2) / resolvedSteps;

    offsets.push({
      x: Math.cos(angle) * thickness,
      y: Math.sin(angle) * thickness,
    });
  }

  return offsets;
};
