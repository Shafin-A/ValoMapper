import {
  useCanvasActions,
  useCanvasEntityActions,
  useCanvasSelectionState,
  useCanvasUi,
} from "@/contexts/canvas-context";
import { useSetCurrentStroke } from "@/contexts/drawing-preview-context";
import { useSettings } from "@/contexts/settings-context";
import {
  type CanvasItemCollections,
  resolveCanvasItemTarget,
} from "@/lib/canvas-selection";
import type { CanvasEntitiesSnapshot } from "@/contexts/canvas-entity-contexts";
import { Stage } from "konva/lib/Stage";
import type Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useRef, useEffect } from "react";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { useCanvasContextMenu } from "./use-canvas-context-menu";
import { useCanvasDrawing } from "./use-canvas-drawing";
import { useCanvasIconPlacement } from "./use-canvas-icon-placement";
import { useCanvasSelection } from "./use-canvas-selection";
import { useCanvasSelectionDrag } from "./use-canvas-selection-drag";
import { useCanvasTouchGestures } from "./use-canvas-touch-gestures";
import { useCanvasZoom } from "./use-canvas-zoom";

const PENCIL_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%23000' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'/%3E%3Cpath d='m15 5 4 4'/%3E%3C/svg%3E") 5 18, crosshair`;
const ERASER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2'/%3E%3C/svg%3E") 12 12, crosshair`;

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
    isSidebarDragActive,
    setIsSidebarDragActive,
    isDrawMode,
    editingTextId,
    setEditingNoteTarget,
    isDrawing,
    tool,
  } = useCanvasUi();
  const { selectedCanvasItems, setSelectedCanvasItems } =
    useCanvasSelectionState();
  const {
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setTextsOnCanvas,
    setImagesOnCanvas,
    setToolIconsOnCanvas,
    setDrawLines,
    setConnectingLines,
  } = useCanvasEntityActions();
  const { setCurrentStageScale, getLatestEntities } = useCanvasActions();

  const entities: CanvasEntitiesSnapshot = getLatestEntities();

  const setCurrentStroke = useSetCurrentStroke();

  const { agentsSettings, abilitiesSettings, drawSettings, eraserSettings } =
    useSettings();

  const {
    notifyAgentAdded,
    notifyAbilityAdded,
    notifyAbilityRemoved,
    notifyToolIconAdded,
  } = useCollaborativeCanvas();

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

  const {
    deleteGroupRef,
    handleDragMove,
    handleWheel: handleZoomWheel,
    handleZoomIn: handleZoomInRaw,
    handleZoomOut: handleZoomOutRaw,
    handleResetZoom: handleResetZoomRaw,
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

  const handleZoomIn = useCallback(() => {
    handleZoomInRaw();
    syncCurrentStageScale();
  }, [handleZoomInRaw, syncCurrentStageScale]);

  const handleZoomOut = useCallback(() => {
    handleZoomOutRaw();
    syncCurrentStageScale();
  }, [handleZoomOutRaw, syncCurrentStageScale]);

  const handleResetZoom = useCallback(() => {
    handleResetZoomRaw();
    syncCurrentStageScale();
  }, [handleResetZoomRaw, syncCurrentStageScale]);

  const { handleDrawing, handleMouseUp, cancelDrawing, currentLineRef } =
    useCanvasDrawing(
      getWorldPointerPosition,
      isDrawing,
      tool,
      drawSettings,
      eraserSettings,
      entities.drawLines,
      setDrawLines,
      setCurrentStroke,
      getLatestEntities,
    );

  const {
    contextMenu,
    openContextMenu,
    handleContextMenu,
    handlePopoverOpenChange,
    handleDuplicate,
    handleDelete,
    handleEditNote,
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
    entities.agentsOnCanvas,
    setAgentsOnCanvas,
    entities.abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    entities.textsOnCanvas,
    setTextsOnCanvas,
    entities.imagesOnCanvas,
    setImagesOnCanvas,
    entities.toolIconsOnCanvas,
    setToolIconsOnCanvas,
    entities.connectingLines,
    setConnectingLines,
    selectedCanvasItems,
    setSelectedCanvasItems,
    getLatestEntities,
    setEditingNoteTarget,
  );

  const getCollections = useCallback((): CanvasItemCollections => {
    const latest = getLatestEntities();

    return {
      agentsOnCanvas: latest.agentsOnCanvas,
      abilitiesOnCanvas: latest.abilitiesOnCanvas,
      textsOnCanvas: latest.textsOnCanvas,
      imagesOnCanvas: latest.imagesOnCanvas,
      toolIconsOnCanvas: latest.toolIconsOnCanvas,
    };
  }, [getLatestEntities]);

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

  const {
    handleIconPlacement,
    removeTempDragIcon,
    updateTempDragPreview,
  } = useCanvasIconPlacement({
    stageRef,
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    isSidebarDragActive,
    setIsSidebarDragActive,
    getLatestEntities,
    getWorldPointerPosition,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setToolIconsOnCanvas,
    agentsSettings,
    abilitiesSettings,
    notifyAgentAdded,
    notifyAbilityAdded,
    notifyAbilityRemoved,
    notifyToolIconAdded,
  });

  const handleStageClick = useCallback(
    (event?: KonvaEventObject<MouseEvent>) => {
      const collections = getCollections();

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
      getCollections,
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

  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  } = useCanvasTouchGestures({
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
  });

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

  return {
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
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
    handleEditNote,
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
