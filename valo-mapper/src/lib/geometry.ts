import type { DrawLine } from "@/lib/types";
import type { Vector2d } from "konva/lib/types";

export const doLinesIntersect = (
  p1: Vector2d,
  p2: Vector2d,
  p3: Vector2d,
  p4: Vector2d,
) => {
  const denominator =
    (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

  if (denominator === 0) return false;

  const ua =
    ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) /
    denominator;
  const ub =
    ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) /
    denominator;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
};

const getRectEdges = (p1: Vector2d, p2: Vector2d): [Vector2d, Vector2d][] => {
  const minX = Math.min(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxX = Math.max(p1.x, p2.x);
  const maxY = Math.max(p1.y, p2.y);
  return [
    [
      { x: minX, y: minY },
      { x: maxX, y: minY },
    ], // top
    [
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
    ], // right
    [
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ], // bottom
    [
      { x: minX, y: maxY },
      { x: minX, y: minY },
    ], // left
  ];
};

// Returns true if the line segment (p1→p2) intersects the ellipse with centre (cx,cy)
// and semi-axes (rx, ry). Uses exact analytic intersection via quadratic formula.
const doesSegmentIntersectEllipse = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  p1: Vector2d,
  p2: Vector2d,
): boolean => {
  if (rx <= 0 || ry <= 0) return false;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const fx = p1.x - cx;
  const fy = p1.y - cy;

  const a = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);

  if (a === 0) return false;

  const b = 2 * ((fx * dx) / (rx * rx) + (fy * dy) / (ry * ry));
  const c = (fx * fx) / (rx * rx) + (fy * fy) / (ry * ry) - 1;

  const disc = b * b - 4 * a * c;

  if (disc < 0) return false;

  const sqrtDisc = Math.sqrt(disc);

  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
};

export const doesEraserIntersect = (
  eraserPoints: Vector2d[],
  existingStrokes: DrawLine[],
) => {
  const existingPencilStrokes = existingStrokes.filter(
    (stroke) => stroke.tool === "pencil",
  );

  for (const stroke of existingPencilStrokes) {
    if (stroke.shape === "rectangle" && stroke.points.length === 2) {
      const edges = getRectEdges(stroke.points[0], stroke.points[1]);
      for (let i = 0; i < eraserPoints.length - 1; i++) {
        const eraserP1 = eraserPoints[i];
        const eraserP2 = eraserPoints[i + 1];
        for (const [edgeP1, edgeP2] of edges) {
          if (doLinesIntersect(eraserP1, eraserP2, edgeP1, edgeP2)) {
            return true;
          }
        }
      }
      continue;
    }
    if (stroke.shape === "circle" && stroke.points.length === 2) {
      const cx = (stroke.points[0].x + stroke.points[1].x) / 2;
      const cy = (stroke.points[0].y + stroke.points[1].y) / 2;
      const radiusX = Math.abs(stroke.points[1].x - stroke.points[0].x) / 2;
      const radiusY = Math.abs(stroke.points[1].y - stroke.points[0].y) / 2;
      const tolerance = stroke.size / 2;
      for (let i = 0; i < eraserPoints.length - 1; i++) {
        if (
          doesSegmentIntersectEllipse(
            cx,
            cy,
            radiusX + tolerance,
            radiusY + tolerance,
            eraserPoints[i],
            eraserPoints[i + 1],
          )
        )
          return true;
      }
      continue;
    }
    for (let i = 0; i < eraserPoints.length - 1; i++) {
      const eraserP1 = eraserPoints[i];
      const eraserP2 = eraserPoints[i + 1];

      for (let j = 0; j < stroke.points.length - 1; j++) {
        const strokeP1 = stroke.points[j];
        const strokeP2 = stroke.points[j + 1];

        if (doLinesIntersect(eraserP1, eraserP2, strokeP1, strokeP2)) {
          return true;
        }
      }
    }
  }
  return false;
};

export const getIntersectingLines = (
  eraserPoints: Vector2d[],
  existingStrokes: DrawLine[],
): number[] => {
  const intersectingIndices: number[] = [];

  const drawableStrokes = existingStrokes.filter(
    (stroke) => stroke.tool !== "eraser",
  );

  for (
    let strokeIndex = 0;
    strokeIndex < drawableStrokes.length;
    strokeIndex++
  ) {
    const stroke = drawableStrokes[strokeIndex];
    let hasIntersection = false;

    for (let i = 0; i < eraserPoints.length - 1 && !hasIntersection; i++) {
      const eraserP1 = eraserPoints[i];
      const eraserP2 = eraserPoints[i + 1];

      if (stroke.shape === "rectangle" && stroke.points.length === 2) {
        const edges = getRectEdges(stroke.points[0], stroke.points[1]);
        for (const [edgeP1, edgeP2] of edges) {
          if (doLinesIntersect(eraserP1, eraserP2, edgeP1, edgeP2)) {
            hasIntersection = true;
            break;
          }
        }
      } else if (stroke.shape === "circle" && stroke.points.length === 2) {
        const cx = (stroke.points[0].x + stroke.points[1].x) / 2;
        const cy = (stroke.points[0].y + stroke.points[1].y) / 2;
        const radiusX = Math.abs(stroke.points[1].x - stroke.points[0].x) / 2;
        const radiusY = Math.abs(stroke.points[1].y - stroke.points[0].y) / 2;
        const tolerance = stroke.size / 2;
        if (
          doesSegmentIntersectEllipse(
            cx,
            cy,
            radiusX + tolerance,
            radiusY + tolerance,
            eraserP1,
            eraserP2,
          )
        )
          hasIntersection = true;
      } else {
        for (let j = 0; j < stroke.points.length - 1; j++) {
          const strokeP1 = stroke.points[j];
          const strokeP2 = stroke.points[j + 1];

          if (doLinesIntersect(eraserP1, eraserP2, strokeP1, strokeP2)) {
            hasIntersection = true;
            break;
          }
        }
      }
    }

    if (hasIntersection) {
      const originalIndex = existingStrokes.findIndex((s) => s === stroke);
      if (originalIndex !== -1) {
        intersectingIndices.push(originalIndex);
      }
    }
  }

  return intersectingIndices;
};
