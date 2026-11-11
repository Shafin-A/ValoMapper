import { useCanvas, useCanvasActions } from "@/contexts/canvas-context";
import { useSetCurrentStroke } from "@/contexts/drawing-preview-context";
import { useSettings } from "@/contexts/settings-context";
import {
  applyVisionConeAttachment,
  canAttachVisionCone,
  createDefaultAttachedVisionCone,
  findVisionConeAttachmentTarget,
} from "@/lib/vision-cone-utils";
import {
  canAttachToolIcon,
  findToolIconAttachmentTarget,
  getToolIconAttachmentPosition,
} from "@/lib/tool-icon";
import { TEMP_DRAG_ID } from "@/lib/consts";
import { getNextId, isAgent } from "@/lib/utils";
import {
  clearCanvasItemTapSuppression,
  markCanvasItemTapSuppressed,
} from "@/lib/canvas-long-press";
import {
  type CanvasItemCollections,
  resolveCanvasItemTarget,
} from "@/lib/canvas-selection";
import { Stage } from "konva/lib/Stage";
import type Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { useCallback, useRef, useEffect, useMemo } from "react";
import { useCanvasContextMenu } from "./use-canvas-context-menu";
import { useCanvasDrawing } from "./use-canvas-drawing";
import { useCanvasSelection } from "./use-canvas-selection";
import { useCanvasSelectionDrag } from "./use-canvas-selection-drag";
import { useCanvasZoom } from "./use-canvas-zoom";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";

const PENCIL_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%23000' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'/%3E%3Cpath d='m15 5 4 4'/%3E%3C/svg%3E") 5 18, crosshair`;
const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2'/%3E%3C/svg%3E") 12 12, crosshair`;
const TAP_MOVE_THRESHOLD_PX = 10;
const LONG_PRESS_MS = 500;

const setContainerCursor = (stage: Stage, cursor: string) => {
  const container = stage.container();
  if (container.style.cursor !== cursor) {
    container.style.cursor = cursor;
  }
};

