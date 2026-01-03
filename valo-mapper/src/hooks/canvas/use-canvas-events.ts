import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { TEMP_DRAG_ID } from "@/lib/consts";
import { getNextId, isAgent } from "@/lib/utils";
import { Stage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { useCallback, useRef } from "react";
import {
  useCanvasContextMenu,
  useCanvasDrawing,
  useCanvasZoom,
} from "@/hooks/canvas";

export const useCanvasEvents = (
  stageRef: React.RefObject<Stage | null>,
  baseScale: number
) => {
  const {
    selectedCanvasIcon,
    setSelectedCanvasIcon,
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
    isDrawing,
    drawLines,
    setDrawLines,
    tool,
    setCurrentStroke,
  } = useCanvas();

  const { drawSettings, eraserSettings } = useSettings();

  const frameRef = useRef<number | null>(null);

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
        prev.filter((icon) => icon.id !== TEMP_DRAG_ID)
      );
    } else {
      setAbilitiesOnCanvas((prev) =>
        prev.filter((icon) => icon.id !== TEMP_DRAG_ID)
      );
    }

    setSelectedCanvasIcon(null);
  }, [
    selectedCanvasIcon,
    setAbilitiesOnCanvas,
    setAgentsOnCanvas,
    setSelectedCanvasIcon,
  ]);

  const {
    deleteGroupRef,
    handleDragMove,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useCanvasZoom(stageRef, baseScale, isDrawMode);

  const { handleDrawing, handleMouseUp, currentLineRef } = useCanvasDrawing(
    getWorldPointerPosition,
    isDrawing,
    tool,
    drawSettings,
    eraserSettings,
    drawLines,
    setDrawLines,
    setCurrentStroke
  );

  const {
    contextMenu,
    handleContextMenu,
    handlePopoverOpenChange,
    handleDuplicate,
    handleDelete,
    handleToggleAlly,
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
    setToolIconsOnCanvas
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
        isAgent(selectedCanvasIcon) ? "agent" : "ability"
      );

      if (isAgent(selectedCanvasIcon)) {
        setAgentsOnCanvas((prev) =>
          prev.map((agent) =>
            agent.id === TEMP_DRAG_ID
              ? { ...agent, id: newId, x: pos.x, y: pos.y }
              : agent
          )
        );
      } else {
        setAbilitiesOnCanvas((prev) =>
          prev.map((ability) =>
            ability.id === TEMP_DRAG_ID
              ? { ...ability, id: newId, x: pos.x, y: pos.y }
              : ability
          )
        );
      }

      setSelectedCanvasIcon(null);
    },
    [
      selectedCanvasIcon,
      setAbilitiesOnCanvas,
      setAgentsOnCanvas,
      setSelectedCanvasIcon,
      stageRef,
    ]
  );

  const handleStageClick = useCallback(() => {
    if (isDrawMode) {
      handleDrawing();
      return;
    }

    if (selectedCanvasIcon) {
      const worldPos = getWorldPointerPosition();
      if (worldPos) {
        handleIconPlacement(worldPos);
      }
    }
  }, [
    isDrawMode,
    selectedCanvasIcon,
    handleDrawing,
    handleIconPlacement,
    getWorldPointerPosition,
  ]);

  const handleStageMouseMove = useCallback(() => {
    const worldPos = getWorldPointerPosition();
    if (!worldPos) return;

    if (isDrawMode && isDrawing.current) {
      handleDrawing();
    } else if (selectedCanvasIcon) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = requestAnimationFrame(() => {
        const stage = stageRef.current;
        const tempDragIcon = stage?.findOne(`#${TEMP_DRAG_ID}`);
        if (tempDragIcon) {
          tempDragIcon.position(worldPos);
        }
      });
    }
  }, [
    getWorldPointerPosition,
    isDrawMode,
    isDrawing,
    selectedCanvasIcon,
    handleDrawing,
    stageRef,
  ]);

  const handleStageMouseLeave = useCallback(() => {
    handleMouseUp();
    removeTempDragIcon();
  }, [handleMouseUp, removeTempDragIcon]);

  return {
    handleWheel,
    handleStageClick,
    handleStageMouseMove,
    handleStageMouseLeave,
    handleMouseUp,
    handleContextMenu,
    handlePopoverOpenChange,
    handleDuplicate,
    handleDelete,
    handleToggleAlly,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDragMove,
    contextMenu,
    currentLineRef,
    deleteGroupRef,
  };
};
