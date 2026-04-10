import React, { Ref } from "react";
import Konva from "konva";
import { Arrow, Line, Rect } from "react-konva";
import { useCanvas } from "@/contexts/canvas-context";
import { Vector2d } from "konva/lib/types";

const getRectProps = (p1: Vector2d, p2: Vector2d) => ({
  x: Math.min(p1.x, p2.x),
  y: Math.min(p1.y, p2.y),
  width: Math.abs(p2.x - p1.x),
  height: Math.abs(p2.y - p1.y),
});

interface CanvasDrawLinesProps {
  currentLineRef: React.RefObject<Konva.Line | Konva.Arrow | Konva.Rect | null>;
}

export const CanvasDrawLines: React.FC<CanvasDrawLinesProps> = ({
  currentLineRef,
}) => {
  const { drawLines, currentStroke } = useCanvas();

  return (
    <>
      {drawLines.map((line, i) =>
        line.shape === "rectangle" && line.points.length === 2 ? (
          <Rect
            key={i}
            isListening={false}
            perfectDrawEnabled={false}
            {...getRectProps(line.points[0], line.points[1])}
            stroke={line.color}
            strokeWidth={line.size}
            dash={line.isDashed ? [15, 10] : []}
            fill="transparent"
            globalCompositeOperation={"source-over"}
          />
        ) : line.isArrowHead && line.tool !== "eraser" ? (
          <Arrow
            key={i}
            isListening={false}
            perfectDrawEnabled={false}
            points={line.points.flatMap((point) => [point.x, point.y])}
            stroke={line.color}
            strokeWidth={line.size}
            dash={line.isDashed ? [15, 10] : []}
            tension={line.shape === "straight" ? 0 : 1}
            globalCompositeOperation={"source-over"}
          />
        ) : (
          <Line
            key={i}
            isListening={false}
            perfectDrawEnabled={false}
            points={line.points.flatMap((point) => [point.x, point.y])}
            stroke={line.color}
            strokeWidth={line.size}
            dash={line.isDashed && line.tool !== "eraser" ? [15, 10] : []}
            tension={line.shape === "straight" ? 0 : 1}
            globalCompositeOperation={
              line.tool === "eraser" ? "destination-out" : "source-over"
            }
          />
        ),
      )}

      {currentStroke &&
        (currentStroke.shape === "rectangle" ? (
          <Rect
            ref={currentLineRef as Ref<Konva.Rect>}
            isListening={false}
            perfectDrawEnabled={false}
            x={currentStroke.points[0]?.x ?? 0}
            y={currentStroke.points[0]?.y ?? 0}
            width={0}
            height={0}
            stroke={currentStroke.color}
            strokeWidth={currentStroke.size}
            dash={currentStroke.isDashed ? [15, 10] : []}
            fill="transparent"
            globalCompositeOperation={"source-over"}
          />
        ) : currentStroke.isArrowHead && currentStroke.tool !== "eraser" ? (
          <Arrow
            ref={currentLineRef as Ref<Konva.Arrow>}
            points={currentStroke.points.flatMap((point) => [point.x, point.y])}
            isListening={false}
            perfectDrawEnabled={false}
            tension={currentStroke.shape === "straight" ? 0 : 1}
            stroke={currentStroke.color}
            strokeWidth={currentStroke.size}
            dash={currentStroke.isDashed ? [15, 10] : []}
            globalCompositeOperation={"source-over"}
          />
        ) : (
          <Line
            ref={currentLineRef as Ref<Konva.Line>}
            points={currentStroke.points.flatMap((point) => [point.x, point.y])}
            isListening={false}
            perfectDrawEnabled={false}
            tension={currentStroke.shape === "straight" ? 0 : 1}
            stroke={currentStroke.color}
            strokeWidth={currentStroke.size}
            dash={
              currentStroke.isDashed && currentStroke.tool !== "eraser"
                ? [15, 10]
                : []
            }
            globalCompositeOperation={
              currentStroke.tool === "eraser"
                ? "destination-out"
                : "source-over"
            }
          />
        ))}
    </>
  );
};
