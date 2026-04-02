import {
  MAX_ZOOM_SCALE,
  MIN_ZOOM_SCALE,
  SCALE_FACTOR,
  SIDEBAR_WIDTH,
} from "@/lib/consts";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { useCallback, useEffect, useRef } from "react";

export const useCanvasZoom = (
  stageRef: React.RefObject<Stage | null>,
  baseScale: number,
  isDrawMode: boolean,
) => {
  const pinchInitialDistanceRef = useRef<number | null>(null);
  const pinchInitialScaleRef = useRef<number | null>(null);
  const pinchCenterRef = useRef<Vector2d | null>(null);
  const deleteGroupRef = useRef<Konva.Group | null>(null);

  const handleDragMove = useCallback(() => {
    const deleteGroup = deleteGroupRef.current;
    if (!deleteGroup) return;

    const stage = stageRef.current;
    if (!stage) return;

    const container = stage.container();
    const host = container.parentElement as HTMLElement | null;
    const containerWidth = host?.offsetWidth ?? container.offsetWidth;

    const SMALL_SCREEN_BREAKPOINT = 768;
    const isSmallScreen = containerWidth < SMALL_SCREEN_BREAKPOINT;

    const DELETE_ZONE_WIDTH = isSmallScreen ? 84 : 100;
    const PADDING = 20;
    const MOBILE_PADDING = 24;

    const rightInset = isSmallScreen ? MOBILE_PADDING : SIDEBAR_WIDTH + PADDING;
    const topInset = isSmallScreen ? MOBILE_PADDING : PADDING;

    const screenX = Math.max(
      PADDING,
      containerWidth - DELETE_ZONE_WIDTH - rightInset,
    );
    const screenY = topInset;

    const totalScale = stage.scaleX();
    const stagePos = stage.position();

    const worldX = (screenX - stagePos.x) / totalScale;
    const worldY = (screenY - stagePos.y) / totalScale;

    deleteGroup.position({
      x: worldX,
      y: worldY,
    });

    deleteGroup.scale({
      x: 1 / totalScale,
      y: 1 / totalScale,
    });
  }, [stageRef]);

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const currentZoomScale = stage.scaleX() / baseScale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo: Vector2d = {
        x: (pointer.x - stage.x()) / stage.scaleX(),
        y: (pointer.y - stage.y()) / stage.scaleX(),
      };

      let direction = e.evt.deltaY > 0 ? 1 : -1;
      if (e.evt.ctrlKey) {
        direction = -direction;
      }

      const newZoomScale =
        direction < 0
          ? currentZoomScale * SCALE_FACTOR
          : currentZoomScale / SCALE_FACTOR;

      const clampedZoomScale = Math.max(
        MIN_ZOOM_SCALE,
        Math.min(MAX_ZOOM_SCALE, newZoomScale),
      );

      const newTotalScale = baseScale * clampedZoomScale;
      stage.scale({ x: newTotalScale, y: newTotalScale });

      const newPos: Vector2d = {
        x: pointer.x - mousePointTo.x * newTotalScale,
        y: pointer.y - mousePointTo.y * newTotalScale,
      };

      stage.position(newPos);

      handleDragMove();
    },
    [handleDragMove, stageRef, baseScale],
  );

  const handleTouchStart = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      const stage = stageRef.current;
      if (!stage || touches.length !== 2) return;

      e.evt.preventDefault();
      if (stage.isDragging()) stage.stopDrag();
      stage.draggable(false);

      const rect = stage.container().getBoundingClientRect();
      const touchPoints: Vector2d[] = Array.from(touches).map((touch) => ({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }));

      const stagePos = stage.position();
      const totalScale = stage.scaleX();

      const worldPoints = touchPoints.map((p) => ({
        x: (p.x - stagePos.x) / totalScale,
        y: (p.y - stagePos.y) / totalScale,
      }));

      const dx = worldPoints[0].x - worldPoints[1].x;
      const dy = worldPoints[0].y - worldPoints[1].y;
      pinchInitialDistanceRef.current = Math.hypot(dx, dy);
      pinchInitialScaleRef.current = totalScale;
      pinchCenterRef.current = {
        x: (worldPoints[0].x + worldPoints[1].x) / 2,
        y: (worldPoints[0].y + worldPoints[1].y) / 2,
      };
    },
    [stageRef],
  );

  const handleTouchMove = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      const stage = stageRef.current;
      if (
        !stage ||
        touches.length !== 2 ||
        pinchInitialDistanceRef.current === null ||
        pinchInitialScaleRef.current === null ||
        !pinchCenterRef.current
      )
        return;

      e.evt.preventDefault();
      if (stage.isDragging()) stage.stopDrag();

      const rect = stage.container().getBoundingClientRect();
      const touchPoints: Vector2d[] = Array.from(touches).map((touch) => ({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }));

      const dx = touchPoints[0].x - touchPoints[1].x;
      const dy = touchPoints[0].y - touchPoints[1].y;
      const newDistance = Math.hypot(dx, dy);

      const newTotalScaleRaw =
        pinchInitialScaleRef.current *
        (newDistance / pinchInitialDistanceRef.current);

      const clampedZoomScale = Math.max(
        MIN_ZOOM_SCALE,
        Math.min(MAX_ZOOM_SCALE, newTotalScaleRaw / baseScale),
      );
      const newTotalScale = clampedZoomScale * baseScale;

      const centerScreen: Vector2d = {
        x: (touchPoints[0].x + touchPoints[1].x) / 2,
        y: (touchPoints[0].y + touchPoints[1].y) / 2,
      };

      stage.scale({ x: newTotalScale, y: newTotalScale });

      const newPos: Vector2d = {
        x: centerScreen.x - pinchCenterRef.current.x * newTotalScale,
        y: centerScreen.y - pinchCenterRef.current.y * newTotalScale,
      };

      stage.position(newPos);
      handleDragMove();
    },
    [baseScale, handleDragMove, stageRef],
  );

  const handleTouchEnd = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      if (e.evt.touches.length <= 1) {
        pinchInitialDistanceRef.current = null;
        pinchInitialScaleRef.current = null;
        pinchCenterRef.current = null;

        const stage = stageRef.current;
        if (stage) {
          stage.draggable(!isDrawMode);
        }
      }
    },
    [isDrawMode, stageRef],
  );

  useEffect(() => {
    const updateDeleteZonePosition = () => {
      handleDragMove();
    };

    const rafId = window.requestAnimationFrame(updateDeleteZonePosition);
    window.addEventListener("resize", updateDeleteZonePosition);
    window.addEventListener("orientationchange", updateDeleteZonePosition);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateDeleteZonePosition);
      window.removeEventListener("orientationchange", updateDeleteZonePosition);
    };
  }, [handleDragMove]);

  return {
    deleteGroupRef,
    handleDragMove,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};
