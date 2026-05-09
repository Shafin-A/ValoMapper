import React, { Ref } from "react";
import Konva from "konva";
import {
  Arrow,
  Ellipse,
  Group,
  Image as KonvaImage,
  Line,
  Rect,
  Text,
} from "react-konva";
import { useCanvas } from "@/contexts/canvas-context";
import {
  getTraversalDurationSeconds,
  getTraversalSelection,
  TRAVERSAL_TIME_BY_OPTION,
} from "@/lib/consts";
import type { DrawLine } from "@/lib/types";
import { Vector2d } from "konva/lib/types";
import useImage from "use-image";

const TRAVERSAL_RUN_ICON_SRC = "/agents/neon/high_gear.png";
const TRAVERSAL_WALK_ICON_SRC = "/footprints.svg";

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

const getContainedImageDimensions = (
  image: HTMLImageElement | undefined,
  maxWidth: number,
  maxHeight: number,
  fallback: { width: number; height: number },
) => {
  const imageWidth = image?.naturalWidth ?? image?.width;
  const imageHeight = image?.naturalHeight ?? image?.height;

  if (!imageWidth || !imageHeight) {
    return fallback;
  }

  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);

  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
  };
};

type TraversalLabelProps = {
  line: DrawLine;
  labelKey: string;
  labelText: string;
  labelPosition: { x: number; y: number };
};

const TraversalLabel = ({
  line,
  labelKey,
  labelText,
  labelPosition,
}: TraversalLabelProps) => {
  const traversalConfig = line.traversalTime
    ? TRAVERSAL_TIME_BY_OPTION[line.traversalTime]
    : null;
  const traversalSelection = getTraversalSelection(line.traversalTime);
  const isKnife = traversalSelection.weapon === "knife";
  const mainIconSrc = traversalConfig?.imageSrc;
  const movementIconSrc =
    traversalSelection.movement === "run"
      ? TRAVERSAL_RUN_ICON_SRC
      : traversalSelection.movement === "walk"
        ? TRAVERSAL_WALK_ICON_SRC
        : undefined;

  const [mainIcon] = useImage(mainIconSrc ?? "");
  const [movementIcon] = useImage(movementIconSrc ?? "");

  const labelHeight = 24;
  const paddingX = 8;
  const mainIconDimensions = mainIconSrc
    ? getContainedImageDimensions(mainIcon, isKnife ? 16 : 20, 12, {
        width: isKnife ? 16 : 20,
        height: isKnife ? 10 : 10,
      })
    : { width: 0, height: 0 };
  const movementIconDimensions = movementIconSrc
    ? getContainedImageDimensions(movementIcon, 10, 10, {
        width: 10,
        height: 10,
      })
    : { width: 0, height: 0 };
  const iconGap =
    mainIconDimensions.width && movementIconDimensions.width ? 4 : 0;
  const mainIconWidth = mainIconDimensions.width;
  const mainIconHeight = mainIconDimensions.height;
  const movementIconWidth = movementIconDimensions.width;
  const movementIconHeight = movementIconDimensions.height;
  const textGap = mainIconWidth || movementIconWidth ? 6 : 0;
  const iconsWidth = mainIconWidth + movementIconWidth + iconGap;
  const textX = paddingX + iconsWidth + textGap;
  const labelWidth = Math.max(76, textX + labelText.length * 8 + paddingX);
  const textWidth = labelWidth - textX - paddingX;
  const mainIconY = (labelHeight - mainIconHeight) / 2;
  const movementIconY = (labelHeight - movementIconHeight) / 2;

  return (
    <Group
      key={labelKey}
      x={labelPosition.x - labelWidth / 2}
      y={labelPosition.y - labelHeight / 2}
      listening={false}
    >
      <Rect
        isListening={false}
        width={labelWidth}
        height={labelHeight}
        cornerRadius={2}
        fill="#18181bcc"
        stroke={"#18181b"}
        strokeWidth={1.5}
      />
      {mainIcon && (
        <KonvaImage
          isListening={false}
          image={mainIcon}
          x={paddingX}
          y={mainIconY}
          width={mainIconWidth}
          height={mainIconHeight}
        />
      )}
      {movementIcon && (
        <KonvaImage
          isListening={false}
          image={movementIcon}
          x={paddingX + mainIconWidth + iconGap}
          y={movementIconY}
          width={movementIconWidth}
          height={movementIconHeight}
        />
      )}
      <Text
        isListening={false}
        x={textX}
        text={labelText}
        width={textWidth}
        height={labelHeight}
        align="left"
        verticalAlign="middle"
        fontSize={13}
        fontStyle="bold"
        fill="#f8fafc"
      />
    </Group>
  );
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

  return (
    <TraversalLabel
      line={line}
      labelKey={key}
      labelText={labelText}
      labelPosition={labelPosition}
    />
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
