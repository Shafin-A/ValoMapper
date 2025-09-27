import { CanvasIcon, CanvasIconProps } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import {
  handleMouseOutDefaultCursor,
  handleMouseOverGrabCursor,
  handleMouseOverPointerCursor,
} from "@/lib/utils";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { useRef, useState, useCallback, useEffect } from "react";
import { Circle, Group, Line } from "react-konva";

interface CanvasCurvableLineIconProps extends CanvasIconProps {
  maxDistance: number;
  lineStrokeWidth?: number;
  stroke: string;
  showHandle?: boolean;
  handleRadius?: number;
  handleColor?: string;
  handleStrokeColor?: string;
  initialPath?: Vector2d[];
}

export const CanvasCurvableLineIcon = ({
  id,
  isAlly,
  x,
  y,
  src,
  isListening,
  draggable = true,
  onDragEnd,
  borderOpacity,
  radius,
  maxDistance = 500,
  allyColor,
  enemyColor,
  lineStrokeWidth = 6,
  stroke,
  width,
  height,
  showHandle = true,
  handleRadius = 12,
  handleStrokeColor = "#ffffff",
  strokeWidth,
  initialPath = [],
}: CanvasCurvableLineIconProps) => {
  const groupRef = useRef<Konva.Group>(null);
  const handleRef = useRef<Konva.Circle>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [path, setPath] = useState<Vector2d[]>(initialPath);
  const [currentDistance, setCurrentDistance] = useState(0);

  const lastInitialPathRef = useRef<string>("");

  const { setAbilitiesOnCanvas } = useCanvas();

  const calculatePathDistance = useCallback((points: Vector2d[]): number => {
    if (points.length < 2) return 0;
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    return totalDistance;
  }, []);

  useEffect(() => {
    const currentSerialized = JSON.stringify(initialPath);
    if (currentSerialized !== lastInitialPathRef.current) {
      setPath(initialPath);
      lastInitialPathRef.current = currentSerialized;
      setCurrentDistance(calculatePathDistance(initialPath));
    }
  }, [calculatePathDistance, initialPath]);

  const getLinePoints = (): number[] => {
    const points: number[] = [];
    path.forEach((point) => {
      points.push(point.x, point.y);
    });
    return points;
  };

  const getEndPoint = (): Vector2d => {
    if (path.length === 0) {
      const iconRadius = Math.max(width || 32, height || 32) / 2;
      return { x: iconRadius + 5, y: 0 };
    }
    return path[path.length - 1];
  };

  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!groupRef.current) return;
    const className = e.target.getClassName();
    groupRef.current.draggable(className === "Line" || className === "Image");
  }, []);

  const handleDragStart = useCallback(() => {
    if (groupRef.current) {
      groupRef.current.draggable(draggable);
      groupRef.current.opacity(0.7);
    }
  }, [draggable]);

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (groupRef.current) {
        groupRef.current.draggable(draggable);
        groupRef.current.opacity(1);
      }
      onDragEnd?.(e);
    },
    [draggable, onDragEnd]
  );

  const updateAbilitiesState = useCallback(
    (finalPath: Vector2d[]) => {
      if (setAbilitiesOnCanvas) {
        setAbilitiesOnCanvas((prev) => {
          const index = prev.findIndex((ability) => ability.id === id);
          if (index === -1) return prev;
          const copy = [...prev];
          copy[index] = { ...copy[index], currentPath: finalPath };
          return copy;
        });
      }
    },
    [id, setAbilitiesOnCanvas]
  );

  const handlePathDrawing = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isListening) return;
      e.cancelBubble = true;

      const stage = e.target.getStage();
      if (!stage || !groupRef.current) return;

      setIsDrawing(true);

      const newPath: Vector2d[] =
        path.length > 0
          ? [...path]
          : [{ x: Math.max(width || 32, height || 32) / 2 + 5, y: 0 }];

      const handleMouseUp = () => {
        const finalPath = [...newPath];
        setIsDrawing(false);

        const finalDistance = calculatePathDistance(finalPath);
        setCurrentDistance(finalDistance);

        updateAbilitiesState(finalPath);

        stage.container().style.cursor = "default";

        stage.off(".pathdrawing");
      };

      const handleMouseMove = () => {
        if (!groupRef.current) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const groupPosition = groupRef.current.getAbsolutePosition();
        const stageScale = stage.scaleX();

        const localX = (pointer.x - groupPosition.x) / stageScale;
        const localY = (pointer.y - groupPosition.y) / stageScale;

        const lastPoint = newPath[newPath.length - 1];
        const distance = Math.sqrt(
          Math.pow(localX - lastPoint.x, 2) + Math.pow(localY - lastPoint.y, 2)
        );

        if (distance > 5) {
          const proposedPath = [...newPath, { x: localX, y: localY }];
          const currentTotalDistance = calculatePathDistance(proposedPath);

          if (currentTotalDistance >= maxDistance) {
            // Clamp directly to max distance
            const remaining = maxDistance - calculatePathDistance(newPath);
            const direction = Math.atan2(
              localY - lastPoint.y,
              localX - lastPoint.x
            );
            const finalPoint = {
              x: lastPoint.x + remaining * Math.cos(direction),
              y: lastPoint.y + remaining * Math.sin(direction),
            };

            newPath.push(finalPoint);

            setPath([...newPath]);
            setCurrentDistance(maxDistance);

            handleMouseUp();
            return;
          }

          newPath.push({ x: localX, y: localY });
          setPath([...newPath]);
          setCurrentDistance(currentTotalDistance);
        }
      };

      stage.on("mousemove.pathdrawing", handleMouseMove);
      stage.on("mouseup.pathdrawing", handleMouseUp);
      stage.on("mouseleave.pathdrawing", handleMouseUp);
    },
    [
      calculatePathDistance,
      height,
      isListening,
      maxDistance,
      path,
      updateAbilitiesState,
      width,
    ]
  );

  const handleMouseOver = (e: KonvaEventObject<MouseEvent>) => {
    if (!isListening) return;
    e.target.opacity(0.8);
    handleMouseOverPointerCursor(e);
  };

  const handleMouseOut = (e: KonvaEventObject<MouseEvent>) => {
    if (!isListening) return;
    e.target.opacity(0.6);
    handleMouseOutDefaultCursor(e);
  };

  const handleReset = () => {
    if (!isListening) return;
    setPath([]);
    setCurrentDistance(0);
    updateAbilitiesState([]);
  };

  const endPoint = getEndPoint();
  const progressPercentage = Math.min(
    (currentDistance / maxDistance) * 100,
    100
  );
  const constraintReached = progressPercentage >= 100;

  return (
    <Group
      id={id}
      ref={groupRef}
      x={x}
      y={y}
      isListening={isListening}
      draggable={draggable}
      onMouseOut={isListening ? handleMouseOutDefaultCursor : undefined}
      onMouseDown={isListening ? handleMouseDown : undefined}
      onDragStart={isListening ? handleDragStart : undefined}
      onDragEnd={isListening ? handleDragEnd : undefined}
    >
      {path.length > 1 && (
        <Line
          onMouseOver={isListening ? handleMouseOverGrabCursor : undefined}
          points={getLinePoints()}
          strokeWidth={lineStrokeWidth}
          stroke={stroke}
        />
      )}

      {showHandle && !constraintReached && (
        <Circle
          ref={handleRef}
          x={endPoint.x}
          y={endPoint.y}
          isListening={isListening}
          radius={handleRadius}
          fill={stroke}
          stroke={handleStrokeColor}
          strokeWidth={2}
          opacity={isDrawing ? 0.8 : 0.6}
          onMouseDown={handlePathDrawing}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        />
      )}

      {
        <Circle
          x={endPoint.x}
          y={endPoint.y - 25}
          isListening={isListening}
          radius={8}
          onClick={handleReset}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          fill={constraintReached ? "#e54646" : "#46e546"}
          opacity={0.6}
        />
      }

      <CanvasIcon
        id={id}
        isAlly={isAlly}
        x={0}
        y={0}
        src={src}
        isListening={isListening}
        draggable={false}
        width={width}
        height={height}
        radius={radius}
        borderOpacity={borderOpacity}
        strokeWidth={strokeWidth}
        allyColor={allyColor}
        enemyColor={enemyColor}
      />
    </Group>
  );
};
