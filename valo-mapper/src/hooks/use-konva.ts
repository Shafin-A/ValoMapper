import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import {
  MAX_ZOOM_SCALE,
  MIN_ZOOM_SCALE,
  SCALE_FACTOR,
  SIDEBAR_WIDTH,
  TEMP_DRAG_ID,
} from "@/lib/consts";
import {
  doesEraserIntersect,
  getIntersectingLines,
  getNextId,
  isAgent,
} from "@/lib/utils";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { useCallback, useRef, useState } from "react";

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  itemId: string;
  itemType: "agent" | "ability" | "text" | "image" | "tool";
}

export const useKonva = (
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
  const drawingBufferRef = useRef<Vector2d[]>([]);
  const currentLineRef = useRef<Konva.Line | Konva.Arrow>(null);
  const erasedLinesRef = useRef<Set<number>>(new Set());
  const deleteGroupRef = useRef<Konva.Group | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    itemId: "",
    itemType: "agent",
  });

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

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, []);

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

  const handleDragMove = useCallback(() => {
    const deleteGroup = deleteGroupRef.current;
    if (!deleteGroup) return;

    const stage = stageRef.current;
    if (!stage) return;

    const container = stage.container();
    const containerWidth = container.offsetWidth;

    const DELETE_ZONE_WIDTH = 120;
    const PADDING = 20;

    const screenX =
      containerWidth - DELETE_ZONE_WIDTH - SIDEBAR_WIDTH - PADDING;
    const screenY = PADDING;

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
        Math.min(MAX_ZOOM_SCALE, newZoomScale)
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
    [handleDragMove, stageRef, baseScale]
  );

  const handleDrawing = useCallback(() => {
    const worldPos = getWorldPointerPosition();
    if (!worldPos) return;

    if (!isDrawing.current) {
      isDrawing.current = true;
      drawingBufferRef.current = [worldPos];

      if (tool === "eraser" && eraserSettings.mode === "line") {
        erasedLinesRef.current.clear();
      }

      setCurrentStroke({
        id: getNextId("tool"),
        tool,
        points: [worldPos],
        color: drawSettings.color,
        size: tool === "eraser" ? eraserSettings.size : drawSettings.size,
        isDashed: drawSettings.isDashed,
        isArrowHead: drawSettings.isArrowHead,
      });
    } else {
      const lastPoint =
        drawingBufferRef.current[drawingBufferRef.current.length - 1];
      const distance = Math.sqrt(
        Math.pow(worldPos.x - lastPoint.x, 2) +
          Math.pow(worldPos.y - lastPoint.y, 2)
      );

      if (distance > 5) {
        drawingBufferRef.current.push(worldPos);

        if (tool === "eraser" && eraserSettings.mode === "line") {
          const currentSegment = [lastPoint, worldPos];
          const intersectingLineIndices = getIntersectingLines(
            currentSegment,
            drawLines
          );

          const newIntersections = intersectingLineIndices.filter(
            (index) => !erasedLinesRef.current.has(index)
          );

          if (newIntersections.length > 0) {
            newIntersections.forEach((index) => {
              erasedLinesRef.current.add(index);
            });

            setDrawLines((prev) =>
              prev.filter((_, index) => !newIntersections.includes(index))
            );
          }
        }

        if (currentLineRef.current) {
          const flatPoints = drawingBufferRef.current.flatMap((p) => [
            p.x,
            p.y,
          ]);
          currentLineRef.current.points(flatPoints);
          currentLineRef.current.getLayer()?.batchDraw();
        }
      }
    }
  }, [
    drawSettings,
    eraserSettings,
    getWorldPointerPosition,
    isDrawing,
    setCurrentStroke,
    tool,
    drawLines,
    setDrawLines,
  ]);

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

  const handleMouseUp = useCallback(() => {
    if (isDrawing.current && drawingBufferRef.current.length > 0) {
      const finalStroke = {
        id: getNextId("tool"),
        tool,
        points: drawingBufferRef.current,
        color: drawSettings.color,
        size: tool === "eraser" ? eraserSettings.size : drawSettings.size,
        isDashed: drawSettings.isDashed,
        isArrowHead: drawSettings.isArrowHead,
      };

      if (tool === "eraser") {
        if (eraserSettings.mode === "line") {
          setCurrentStroke(null);
        } else {
          if (doesEraserIntersect(drawingBufferRef.current, drawLines)) {
            setDrawLines((prev) => [...prev, finalStroke]);
          }
          setCurrentStroke(null);
        }
      } else {
        setDrawLines((prev) => [...prev, finalStroke]);
        setCurrentStroke(null);
      }

      drawingBufferRef.current = [];
    }
    isDrawing.current = false;
  }, [
    isDrawing,
    tool,
    drawSettings,
    drawLines,
    setCurrentStroke,
    setDrawLines,
    eraserSettings,
  ]);

  const handleStageMouseLeave = useCallback(() => {
    handleMouseUp();
    removeTempDragIcon();
  }, [handleMouseUp, removeTempDragIcon]);

  const handleContextMenu = useCallback(
    (e: KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage || e.target === stage) return;

      const containerRect = stage.container().getBoundingClientRect();
      const pointerPosition = stage.getPointerPosition();
      if (!pointerPosition) return;

      const targetId = e.target.id() || e.target.parent?.id();
      if (!targetId) return;

      const isAgentItem = agentsOnCanvas.some(
        (agent) => agent.id.toString() === targetId
      );
      const isAbilityItem = abilitiesOnCanvas.some(
        (ability) => ability.id.toString() === targetId
      );
      const isTextItem = textsOnCanvas.some(
        (text) => text.id.toString() === targetId
      );
      const isImageItem = imagesOnCanvas.some(
        (image) => image.id.toString() === targetId
      );
      const isToolIconItem = toolIconsOnCanvas.some(
        (toolIcon) => toolIcon.id === targetId
      );

      if (
        !isAgentItem &&
        !isAbilityItem &&
        !isTextItem &&
        !isImageItem &&
        !isToolIconItem
      )
        return;

      let itemType: "agent" | "ability" | "text" | "image" | "tool";
      if (isAgentItem) itemType = "agent";
      else if (isAbilityItem) itemType = "ability";
      else if (isTextItem) itemType = "text";
      else if (isImageItem) itemType = "image";
      else if (isToolIconItem) itemType = "tool";
      else return;

      setContextMenu({
        open: true,
        x: containerRect.left + pointerPosition.x,
        y: containerRect.top + pointerPosition.y,
        itemId: targetId,
        itemType,
      });

      e.cancelBubble = true;
    },
    [
      stageRef,
      agentsOnCanvas,
      abilitiesOnCanvas,
      textsOnCanvas,
      imagesOnCanvas,
      toolIconsOnCanvas,
    ]
  );

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setContextMenu((prev) => ({ ...prev, open }));
  }, []);

  const handleDuplicate = useCallback(() => {
    if (!contextMenu.open) return;

    const { itemId, itemType } = contextMenu;

    if (itemType === "agent") {
      const agent = agentsOnCanvas.find((a) => a.id === itemId);
      if (agent) {
        const newAgent = {
          ...agent,
          id: getNextId("agent"),
          x: agent.x + 20,
          y: agent.y + 20,
        };
        setAgentsOnCanvas((prev) => [...prev, newAgent]);
      }
    } else if (itemType === "ability") {
      const ability = abilitiesOnCanvas.find((a) => a.id === itemId);
      if (ability) {
        const newAbility = {
          ...ability,
          id: getNextId("ability"),
          x: ability.x + 20,
          y: ability.y + 20,
        };
        setAbilitiesOnCanvas((prev) => [...prev, newAbility]);
      }
    } else if (itemType === "text") {
      const text = textsOnCanvas.find((t) => t.id === itemId);
      if (text) {
        const newText = {
          ...text,
          id: getNextId("text"),
          x: text.x + 20,
          y: text.y + 20,
        };
        setTextsOnCanvas((prev) => [...prev, newText]);
      }
    } else if (itemType === "image") {
      const image = imagesOnCanvas.find((i) => i.id === itemId);
      if (image) {
        const newImage = {
          ...image,
          id: getNextId("image"),
          x: image.x + 20,
          y: image.y + 20,
        };
        setImagesOnCanvas((prev) => [...prev, newImage]);
      }
    } else if (itemType === "tool") {
      const toolIcon = toolIconsOnCanvas.find((i) => i.id === itemId);
      if (toolIcon) {
        const newToolIcon = {
          ...toolIcon,
          id: getNextId("tool"),
          x: toolIcon.x + 20,
          y: toolIcon.y + 20,
        };
        setToolIconsOnCanvas((prev) => [...prev, newToolIcon]);
      }
    }
    closeContextMenu();
  }, [
    contextMenu,
    closeContextMenu,
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
  ]);

  const handleDelete = useCallback(() => {
    if (!contextMenu.open) return;

    const { itemId, itemType } = contextMenu;

    if (itemType === "agent") {
      setAgentsOnCanvas((prev) => prev.filter((agent) => agent.id !== itemId));
    } else if (itemType === "ability") {
      setAbilitiesOnCanvas((prev) =>
        prev.filter((ability) => ability.id !== itemId)
      );
    } else if (itemType === "text") {
      setTextsOnCanvas((prev) => prev.filter((text) => text.id !== itemId));
    } else if (itemType === "image") {
      setImagesOnCanvas((prev) => prev.filter((image) => image.id !== itemId));
    } else if (itemType === "tool") {
      setToolIconsOnCanvas((prev) =>
        prev.filter((toolIcon) => toolIcon.id !== itemId)
      );
    }
    closeContextMenu();
  }, [
    contextMenu,
    closeContextMenu,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setTextsOnCanvas,
    setImagesOnCanvas,
    setToolIconsOnCanvas,
  ]);

  const handleToggleAlly = useCallback(() => {
    if (!contextMenu.open) return;

    const { itemId, itemType } = contextMenu;

    if (itemType === "agent") {
      setAgentsOnCanvas((prev) =>
        prev.map((agent) =>
          agent.id === itemId ? { ...agent, isAlly: !agent.isAlly } : agent
        )
      );
    } else {
      setAbilitiesOnCanvas((prev) =>
        prev.map((ability) =>
          ability.id === itemId
            ? { ...ability, isAlly: !ability.isAlly }
            : ability
        )
      );
    }
    closeContextMenu();
  }, [contextMenu, setAgentsOnCanvas, setAbilitiesOnCanvas, closeContextMenu]);

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
    handleDragMove,
    contextMenu,
    currentLineRef,
    deleteGroupRef,
  };
};