export const useCanvasEvents = (
  stageRef: React.RefObject<Stage | null>,
  baseScale: number,
  enableMultiSelect = true,
  selectionOutlineGroupRef?: React.RefObject<Konva.Group | null>,
) => {
  const {
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    selectedCanvasItems,
    setSelectedCanvasItems,
    isSidebarDragActive,
    setIsSidebarDragActive,
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    textsOnCanvas,
    setTextsOnCanvas,
    imagesOnCanvas,
    setImagesOnCanvas,
    toolIconsOnCanvas,
    setToolIconsOnCanvas,
    isDrawMode,
    editingTextId,
    isDrawing,
    drawLines,
    setDrawLines,
    connectingLines,
    setConnectingLines,
    tool,
  } = useCanvas();

  const setCurrentStroke = useSetCurrentStroke();
  const { setCurrentStageScale } = useCanvasActions();

  const { agentsSettings, abilitiesSettings, drawSettings, eraserSettings } =
    useSettings();

  const {
    notifyAgentAdded,
    notifyAbilityAdded,
    notifyAbilityRemoved,
    notifyToolIconAdded,
  } = useCollaborativeCanvas();

  const frameRef = useRef<number | null>(null);
  const touchGestureRef = useRef({
    active: false,
    moved: false,
    multiTouch: false,
    longPress: false,
    startX: 0,
    startY: 0,
  });
  const longPressTimerRef = useRef<number | null>(null);

  const setCursorForCurrentTool = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !stage.container) return;

    if (isDrawMode) {
      if (tool === "pencil") {
        setContainerCursor(stage, PENCIL_CURSOR);
      } else if (tool === "eraser") {
        setContainerCursor(stage, ERASER_CURSOR);
      }
    } else {
      setContainerCursor(stage, "default");
    }
  }, [isDrawMode, tool, stageRef]);

  const getWorldPointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pos = stage.getPointerPosition();
    if (!pos) return null;

    const stagePos = stage.position();
    const totalScale = stage.scaleX();

    return {
      x: (pos.x - stagePos.x) / totalScale,
      y: (pos.y - stagePos.y) / totalScale,
    };
  }, [stageRef]);

  const removeTempDragIcon = useCallback(() => {
    if (!selectedCanvasIcon) return;

    if (isAgent(selectedCanvasIcon)) {
      setAgentsOnCanvas((prev) =>
        prev.filter((icon) => icon.id !== TEMP_DRAG_ID),
      );
    } else if ("action" in selectedCanvasIcon) {
      setAbilitiesOnCanvas((prev) =>
        prev.filter((icon) => icon.id !== TEMP_DRAG_ID),
      );
    } else {
      setToolIconsOnCanvas((prev) =>
        prev.filter((icon) => icon.id !== TEMP_DRAG_ID),
      );
    }

    setSelectedCanvasIcon(null);
    setIsSidebarDragActive(false);
  }, [
    selectedCanvasIcon,
    setAbilitiesOnCanvas,
    setAgentsOnCanvas,
    setToolIconsOnCanvas,
    setSelectedCanvasIcon,
    setIsSidebarDragActive,
  ]);

  const {
    deleteGroupRef,
    handleDragMove,
    handleWheel: handleZoomWheel,
    handleTouchStart: handleZoomTouchStart,
    handleTouchMove: handleZoomTouchMove,
    handleTouchEnd: handleZoomTouchEnd,
  } = useCanvasZoom(stageRef, baseScale, isDrawMode);

  const scaleFrameRef = useRef<number | null>(null);

  const syncCurrentStageScale = useCallback(() => {
    if (scaleFrameRef.current !== null) return;

    scaleFrameRef.current = requestAnimationFrame(() => {
      scaleFrameRef.current = null;
      const stage = stageRef.current;
      if (!stage) return;
      setCurrentStageScale(stage.scaleX());
    });
  }, [stageRef, setCurrentStageScale]);

  useEffect(
    () => () => {
      if (scaleFrameRef.current !== null) {
        cancelAnimationFrame(scaleFrameRef.current);
        scaleFrameRef.current = null;
      }
    },
    [],
  );

  const handleWheel = useCallback(
    (e: Parameters<typeof handleZoomWheel>[0]) => {
      handleZoomWheel(e);
      syncCurrentStageScale();
    },
    [handleZoomWheel, syncCurrentStageScale],
  );

  const { handleDrawing, handleMouseUp, cancelDrawing, currentLineRef } =
    useCanvasDrawing(
      getWorldPointerPosition,
      isDrawing,
      tool,
      drawSettings,
      eraserSettings,
      drawLines,
      setDrawLines,
      setCurrentStroke,
    );

  const {
    contextMenu,
    openContextMenu,
    handleContextMenu,
    handlePopoverOpenChange,
    handleDuplicate,
    handleDelete,
    handleToggleAlly,
    handleToggleAgentDead,
    handleSwapAbility,
    handleToggleAbilityIconOnly,
    handleToggleAbilityOuterCircle,
    handleRemoveAttachedVisionCone,
    handleDetachVisionCone,
    closeContextMenu,
  } = useCanvasContextMenu(
    stageRef,
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    textsOnCanvas,
    setTextsOnCanvas,
    imagesOnCanvas,
    setImagesOnCanvas,
    toolIconsOnCanvas,
    setToolIconsOnCanvas,
    connectingLines,
    setConnectingLines,
    selectedCanvasItems,
    setSelectedCanvasItems,
  );

  const collections = useMemo<CanvasItemCollections>(
    () => ({
      agentsOnCanvas,
      abilitiesOnCanvas,
      textsOnCanvas,
      imagesOnCanvas,
      toolIconsOnCanvas,
    }),
    [
      agentsOnCanvas,
      abilitiesOnCanvas,
      textsOnCanvas,
      imagesOnCanvas,
      toolIconsOnCanvas,
    ],
  );

  const { handleRightMouseDown } = useCanvasSelection({
    stageRef,
    enabled:
      enableMultiSelect &&
      !isDrawMode &&
      !editingTextId &&
      !isSidebarDragActive,
    onRightClick: openContextMenu,
  });

  const selectionDrag = useCanvasSelectionDrag({
    outlineGroupRef: selectionOutlineGroupRef,
    deleteGroupRef,
  });

  const handleIconPlacement = useCallback(
    (position?: Vector2d) => {
      const stage = stageRef.current;
      if (!stage || !selectedCanvasIcon) return;

      let pos: Vector2d;
      if (position) {
        pos = position;
      } else {
        const tempDragIcon = stage.findOne(`#${TEMP_DRAG_ID}`);
        if (!tempDragIcon) return;
        pos = tempDragIcon.position();
      }

      const isAbilityIcon = "action" in selectedCanvasIcon;
      const newId = getNextId(
        isAgent(selectedCanvasIcon)
          ? "agent"
          : isAbilityIcon
            ? "ability"
            : "tool",
      );

      if (isAgent(selectedCanvasIcon)) {
        const newAgent = {
          ...selectedCanvasIcon,
          id: newId,
          x: pos.x,
          y: pos.y,
          isAlly:
            agentsOnCanvas.find((a) => a.id === TEMP_DRAG_ID)?.isAlly ?? true,
        };
        setAgentsOnCanvas((prev) =>
          prev.map((agent) => (agent.id === TEMP_DRAG_ID ? newAgent : agent)),
        );
        notifyAgentAdded(newAgent);
      } else if (isAbilityIcon) {
        const tempAbility = abilitiesOnCanvas.find(
          (a) => a.id === TEMP_DRAG_ID,
        );
        const attachmentTarget =
          tempAbility && canAttachVisionCone(tempAbility)
            ? findVisionConeAttachmentTarget({
                point: pos,
                agentsOnCanvas,
                abilitiesOnCanvas,
                toolIconsOnCanvas,
                agentsSettings,
                abilitiesSettings,
                excludeId: TEMP_DRAG_ID,
              })
            : null;
        const newAbility = {
          ...selectedCanvasIcon,
          id: newId,
          x: attachmentTarget?.x ?? pos.x,
          y: attachmentTarget?.y ?? pos.y,
          isAlly: tempAbility?.isAlly ?? true,
          iconOnly: tempAbility?.iconOnly ?? false,
          showOuterCircle: tempAbility?.showOuterCircle ?? true,
          attachedToId: attachmentTarget?.id,
        };

        const { nextAbilitiesOnCanvas, removedAbilityIds } =
          applyVisionConeAttachment({
            abilitiesOnCanvas,
            previousAbilityId: TEMP_DRAG_ID,
            nextAbility: newAbility,
          });

        const defaultAttachedCone = createDefaultAttachedVisionCone(
          newAbility,
          getNextId("ability"),
        );
        if (defaultAttachedCone) {
          nextAbilitiesOnCanvas.push(defaultAttachedCone);
        }

        setAbilitiesOnCanvas(nextAbilitiesOnCanvas);
        removedAbilityIds.forEach((abilityId) =>
          notifyAbilityRemoved(abilityId),
        );
        notifyAbilityAdded(newAbility);
        if (defaultAttachedCone) {
          notifyAbilityAdded(defaultAttachedCone);
        }
      } else {
        const tempToolIcon = toolIconsOnCanvas.find(
          (toolIcon) => toolIcon.id === TEMP_DRAG_ID,
        );

        const attachmentHost =
          tempToolIcon && canAttachToolIcon(tempToolIcon)
            ? findToolIconAttachmentTarget({
                point: pos,
                agentsOnCanvas,
                agentsSettings,
                excludeId: TEMP_DRAG_ID,
              })
            : null;

        const toolIconPosition = attachmentHost
          ? getToolIconAttachmentPosition(
              tempToolIcon ?? selectedCanvasIcon,
              attachmentHost.x,
              attachmentHost.y,
              agentsSettings,
            )
          : { x: pos.x, y: pos.y };

        const newToolIcon = {
          ...selectedCanvasIcon,
          id: newId,
          x: toolIconPosition.x,
          y: toolIconPosition.y,
          attachedToId: attachmentHost?.id,
        };
        setToolIconsOnCanvas((prev) =>
          prev.map((toolIcon) =>
            toolIcon.id === TEMP_DRAG_ID ? newToolIcon : toolIcon,
          ),
        );
        notifyToolIconAdded(newToolIcon);
      }

      setSelectedCanvasIcon(null);
    },
    [
      selectedCanvasIcon,
      agentsOnCanvas,
      abilitiesOnCanvas,
      toolIconsOnCanvas,
      agentsSettings,
      abilitiesSettings,
      setAbilitiesOnCanvas,
      setAgentsOnCanvas,
      setToolIconsOnCanvas,
      setSelectedCanvasIcon,
      stageRef,
      notifyAgentAdded,
      notifyAbilityAdded,
      notifyAbilityRemoved,
      notifyToolIconAdded,
    ],
  );

  const handleStageClick = useCallback(
    (event?: KonvaEventObject<MouseEvent>) => {
      if (editingTextId) {
        return;
      }

      if (event?.evt.button === 0) {
        const target = resolveCanvasItemTarget(
          event.target as unknown as import("konva/lib/Node").Node,
          collections,
        );
        const targetIsSelected =
          target !== null &&
          selectedCanvasItems.some(
            (selection) =>
              selection.id === target.id && selection.type === target.type,
          );

        if (!targetIsSelected) {
          setSelectedCanvasItems([]);
        }
      }

      if (isDrawMode) {
        handleDrawing();
        return;
      }

      if (isSidebarDragActive) {
        return;
      }

      if (selectedCanvasIcon) {
        const worldPos = getWorldPointerPosition();
        if (worldPos) {
          handleIconPlacement(worldPos);
        }
      }
    },
    [
      editingTextId,
      collections,
      selectedCanvasItems,
      setSelectedCanvasItems,
      isDrawMode,
      isSidebarDragActive,
      selectedCanvasIcon,
      handleDrawing,
      handleIconPlacement,
      getWorldPointerPosition,
    ],
  );

  const handleStageMouseDown = useCallback(
    (event: KonvaEventObject<MouseEvent>) => {
      if (event.evt.button === 2 && enableMultiSelect) {
        closeContextMenu();
        handleRightMouseDown(event);
        return;
      }

      if (event.evt.button === 0) {
        handleStageClick(event);
      }
    },
    [
      closeContextMenu,
      enableMultiSelect,
      handleRightMouseDown,
      handleStageClick,
    ],
  );

  const handleStagePointerUp = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  const updateTempDragPreview = useCallback(
    (worldPos: Vector2d) => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        const stage = stageRef.current;
        const tempDragIcon = stage?.findOne(`#${TEMP_DRAG_ID}`);
        if (tempDragIcon) {
          tempDragIcon.position(worldPos);
          tempDragIcon.getLayer()?.batchDraw();
        }
      });
    },
    [stageRef],
  );

  const handleStageMouseMove = useCallback(() => {
    const worldPos = getWorldPointerPosition();
    if (!worldPos) return;

    setCursorForCurrentTool();

    if (isDrawMode && isDrawing.current) {
      handleDrawing();
    } else if (selectedCanvasIcon) {
      updateTempDragPreview(worldPos);
    }
  }, [
    getWorldPointerPosition,
    setCursorForCurrentTool,
    isDrawMode,
    isDrawing,
    selectedCanvasIcon,
    handleDrawing,
    updateTempDragPreview,
  ]);

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
          target as unknown as import("konva/lib/Node").Node,
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
    collections,
    editingTextId,
    isDrawMode,
    isSidebarDragActive,
    openContextMenu,
    resetTouchGesture,
    selectedCanvasIcon,
    stageRef,
  ]);

  const handleTouchStart = useCallback(
    (e: Parameters<typeof handleZoomTouchStart>[0]) => {
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
    (e: Parameters<typeof handleZoomTouchMove>[0]) => {
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
    (e: Parameters<typeof handleZoomTouchEnd>[0]) => {
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
        stageRef.current?.setPointersPositions(e.evt);
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
      handleStageClick,
      handleStagePointerUp,
      handleZoomTouchEnd,
      isDrawMode,
      isDrawing,
      resetTouchGesture,
      stageRef,
      syncCurrentStageScale,
    ],
  );

  const handleTouchCancel = useCallback(
    (e: Parameters<typeof handleZoomTouchEnd>[0]) => {
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

  const handleStageMouseLeave = useCallback(() => {
    handleMouseUp();
    if (!isSidebarDragActive) {
      removeTempDragIcon();
    }

    const stage = stageRef.current;
    if (stage) {
      setContainerCursor(stage, "default");
    }
  }, [handleMouseUp, isSidebarDragActive, removeTempDragIcon, stageRef]);

  const handleStageMouseEnter = useCallback(() => {
    setCursorForCurrentTool();
  }, [setCursorForCurrentTool]);

  useEffect(() => {
    setCursorForCurrentTool();
  }, [setCursorForCurrentTool]);

  useEffect(() => {
    syncCurrentStageScale();
  }, [syncCurrentStageScale, baseScale]);

  useEffect(() => {
    if (!isSidebarDragActive) {
      return;
    }

    const handleWindowPointerMove = (event: PointerEvent) => {
      const stage = stageRef.current;
      if (!stage || !selectedCanvasIcon) {
        return;
      }

      stage.setPointersPositions(event as unknown as MouseEvent);
      const worldPos = getWorldPointerPosition();
      if (!worldPos) {
        return;
      }

      updateTempDragPreview(worldPos);
    };

    const handleWindowPointerUp = (event: PointerEvent) => {
      const stage = stageRef.current;
      if (!stage) {
        setIsSidebarDragActive(false);
        return;
      }

      if (event.type === "pointercancel") {
        removeTempDragIcon();
        setIsSidebarDragActive(false);
        return;
      }

      const stageContainer = stage.container();
      const target = event.target;
      const releasedWithinStageBounds = (() => {
        const rect = stageContainer.getBoundingClientRect();
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        );
      })();
      const isReleasedOverStage =
        releasedWithinStageBounds ||
        (target instanceof Node && stageContainer.contains(target));

      if (isReleasedOverStage && selectedCanvasIcon) {
        stage.setPointersPositions(event as unknown as MouseEvent);
        const worldPos = getWorldPointerPosition();
        if (worldPos) {
          handleIconPlacement(worldPos);
        } else {
          handleIconPlacement();
        }
      } else {
        removeTempDragIcon();
      }

      setIsSidebarDragActive(false);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [
    isSidebarDragActive,
    stageRef,
    selectedCanvasIcon,
    getWorldPointerPosition,
    updateTempDragPreview,
    handleIconPlacement,
    removeTempDragIcon,
    setIsSidebarDragActive,
  ]);

  return {
    handleWheel,
    handleStageClick,
    handleStageMouseDown,
    handleStagePointerUp,
    handleStageMouseMove,
    handleStageMouseLeave,
    handleStageMouseEnter,
    handleMouseUp,
    handleContextMenu,
    handlePopoverOpenChange,
    handleDuplicate,
    handleDelete,
    handleToggleAlly,
    handleToggleAgentDead,
    handleSwapAbility,
    handleToggleAbilityIconOnly,
    handleToggleAbilityOuterCircle,
    handleRemoveAttachedVisionCone,
    handleDetachVisionCone,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    handleDragMove,
    contextMenu,
    selectionDrag,
    currentLineRef,
    deleteGroupRef,
  };
};
