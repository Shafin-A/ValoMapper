import { DrawLine, DrawSettings, EraserSettings, Tool } from "@/lib/types";
import {
  doesEraserIntersect,
  getIntersectingLines,
  getNextId,
} from "@/lib/utils";
import Konva from "konva";
import { Vector2d } from "konva/lib/types";
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useRef,
} from "react";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";

export const useCanvasDrawing = (
  getWorldPointerPosition: () => Vector2d | null,
  isDrawing: RefObject<boolean>,
  tool: Tool,
  drawSettings: DrawSettings,
  eraserSettings: EraserSettings,
  drawLines: DrawLine[],
  setDrawLines: Dispatch<SetStateAction<DrawLine[]>>,
  setCurrentStroke: Dispatch<SetStateAction<DrawLine | null>>,
) => {
  const { notifyLineDrawn, notifyLineRemoved } = useCollaborativeCanvas();
  const drawingBufferRef = useRef<Vector2d[]>([]);
  const currentLineRef = useRef<Konva.Line | Konva.Arrow>(null);
  const erasedLineIdsRef = useRef<Set<string>>(new Set());

  const handleDrawing = useCallback(() => {
    const worldPos = getWorldPointerPosition();
    if (!worldPos) return;

    if (!isDrawing.current) {
      isDrawing.current = true;
      drawingBufferRef.current = [worldPos];

      if (tool === "eraser" && eraserSettings.mode === "line") {
        erasedLineIdsRef.current.clear();
      }

      setCurrentStroke({
        id: getNextId("tool"),
        tool,
        points: [worldPos],
        color: drawSettings.color,
        size: tool === "eraser" ? eraserSettings.size : drawSettings.size,
        isDashed: drawSettings.isDashed,
        isArrowHead: drawSettings.isArrowHead,
        shape: tool === "eraser" ? "freehand" : drawSettings.shape,
      });
    } else {
      const lastPoint =
        drawingBufferRef.current[drawingBufferRef.current.length - 1];
      const distance = Math.sqrt(
        Math.pow(worldPos.x - lastPoint.x, 2) +
          Math.pow(worldPos.y - lastPoint.y, 2),
      );

      if (distance > 5) {
        drawingBufferRef.current.push(worldPos);

        if (tool === "eraser" && eraserSettings.mode === "line") {
          const currentSegment = [lastPoint, worldPos];
          const intersectingLineIndices = getIntersectingLines(
            currentSegment,
            drawLines,
          );

          const newlyIntersectedLineIds = intersectingLineIndices
            .map((index) => drawLines[index]?.id)
            .filter((id): id is string => !!id)
            .filter((id) => !erasedLineIdsRef.current.has(id));

          if (newlyIntersectedLineIds.length > 0) {
            const newIntersectionIdSet = new Set(newlyIntersectedLineIds);

            newlyIntersectedLineIds.forEach((id) => {
              erasedLineIdsRef.current.add(id);
              notifyLineRemoved(id);
            });

            setDrawLines((prev) =>
              prev.filter((line) => !newIntersectionIdSet.has(line.id)),
            );
          }
        }

        if (currentLineRef.current) {
          const startPoint = drawingBufferRef.current[0];
          const flatPoints =
            tool === "pencil" && drawSettings.shape === "straight"
              ? [startPoint.x, startPoint.y, worldPos.x, worldPos.y]
              : drawingBufferRef.current.flatMap((p) => [p.x, p.y]);
          currentLineRef.current.points(flatPoints);
          currentLineRef.current.getLayer()?.batchDraw();
        }
      }
    }
  }, [
    drawSettings,
    eraserSettings,
    getWorldPointerPosition,
    isDrawing,
    setCurrentStroke,
    tool,
    drawLines,
    setDrawLines,
    notifyLineRemoved,
  ]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing.current && drawingBufferRef.current.length > 0) {
      const isStraightLine =
        tool === "pencil" && drawSettings.shape === "straight";
      const finalPoints = isStraightLine
        ? [
            drawingBufferRef.current[0],
            drawingBufferRef.current[drawingBufferRef.current.length - 1],
          ]
        : drawingBufferRef.current;
      const finalStroke = {
        id: getNextId("tool"),
        tool,
        points: finalPoints,
        color: drawSettings.color,
        size: tool === "eraser" ? eraserSettings.size : drawSettings.size,
        isDashed: drawSettings.isDashed,
        isArrowHead: drawSettings.isArrowHead,
        shape: tool === "eraser" ? ("freehand" as const) : drawSettings.shape,
      };

      if (tool === "eraser") {
        if (eraserSettings.mode === "line") {
          setCurrentStroke(null);
        } else {
          if (doesEraserIntersect(drawingBufferRef.current, drawLines)) {
            setDrawLines((prev) => [...prev, finalStroke]);
            notifyLineDrawn(finalStroke);
          }
          setCurrentStroke(null);
        }
      } else {
        setDrawLines((prev) => [...prev, finalStroke]);
        notifyLineDrawn(finalStroke);
        setCurrentStroke(null);
      }

      drawingBufferRef.current = [];
    }
    isDrawing.current = false;
  }, [
    isDrawing,
    tool,
    drawSettings,
    drawLines,
    setCurrentStroke,
    setDrawLines,
    eraserSettings,
    notifyLineDrawn,
  ]);

  return {
    handleDrawing,
    handleMouseUp,
    currentLineRef,
  };
};
