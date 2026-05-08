import React, { Ref } from "react";
import Konva from "konva";
import { Arrow, Ellipse, Group, Line, Rect, Text } from "react-konva";
import { useCanvas } from "@/contexts/canvas-context";
import { getTraversalDurationSeconds } from "@/lib/consts";
import type { DrawLine } from "@/lib/types";
import { Vector2d } from "konva/lib/types";

const getRectProps = (p1: Vector2d, p2: Vector2d) => ({
  x: Math.min(p1.x, p2.x),
  y: Math.min(p1.y, p2.y),
  width: Math.abs(p2.x - p1.x),
  height: Math.abs(p2.y - p1.y),
});

const getEllipseProps = (p1: Vector2d, p2: Vector2d) => ({
  x: (p1.x + p2.x) / 2,
  y: (p1.y + p2.y) / 2,
  radiusX: Math.abs(p2.x - p1.x) / 2,
  radiusY: Math.abs(p2.y - p1.y) / 2,
});

const getTraversalPathLength = (points: Vector2d[]) =>
  points
    .slice(1)
    .reduce(
      (total, point, index) =>
        total +
        Math.hypot(point.x - points[index].x, point.y - points[index].y),
      0,
    );

const getTraversalLabelText = (
  line: Pick<DrawLine, "points" | "shape" | "tool" | "traversalTime">,
) => {
  if (
    !line.traversalTime ||
    line.tool === "eraser" ||
    line.shape === "rectangle" ||
    line.shape === "circle" ||
    line.points.length < 2
  ) {
    return null;
  }

  const pathLength = getTraversalPathLength(line.points);
  if (pathLength < 1) {
    return null;
  }

  const traversalSeconds = getTraversalDurationSeconds(
    pathLength,
    line.traversalTime,
  );

  if (traversalSeconds === null) {
    return null;
  }

  return `${traversalSeconds.toFixed(1)}s`;
};

const getTraversalLabelPosition = (line: Pick<DrawLine, "points">) => {
  const lastPoint = line.points[line.points.length - 1];

  if (!lastPoint) {
    return null;
  }

  return {
    x: lastPoint.x + 14,
    y: lastPoint.y - 24,
  };
};

const renderTraversalLabel = (line: DrawLine, key: string) => {
  const labelText = getTraversalLabelText(line);
  if (!labelText) {
    return null;
  }

  const labelPosition = getTraversalLabelPosition(line);
  if (!labelPosition) {
    return null;
  }

  const labelWidth = Math.max(48, labelText.length * 9 + 18);
  const labelHeight = 24;

  return (
    <Group
      key={key}
      x={labelPosition.x - labelWidth / 2}
      y={labelPosition.y - labelHeight / 2}
      listening={false}
    >
      <Rect
        isListening={false}
        width={labelWidth}
        height={labelHeight}
        cornerRadius={999}
        fill="#0f172acc"
        stroke={line.color}
        strokeWidth={1.5}
      />
      <Text
        isListening={false}
        text={labelText}
        width={labelWidth}
        height={labelHeight}
        align="center"
        verticalAlign="middle"
        fontSize={13}
        fontStyle="bold"
        fill="#f8fafc"
      />
    </Group>
  );
};

interface CanvasDrawLinesProps {
  currentLineRef: React.RefObject<
    Konva.Line | Konva.Arrow | Konva.Rect | Konva.Ellipse | null
  >;
}

