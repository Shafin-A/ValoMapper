import {
  clearCanvasItemTapSuppression,
  markCanvasItemTapSuppressed,
} from "@/lib/canvas-long-press";
import {
  type CanvasItemCollections,
  resolveCanvasItemTarget,
} from "@/lib/canvas-selection";
import type {
  AbilityIconItem,
  Agent,
  CanvasSelectionItem,
  ToolIconCanvas,
} from "@/lib/types";
import type { KonvaEventObject, Node as KonvaNode } from "konva/lib/Node";
import type { Stage } from "konva/lib/Stage";
import type { Vector2d } from "konva/lib/types";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";

const TAP_MOVE_THRESHOLD_PX = 10;
const LONG_PRESS_MS = 500;

interface UseCanvasTouchGesturesOptions {
  stageRef: RefObject<Stage | null>;
  isDrawMode: boolean;
  isDrawing: RefObject<boolean>;
  selectedCanvasIcon: Agent | AbilityIconItem | ToolIconCanvas | null;
  isSidebarDragActive: boolean;
  editingTextId: string | null;
  getCollections: () => CanvasItemCollections;
  openContextMenu: (target: KonvaNode | null, pointer: Vector2d | null) => void;
  handleDrawing: () => void;
  handleStageClick: () => void;
  handleStagePointerUp: () => void;
  handleStageMouseMove: () => void;
  cancelDrawing: () => void;
  syncCurrentStageScale: () => void;
  selectedCanvasItems: CanvasSelectionItem[];
  setSelectedCanvasItems: Dispatch<SetStateAction<CanvasSelectionItem[]>>;
  handleZoomTouchStart: (e: KonvaEventObject<TouchEvent>) => void;
  handleZoomTouchMove: (e: KonvaEventObject<TouchEvent>) => void;
  handleZoomTouchEnd: (e: KonvaEventObject<TouchEvent>) => void;
}

