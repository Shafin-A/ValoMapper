import { useCanvasActions, useCanvasUi } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import {
  type CanvasItemCollections,
  getCanvasItemWorldRect,
  getSelectableCanvasItems,
  isRectFullyInside,
  normalizeRect,
} from "@/lib/canvas-selection";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { Stage } from "konva/lib/Stage";
import type { Vector2d } from "konva/lib/types";
import { useCallback, useEffect, useRef } from "react";
import { canvasMarqueeStore } from "@/lib/canvas-marquee-store";

const DRAG_THRESHOLD = 5;

type RightDragState = {
  startClient: Vector2d;
  startWorld: Vector2d;
  currentWorld: Vector2d;
  targetNode: Konva.Node | null;
  moved: boolean;
};

type OnRightClick = (
  targetNode: Konva.Node | null,
  pointerPosition: Vector2d | null,
) => void;

interface UseCanvasSelectionOptions {
  stageRef: React.RefObject<Stage | null>;
  enabled: boolean;
  onRightClick: OnRightClick;
}

export const useCanvasSelection = ({
  stageRef,
  enabled,
  onRightClick,
}: UseCanvasSelectionOptions) => {
  const { setSelectedCanvasItems } = useCanvasUi();
  const { getRegisteredNode, getLatestEntities } = useCanvasActions();
  const { agentsSettings, abilitiesSettings } = useSettings();

  const stateRef = useRef<RightDragState | null>(null);
  const frameRef = useRef<number | null>(null);
  const windowMoveRef = useRef<((event: MouseEvent) => void) | null>(null);
  const windowUpRef = useRef<((event: MouseEvent) => void) | null>(null);
  const suppressContextMenuRef = useRef(false);

  const getCollections = useCallback((): CanvasItemCollections => {
    const entities = getLatestEntities();

    return {
      agentsOnCanvas: entities.agentsOnCanvas,
      abilitiesOnCanvas: entities.abilitiesOnCanvas,
      textsOnCanvas: entities.textsOnCanvas,
      imagesOnCanvas: entities.imagesOnCanvas,
      toolIconsOnCanvas: entities.toolIconsOnCanvas,
    };
  }, [getLatestEntities]);

  const latestRef = useRef({
    enabled,
    onRightClick,
    getCollections,
    settings: { agentsSettings, abilitiesSettings },
    setSelectedCanvasItems,
    getRegisteredNode,
  });
  latestRef.current = {
    enabled,
    onRightClick,
    getCollections,
    settings: { agentsSettings, abilitiesSettings },
    setSelectedCanvasItems,
    getRegisteredNode,
  };

  const getWorldPointer = useCallback((): Vector2d | null => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    const stagePosition = stage.position();
    const scale = stage.scaleX();

    return {
      x: (pointer.x - stagePosition.x) / scale,
      y: (pointer.y - stagePosition.y) / scale,
    };
  }, [stageRef]);

  const cancelScheduledMarquee = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const clearMarquee = useCallback(() => {
    cancelScheduledMarquee();
    canvasMarqueeStore.set(null);
  }, [cancelScheduledMarquee]);

  const removeWindowListeners = useCallback(() => {
    if (windowMoveRef.current) {
      window.removeEventListener("mousemove", windowMoveRef.current);
    }
    if (windowUpRef.current) {
      window.removeEventListener("mouseup", windowUpRef.current);
    }
  }, []);

  const finishRightDrag = useCallback(
    (event: MouseEvent | null) => {
      const state = stateRef.current;
      if (!state) return;

      stateRef.current = null;
      removeWindowListeners();

      // The browser may fire its native contextmenu event after mouseup,
      // possibly on the custom popover that is about to open.
      suppressContextMenuRef.current = true;
      window.setTimeout(() => {
        suppressContextMenuRef.current = false;
      }, 500);

      const stage = stageRef.current;
      if (!stage) {
        clearMarquee();
        return;
      }

      if (event) {
        stage.setPointersPositions(event);
        const finalWorldPointer = getWorldPointer();
        if (finalWorldPointer) {
          state.currentWorld = finalWorldPointer;
        }

        if (
          Math.hypot(
            event.clientX - state.startClient.x,
            event.clientY - state.startClient.y,
          ) > DRAG_THRESHOLD
        ) {
          state.moved = true;
        }
      }

      if (state.moved) {
        const marquee = normalizeRect(state.startWorld, state.currentWorld);
        const {
          getCollections,
          settings,
          setSelectedCanvasItems,
          getRegisteredNode,
        } = latestRef.current;

        const collections = getCollections();
        const selected = getSelectableCanvasItems(
          collections,
        ).filter((entry) => {
          const itemRect = getCanvasItemWorldRect(
            stage,
            entry,
            collections,
            settings,
            getRegisteredNode,
          );
          return itemRect ? isRectFullyInside(itemRect, marquee) : false;
        });

        setSelectedCanvasItems(selected);
        clearMarquee();
        return;
      }

      clearMarquee();

      if (!event) return;

      let pointerPosition: Vector2d | null = null;
      const containerRect = stage.container().getBoundingClientRect();
      const releasedInsideStage =
        event.clientX >= containerRect.left &&
        event.clientX <= containerRect.right &&
        event.clientY >= containerRect.top &&
        event.clientY <= containerRect.bottom;

      if (releasedInsideStage) {
        stage.setPointersPositions(event);
        pointerPosition = stage.getPointerPosition();
        latestRef.current.onRightClick(
          state.targetNode,
          pointerPosition ?? null,
        );
      }
    },
    [clearMarquee, getWorldPointer, removeWindowListeners, stageRef],
  );

  const handleWindowMove = useCallback(
    (event: MouseEvent) => {
      const state = stateRef.current;
      const stage = stageRef.current;
      if (!state || !stage) return;

      stage.setPointersPositions(event);
      const worldPointer = getWorldPointer();
      if (!worldPointer) return;

      state.currentWorld = worldPointer;

      const screenDistance = Math.hypot(
        event.clientX - state.startClient.x,
        event.clientY - state.startClient.y,
      );
      if (screenDistance > DRAG_THRESHOLD) {
        state.moved = true;
      }

      if (!state.moved) return;

      const marquee = normalizeRect(state.startWorld, state.currentWorld);
      cancelScheduledMarquee();
      frameRef.current = requestAnimationFrame(() => {
        canvasMarqueeStore.set(marquee);
      });
    },
    [cancelScheduledMarquee, getWorldPointer, stageRef],
  );

  const handleWindowUp = useCallback(
    (event: MouseEvent) => {
      finishRightDrag(event);
    },
    [finishRightDrag],
  );

  windowMoveRef.current = handleWindowMove;
  windowUpRef.current = handleWindowUp;

  const handleRightMouseDown = useCallback(
    (event: KonvaEventObject<MouseEvent>) => {
      if (!latestRef.current.enabled) return;
      if (event.evt.button !== 2) return;

      const stage = stageRef.current;
      if (!stage) return;

      event.evt.preventDefault();

      const worldPointer = getWorldPointer();
      if (!worldPointer) return;

      removeWindowListeners();
      clearMarquee();

      const targetNode =
        event.target && event.target !== stage ? event.target : null;

      stateRef.current = {
        startClient: { x: event.evt.clientX, y: event.evt.clientY },
        startWorld: worldPointer,
        currentWorld: worldPointer,
        targetNode,
        moved: false,
      };

      window.addEventListener("mousemove", handleWindowMove);
      window.addEventListener("mouseup", handleWindowUp);
    },
    [
      clearMarquee,
      getWorldPointer,
      handleWindowMove,
      handleWindowUp,
      removeWindowListeners,
      stageRef,
    ],
  );

  const cancel = useCallback(() => {
    stateRef.current = null;
    removeWindowListeners();
    clearMarquee();
  }, [clearMarquee, removeWindowListeners]);

  useEffect(() => {
    if (enabled) return;
    cancel();
  }, [cancel, enabled]);

  useEffect(() => {
    const handleContextMenu = (event: Event) => {
      if (stateRef.current || suppressContextMenuRef.current) {
        event.preventDefault();
      }
    };

    window.addEventListener("contextmenu", handleContextMenu, true);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, []);

  useEffect(
    () => () => {
      removeWindowListeners();
      cancelScheduledMarquee();
      canvasMarqueeStore.set(null);
    },
    [cancelScheduledMarquee, removeWindowListeners],
  );

  return {
    handleRightMouseDown,
    cancel,
  };
};
