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
  setCurrentStroke: Dispatch<SetStateAction<DrawLine | null>>
) => {
  const { notifyLineDrawn, notifyLineRemoved } = useCollaborativeCanvas();
  const drawingBufferRef = useRef<Vector2d[]>([]);
  const currentLineRef = useRef<Konva.Line | Konva.Arrow>(null);
  const erasedLinesRef = useRef<Set<number>>(new Set());

  const handleDrawing = useCallback(() => {
    const worldPos = getWorldPointerPosition();
    if (!worldPos) return;

    if (!isDrawing.current) {
      isDrawing.current = true;
      drawingBufferRef.current = [worldPos];

      if (tool === "eraser" && eraserSettings.mode === "line") {
        erasedLinesRef.current.clear();
      }

      setCurrentStroke({
        id: getNextId("tool"),
        tool,
        points: [worldPos],
        color: drawSettings.color,
        size: tool === "eraser" ? eraserSettings.size : drawSettings.size,
        isDashed: drawSettings.isDashed,
        isArrowHead: drawSettings.isArrowHead,
      });
    } else {
      const lastPoint =
        drawingBufferRef.current[drawingBufferRef.current.length - 1];
      const distance = Math.sqrt(
        Math.pow(worldPos.x - lastPoint.x, 2) +
          Math.pow(worldPos.y - lastPoint.y, 2)
      );

      if (distance > 5) {
        drawingBufferRef.current.push(worldPos);

        if (tool === "eraser" && eraserSettings.mode === "line") {
          const currentSegment = [lastPoint, worldPos];
          const intersectingLineIndices = getIntersectingLines(
            currentSegment,
            drawLines
          );

          const newIntersections = intersectingLineIndices.filter(
            (index) => !erasedLinesRef.current.has(index)
          );

          if (newIntersections.length > 0) {
            newIntersections.forEach((index) => {
              erasedLinesRef.current.add(index);

              const removedLine = drawLines[index];

              if (removedLine) {
                notifyLineRemoved(removedLine.id);
              }
            });

            setDrawLines((prev) =>
              prev.filter((_, index) => !newIntersections.includes(index))
            );
          }
        }

        if (currentLineRef.current) {
          const flatPoints = drawingBufferRef.current.flatMap((p) => [
            p.x,
            p.y,
          ]);
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
      const finalStroke = {
        id: getNextId("tool"),
        tool,
        points: drawingBufferRef.current,
        color: drawSettings.color,
        size: tool === "eraser" ? eraserSettings.size : drawSettings.size,
        isDashed: drawSettings.isDashed,
        isArrowHead: drawSettings.isArrowHead,
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
