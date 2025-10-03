import React, { Ref } from "react";
import Konva from "konva";
import { Arrow, Line } from "react-konva";
import { useCanvas } from "@/contexts/canvas-context";

interface CanvasDrawLinesProps {
  currentLineRef: React.RefObject<Konva.Line | Konva.Arrow | null>;
}

export const CanvasDrawLines: React.FC<CanvasDrawLinesProps> = ({
  currentLineRef,
}) => {
  const { drawLines, currentStroke } = useCanvas();

  return (
    <>
      {drawLines.map((line, i) =>
        line.isArrowHead && line.tool !== "eraser" ? (
          <Arrow
            key={i}
            isListening={false}
            perfectDrawEnabled={false}
            points={line.points.flatMap((point) => [point.x, point.y])}
            stroke={line.color}
            strokeWidth={line.size}
            dash={line.isDashed ? [15, 10] : []}
            tension={1}
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
            tension={1}
            globalCompositeOperation={
              line.tool === "eraser" ? "destination-out" : "source-over"
            }
          />
        )
      )}

      {currentStroke &&
        (currentStroke.isArrowHead && currentStroke.tool !== "eraser" ? (
          <Arrow
            ref={currentLineRef as Ref<Konva.Arrow>}
            points={currentStroke.points.flatMap((point) => [point.x, point.y])}
            isListening={false}
            perfectDrawEnabled={false}
            tension={1}
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
            tension={1}
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
