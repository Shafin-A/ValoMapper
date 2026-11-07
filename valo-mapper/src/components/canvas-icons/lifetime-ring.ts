type LifetimeRingContext = {
  save: () => void;
  restore: () => void;
  beginPath: () => void;
  arc: (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
  ) => void;
  stroke: () => void;
  setAttr: (attr: string, value: string | number) => void;
};

type LifetimeRingOptions = {
  radius: number;
  strokeWidth: number;
  color: string;
  progress: number;
  fadeFraction?: number;
  segments?: number;
  outlineColor?: string;
  outlineWidth?: number;
};

/**
 * Draws a clockwise lifetime ring. The elapsed fraction is transparent and
 * the leading edge fades softly into the remaining arc.
 */
export const drawLifetimeRing = (
  context: LifetimeRingContext,
  {
    radius,
    strokeWidth,
    color,
    progress,
    fadeFraction = 0.055,
    segments = 180,
    outlineColor,
    outlineWidth = 0,
  }: LifetimeRingOptions,
) => {
  const clamped = Math.max(0, Math.min(1, progress));
  context.save();
  context.setAttr("lineCap", "butt");

  const drawFullCircle = (passColor: string, passWidth: number) => {
    context.setAttr("globalAlpha", 1);
    context.setAttr("strokeStyle", passColor);
    context.setAttr("lineWidth", passWidth);
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  };

  const drawSegments = (passColor: string, passWidth: number) => {
    context.setAttr("strokeStyle", passColor);
    context.setAttr("lineWidth", passWidth);
    const step = (Math.PI * 2) / segments;
    const start = -Math.PI / 2;
    for (let index = 0; index < segments; index += 1) {
      const elapsed = index / segments;
      if (elapsed < clamped) {
        continue;
      }
      const edge = Math.min(1, (elapsed - clamped) / fadeFraction);
      const alpha = edge * edge * (3 - 2 * edge);
      if (alpha <= 0) {
        continue;
      }
      context.setAttr("globalAlpha", alpha);
      context.beginPath();
      context.arc(
        0,
        0,
        radius,
        start + index * step,
        start + (index + 1) * step + 0.002,
      );
      context.stroke();
    }
  };

  const hasOutline = Boolean(outlineColor) && outlineWidth > 0;
  const outlineStrokeWidth = strokeWidth + outlineWidth * 2;

  if (clamped <= 0) {
    if (hasOutline && outlineColor) {
      drawFullCircle(outlineColor, outlineStrokeWidth);
    }
    drawFullCircle(color, strokeWidth);
    context.restore();
    return;
  }
  if (clamped >= 1) {
    context.restore();
    return;
  }

  if (hasOutline && outlineColor) {
    drawSegments(outlineColor, outlineStrokeWidth);
  }
  drawSegments(color, strokeWidth);
  context.restore();
};