export const CanvasDrawLines: React.FC<CanvasDrawLinesProps> = ({
  currentLineRef,
}) => {
  const { drawLines, currentStroke } = useCanvas();

  return (
    <>
      {drawLines.map((line) => (
        <React.Fragment key={line.id}>
          {line.shape === "rectangle" && line.points.length === 2 ? (
            <Rect
              isListening={false}
              perfectDrawEnabled={false}
              {...getRectProps(line.points[0], line.points[1])}
              stroke={line.color}
              strokeWidth={line.size}
              dash={line.isDashed ? [15, 10] : []}
              fill="transparent"
              opacity={line.opacity ?? 1}
              globalCompositeOperation={"source-over"}
            />
          ) : line.shape === "circle" && line.points.length === 2 ? (
            <Ellipse
              isListening={false}
              perfectDrawEnabled={false}
              {...getEllipseProps(line.points[0], line.points[1])}
              stroke={line.color}
              strokeWidth={line.size}
              dash={line.isDashed ? [15, 10] : []}
              fill="transparent"
              opacity={line.opacity ?? 1}
              globalCompositeOperation={"source-over"}
            />
          ) : line.isArrowHead && line.tool !== "eraser" ? (
            <Arrow
              isListening={false}
              perfectDrawEnabled={false}
              points={line.points.flatMap((point) => [point.x, point.y])}
              stroke={line.color}
              strokeWidth={line.size}
              dash={line.isDashed ? [15, 10] : []}
              tension={line.shape === "straight" ? 0 : 1}
              opacity={line.opacity ?? 1}
              globalCompositeOperation={"source-over"}
            />
          ) : (
            <Line
              isListening={false}
              perfectDrawEnabled={false}
              points={line.points.flatMap((point) => [point.x, point.y])}
              stroke={line.color}
              strokeWidth={line.size}
              dash={line.isDashed && line.tool !== "eraser" ? [15, 10] : []}
              tension={line.shape === "straight" ? 0 : 1}
              opacity={line.tool === "eraser" ? 1 : (line.opacity ?? 1)}
              globalCompositeOperation={
                line.tool === "eraser" ? "destination-out" : "source-over"
              }
            />
          )}
          {renderTraversalLabel(line, `${line.id}-traversal-time`)}
        </React.Fragment>
      ))}

      {currentStroke &&
        (currentStroke.shape === "rectangle" ? (
          <>
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
              opacity={currentStroke.opacity ?? 1}
              globalCompositeOperation={"source-over"}
            />
            {renderTraversalLabel(
              currentStroke,
              `${currentStroke.id}-traversal-time-preview`,
            )}
          </>
        ) : currentStroke.shape === "circle" ? (
          <>
            <Ellipse
              ref={currentLineRef as Ref<Konva.Ellipse>}
              isListening={false}
              perfectDrawEnabled={false}
              x={currentStroke.points[0]?.x ?? 0}
              y={currentStroke.points[0]?.y ?? 0}
              radiusX={0}
              radiusY={0}
              stroke={currentStroke.color}
              strokeWidth={currentStroke.size}
              dash={currentStroke.isDashed ? [15, 10] : []}
              fill="transparent"
              opacity={currentStroke.opacity ?? 1}
              globalCompositeOperation={"source-over"}
            />
            {renderTraversalLabel(
              currentStroke,
              `${currentStroke.id}-traversal-time-preview`,
            )}
          </>
        ) : currentStroke.isArrowHead && currentStroke.tool !== "eraser" ? (
          <>
            <Arrow
              ref={currentLineRef as Ref<Konva.Arrow>}
              points={currentStroke.points.flatMap((point) => [
                point.x,
                point.y,
              ])}
              isListening={false}
              perfectDrawEnabled={false}
              tension={currentStroke.shape === "straight" ? 0 : 1}
              stroke={currentStroke.color}
              strokeWidth={currentStroke.size}
              dash={currentStroke.isDashed ? [15, 10] : []}
              opacity={currentStroke.opacity ?? 1}
              globalCompositeOperation={"source-over"}
            />
            {renderTraversalLabel(
              currentStroke,
              `${currentStroke.id}-traversal-time-preview`,
            )}
          </>
        ) : (
          <>
            <Line
              ref={currentLineRef as Ref<Konva.Line>}
              points={currentStroke.points.flatMap((point) => [
                point.x,
                point.y,
              ])}
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
              opacity={
                currentStroke.tool === "eraser"
                  ? 1
                  : (currentStroke.opacity ?? 1)
              }
              globalCompositeOperation={
                currentStroke.tool === "eraser"
                  ? "destination-out"
                  : "source-over"
              }
            />
            {renderTraversalLabel(
              currentStroke,
              `${currentStroke.id}-traversal-time-preview`,
            )}
          </>
        ))}
    </>
  );
};
