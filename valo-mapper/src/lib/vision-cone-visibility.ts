export interface VisionMask {
  width: number;
  height: number;
  pixels: Uint8Array;
  enclosedRegionTags?: Int32Array;
}

export interface VisionConeMapFrame {
  centerX: number;
  centerY: number;
  renderScale: number;
  rotate180?: boolean;
}

export interface VisionConeVisibilityOptions {
  mask: VisionMask;
  frame: VisionConeMapFrame;
  origin: { x: number; y: number };
  directionDegrees: number;
  apertureDegrees: number;
  radius: number;
}

const maskPixelIndex = (
  mask: VisionMask,
  frame: VisionConeMapFrame,
  x: number,
  y: number,
) => {
  let mapX = (x - frame.centerX) / frame.renderScale + mask.width / 2;
  let mapY = (y - frame.centerY) / frame.renderScale + mask.height / 2;

  if (frame.rotate180) {
    mapX = mask.width - mapX;
    mapY = mask.height - mapY;
  }

  if (mapX < 0 || mapY < 0 || mapX >= mask.width || mapY >= mask.height) {
    return -1;
  }

  const pixelX = Math.min(mask.width - 1, Math.floor(mapX));
  const pixelY = Math.min(mask.height - 1, Math.floor(mapY));
  return pixelY * mask.width + pixelX;
};

const isPixelBlocked = (mask: VisionMask, index: number) => {
  if (index < 0) return true;
  const pixel = mask.pixels[index];
  return (pixel & 1) !== 0 || (pixel & 2) === 0;
};

const refineBlockedDistance = (
  mask: VisionMask,
  frame: VisionConeMapFrame,
  origin: { x: number; y: number },
  direction: { x: number; y: number },
  clearDistance: number,
  blockedDistance: number,
) => {
  let low = clearDistance;
  let high = blockedDistance;
  for (let iteration = 0; iteration < 10; iteration++) {
    const middle = (low + high) / 2;
    const index = maskPixelIndex(
      mask,
      frame,
      origin.x + direction.x * middle,
      origin.y + direction.y * middle,
    );
    if (isPixelBlocked(mask, index)) {
      high = middle;
    } else {
      low = middle;
    }
  }
  return low;
};

const enclosureExitDistance = (
  mask: VisionMask,
  frame: VisionConeMapFrame,
  origin: { x: number; y: number },
  direction: { x: number; y: number },
  startDistance: number,
  radius: number,
  originRegionId: number,
  sampleStep: number,
) => {
  let passedWall = false;
  const maxDistance = Math.min(radius, startDistance + frame.renderScale * 32);

  for (
    let distance = startDistance;
    distance <= maxDistance;
    distance += sampleStep
  ) {
    const index = maskPixelIndex(
      mask,
      frame,
      origin.x + direction.x * distance,
      origin.y + direction.y * distance,
    );
    if (index < 0) return null;

    const pixel = mask.pixels[index];
    if ((pixel & 1) !== 0) {
      passedWall = true;
      continue;
    }
    if ((pixel & 2) === 0) return null;

    const regionId = mask.enclosedRegionTags?.[index] ?? 0;
    if (regionId === originRegionId) return null;
    return passedWall ? distance : null;
  }

  return null;
};

export const traceVisionCone = ({
  mask,
  frame,
  origin,
  directionDegrees,
  apertureDegrees,
  radius,
}: VisionConeVisibilityOptions) => {
  const apertureRadians = (apertureDegrees * Math.PI) / 180;
  const rayCount = Math.max(
    1,
    Math.ceil(apertureDegrees),
    Math.ceil((apertureRadians * radius) / 1.5),
  );
  const startAngle = directionDegrees - apertureDegrees / 2;
  const points = [{ x: 0, y: 0 }];
  const sampleStep = Math.min(1, frame.renderScale / 2);
  const originIndex = maskPixelIndex(mask, frame, origin.x, origin.y);
  const originTag =
    originIndex < 0 ? 0 : (mask.enclosedRegionTags?.[originIndex] ?? 0);
  const originRegionId = originTag > 0 ? originTag : 0;

  for (let ray = 0; ray <= rayCount; ray++) {
    const angle =
      ((startAngle + (apertureDegrees * ray) / rayCount) * Math.PI) / 180;
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    let visibleDistance = radius;
    let exitedOriginEnclosure = false;
    let clearDistance = 0;

    for (
      let distance = sampleStep;
      distance <= radius;
      distance += sampleStep
    ) {
      const sampleX = origin.x + directionX * distance;
      const sampleY = origin.y + directionY * distance;
      const index = maskPixelIndex(mask, frame, sampleX, sampleY);
      if (isPixelBlocked(mask, index)) {
        if (originRegionId > 0 && !exitedOriginEnclosure) {
          const exitDistance = enclosureExitDistance(
            mask,
            frame,
            origin,
            { x: directionX, y: directionY },
            distance,
            radius,
            originRegionId,
            sampleStep,
          );
          if (exitDistance !== null) {
            exitedOriginEnclosure = true;
            clearDistance = exitDistance;
            distance = exitDistance - sampleStep;
            continue;
          }
        }
        visibleDistance = refineBlockedDistance(
          mask,
          frame,
          origin,
          { x: directionX, y: directionY },
          clearDistance,
          distance,
        );
        break;
      }
      clearDistance = distance;
    }

    points.push({
      x: directionX * visibleDistance,
      y: directionY * visibleDistance,
    });
  }

  return points;
};