export const useCanvasTouchGestures = ({
  stageRef,
  isDrawMode,
  isDrawing,
  selectedCanvasIcon,
  isSidebarDragActive,
  editingTextId,
  getCollections,
  openContextMenu,
  handleDrawing,
  handleStageClick,
  handleStagePointerUp,
  handleStageMouseMove,
  cancelDrawing,
  syncCurrentStageScale,
  selectedCanvasItems,
  setSelectedCanvasItems,
  handleZoomTouchStart,
  handleZoomTouchMove,
  handleZoomTouchEnd,
}: UseCanvasTouchGesturesOptions) => {
  const touchGestureRef = useRef({
    active: false,
    moved: false,
    multiTouch: false,
    longPress: false,
    startX: 0,
    startY: 0,
  });
  const longPressTimerRef = useRef<number | null>(null);

  const resetTouchGesture = useCallback(() => {
    touchGestureRef.current.active = false;
    touchGestureRef.current.moved = false;
    touchGestureRef.current.multiTouch = false;
    touchGestureRef.current.longPress = false;
    touchGestureRef.current.startX = 0;
    touchGestureRef.current.startY = 0;
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const startLongPressTimer = useCallback(() => {
    clearLongPressTimer();
    const collections = getCollections();

    if (
      isDrawMode ||
      selectedCanvasIcon ||
      isSidebarDragActive ||
      editingTextId
    ) {
      return;
    }

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;

      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) return;

      const target = stage.getIntersection(pointer);
      if (
        !target ||
        !resolveCanvasItemTarget(
          target as unknown as KonvaNode,
          collections,
        )
      ) {
        return;
      }

      touchGestureRef.current.longPress = true;
      markCanvasItemTapSuppressed();
      openContextMenu(target, pointer);

      // Fallback in case the sheet captures the eventual touchend.
      window.setTimeout(() => {
        resetTouchGesture();
        clearCanvasItemTapSuppression();
      }, 1500);
    }, LONG_PRESS_MS);
  }, [
    clearLongPressTimer,
    getCollections,
    editingTextId,
    isDrawMode,
    isSidebarDragActive,
    openContextMenu,
    resetTouchGesture,
    selectedCanvasIcon,
    stageRef,
  ]);

  const handleTouchStart = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      const gesture = touchGestureRef.current;

      if (touches.length > 1) {
        gesture.multiTouch = true;
        clearLongPressTimer();
        if (isDrawing.current) {
          cancelDrawing();
        }
      } else if (touches.length === 1 && !gesture.active) {
        const touch = touches[0];
        gesture.active = true;
        gesture.moved = false;
        gesture.multiTouch = false;
        gesture.startX = touch.clientX;
        gesture.startY = touch.clientY;
        startLongPressTimer();
      }

      handleZoomTouchStart(e);
      syncCurrentStageScale();

      if (isDrawMode && touches.length === 1 && !gesture.multiTouch) {
        handleDrawing();
      }
    },
    [
      cancelDrawing,
      clearLongPressTimer,
      handleDrawing,
      handleZoomTouchStart,
      isDrawMode,
      isDrawing,
      startLongPressTimer,
      syncCurrentStageScale,
    ],
  );

  const handleTouchMove = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      const gesture = touchGestureRef.current;

      if (touches.length > 1) {
        gesture.multiTouch = true;
        clearLongPressTimer();
        if (isDrawing.current) {
          cancelDrawing();
        }
      } else if (touches.length === 1 && gesture.active) {
        const touch = touches[0];
        const distance = Math.hypot(
          touch.clientX - gesture.startX,
          touch.clientY - gesture.startY,
        );

        if (distance > TAP_MOVE_THRESHOLD_PX) {
          gesture.moved = true;
          clearLongPressTimer();
        }
      }

      handleZoomTouchMove(e);
      syncCurrentStageScale();

      if (isDrawMode && !gesture.multiTouch) {
        handleStageMouseMove();
      }
    },
    [
      cancelDrawing,
      clearLongPressTimer,
      handleStageMouseMove,
      handleZoomTouchMove,
      isDrawMode,
      isDrawing,
      syncCurrentStageScale,
    ],
  );

  const handleTouchEnd = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const collections = getCollections();
      const gesture = touchGestureRef.current;
      const remainingTouches = e.evt.touches.length;
      const isCleanTap =
        gesture.active &&
        !gesture.moved &&
        !gesture.multiTouch &&
        !gesture.longPress;

      clearLongPressTimer();
      handleZoomTouchEnd(e);
      syncCurrentStageScale();

      if (isDrawMode) {
        if (isDrawing.current) {
          handleStagePointerUp();
        }
      } else if (isCleanTap && remainingTouches === 0) {
        // Konva updates pointer positions on touchend; make sure the lifted
        // touch is the position used for placement.
        const stage = stageRef.current;
        stage?.setPointersPositions(e.evt);

        const pointer = stage?.getPointerPosition();
        const intersection =
          stage && pointer ? stage.getIntersection(pointer) : null;
        const tappedItem = intersection
          ? resolveCanvasItemTarget(
              intersection as unknown as KonvaNode,
              collections,
            )
          : null;
        const tappedItemIsSelected =
          tappedItem !== null &&
          selectedCanvasItems.some(
            (item) =>
              item.id === tappedItem.id && item.type === tappedItem.type,
          );

        if (!tappedItemIsSelected) {
          setSelectedCanvasItems([]);
        }

        handleStageClick();
      }

      if (remainingTouches === 0) {
        resetTouchGesture();
        // Let the item's own tap handler see the suppression flag during this
        // event, then re-enable normal taps.
        window.setTimeout(clearCanvasItemTapSuppression, 0);
      }
    },
    [
      clearLongPressTimer,
      getCollections,
      handleStageClick,
      handleStagePointerUp,
      handleZoomTouchEnd,
      isDrawMode,
      isDrawing,
      resetTouchGesture,
      selectedCanvasItems,
      setSelectedCanvasItems,
      stageRef,
      syncCurrentStageScale,
    ],
  );

  const handleTouchCancel = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      clearLongPressTimer();

      if (isDrawing.current) {
        cancelDrawing();
      }

      handleZoomTouchEnd(e);
      syncCurrentStageScale();
      resetTouchGesture();
      window.setTimeout(clearCanvasItemTapSuppression, 0);
    },
    [
      cancelDrawing,
      clearLongPressTimer,
      handleZoomTouchEnd,
      isDrawing,
      resetTouchGesture,
      syncCurrentStageScale,
    ],
  );

  useEffect(
    () => () => {
      clearLongPressTimer();
      clearCanvasItemTapSuppression();
    },
    [clearLongPressTimer],
  );

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  };
};
