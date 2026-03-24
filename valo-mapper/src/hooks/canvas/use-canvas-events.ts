import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { TEMP_DRAG_ID } from "@/lib/consts";
import { getNextId, isAgent } from "@/lib/utils";
import { Stage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { useCallback, useRef, useEffect } from "react";
import {
  useCanvasContextMenu,
  useCanvasDrawing,
  useCanvasZoom,
} from "@/hooks/canvas";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";

export const useCanvasEvents = (
  stageRef: React.RefObject<Stage | null>,
  baseScale: number,
) => {
  const {
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    isSidebarDragActive,
    setIsSidebarDragActive,
    setCurrentStageScale,
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
    setEditingTextId,
    isDrawing,
    drawLines,
    setDrawLines,
    connectingLines,
    setConnectingLines,
    tool,
    setCurrentStroke,
  } = useCanvas();

  const { drawSettings, eraserSettings } = useSettings();

  const { notifyAgentAdded, notifyAbilityAdded } = useCollaborativeCanvas();

  const frameRef = useRef<number | null>(null);

  const setCursorForCurrentTool = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !stage.container) return;

    if (isDrawMode) {
      if (tool === "pencil") {
        stage.container().style.cursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%23000' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'/%3E%3Cpath d='m15 5 4 4'/%3E%3C/svg%3E") 5 18, crosshair`;
      } else if (tool === "eraser") {
        stage.container().style.cursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2'/%3E%3C/svg%3E") 12 12, crosshair`;
      }
    } else {
      stage.container().style.cursor = "default";
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
    } else {
      setAbilitiesOnCanvas((prev) =>
        prev.filter((icon) => icon.id !== TEMP_DRAG_ID),
      );
    }

    setSelectedCanvasIcon(null);
    setIsSidebarDragActive(false);
  }, [
    selectedCanvasIcon,
    setAbilitiesOnCanvas,
    setAgentsOnCanvas,
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

  const syncCurrentStageScale = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setCurrentStageScale(stage.scaleX());
  }, [stageRef, setCurrentStageScale]);

  const handleWheel = useCallback(
    (e: Parameters<typeof handleZoomWheel>[0]) => {
      handleZoomWheel(e);
      syncCurrentStageScale();
    },
    [handleZoomWheel, syncCurrentStageScale],
  );

  const handleTouchStart = useCallback(
    (e: Parameters<typeof handleZoomTouchStart>[0]) => {
      handleZoomTouchStart(e);
      syncCurrentStageScale();
    },
    [handleZoomTouchStart, syncCurrentStageScale],
  );

  const handleTouchMove = useCallback(
    (e: Parameters<typeof handleZoomTouchMove>[0]) => {
      handleZoomTouchMove(e);
      syncCurrentStageScale();
    },
    [handleZoomTouchMove, syncCurrentStageScale],
  );

  const handleTouchEnd = useCallback(
    (e: Parameters<typeof handleZoomTouchEnd>[0]) => {
      handleZoomTouchEnd(e);
      syncCurrentStageScale();
    },
    [handleZoomTouchEnd, syncCurrentStageScale],
  );

  const { handleDrawing, handleMouseUp, currentLineRef } = useCanvasDrawing(
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
    handleContextMenu,
    handlePopoverOpenChange,
    handleDuplicate,
    handleDelete,
    handleToggleAlly,
    handleSwapAbility,
    handleToggleAbilityIconOnly,
    handleToggleAbilityOuterCircle,
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
  );

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

      const newId = getNextId(
        isAgent(selectedCanvasIcon) ? "agent" : "ability",
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
      } else {
        const tempAbility = abilitiesOnCanvas.find(
          (a) => a.id === TEMP_DRAG_ID,
        );
        const newAbility = {
          ...selectedCanvasIcon,
          id: newId,
          x: pos.x,
          y: pos.y,
          isAlly: tempAbility?.isAlly ?? true,
          iconOnly: tempAbility?.iconOnly ?? false,
          showOuterCircle: tempAbility?.showOuterCircle ?? true,
        };
        setAbilitiesOnCanvas((prev) =>
          prev.map((ability) =>
            ability.id === TEMP_DRAG_ID ? newAbility : ability,
          ),
        );
        notifyAbilityAdded(newAbility);
      }

      setSelectedCanvasIcon(null);
    },
    [
      selectedCanvasIcon,
      agentsOnCanvas,
      abilitiesOnCanvas,
      setAbilitiesOnCanvas,
      setAgentsOnCanvas,
      setSelectedCanvasIcon,
      stageRef,
      notifyAgentAdded,
      notifyAbilityAdded,
    ],
  );

  const handleStageClick = useCallback(() => {
    if (editingTextId) {
      setEditingTextId(null);
      return;
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
  }, [
    editingTextId,
    setEditingTextId,
    isDrawMode,
    isSidebarDragActive,
    selectedCanvasIcon,
    handleDrawing,
    handleIconPlacement,
    getWorldPointerPosition,
  ]);

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

  const handleStageMouseLeave = useCallback(() => {
    handleMouseUp();
    if (!isSidebarDragActive) {
      removeTempDragIcon();
    }

    const stage = stageRef.current;
    if (stage && stage.container) {
      stage.container().style.cursor = "default";
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

      const stageContainer = stage.container();
      const target = event.target;
      const isReleasedOverStage =
        target instanceof Node && stageContainer.contains(target);

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
    handleSwapAbility,
    handleToggleAbilityIconOnly,
    handleToggleAbilityOuterCircle,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDragMove,
    contextMenu,
    currentLineRef,
    deleteGroupRef,
  };
};
