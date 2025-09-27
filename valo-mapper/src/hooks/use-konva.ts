import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { SCALE_FACTOR, TEMP_DRAG_ID } from "@/lib/consts";
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE } from "@/lib/consts";
import { AbilityCanvas, AgentCanvas } from "@/lib/types";
import { getNextId, isAgent } from "@/lib/utils";
import { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react";

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  itemId: string;
  itemType: "agent" | "ability";
}

type CanvasIconItem = AgentCanvas | AbilityCanvas;

export const useKonva = (stageRef: React.RefObject<Stage | null>) => {
  const {
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    isDrawMode,
    isDrawing,
    setDrawLines,
    tool,
    currentStroke,
    setCurrentStroke,
  } = useCanvas();

  const { drawSettings } = useSettings();

  const frameRef = useRef<number | null>(null);

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
    const scale = stage.scaleX();

    return {
      x: (pos.x - stagePos.x) / scale,
      y: (pos.y - stagePos.y) / scale,
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

  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo: Vector2d = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      let direction = e.evt.deltaY > 0 ? 1 : -1;
      if (e.evt.ctrlKey) {
        direction = -direction;
      }

      const newScale =
        direction < 0 ? oldScale * SCALE_FACTOR : oldScale / SCALE_FACTOR;

      const clampedNewScale = Math.max(
        MIN_ZOOM_SCALE,
        Math.min(MAX_ZOOM_SCALE, newScale)
      );

      stage.scale({ x: clampedNewScale, y: clampedNewScale });

      const newPos: Vector2d = {
        x: pointer.x - mousePointTo.x * clampedNewScale,
        y: pointer.y - mousePointTo.y * clampedNewScale,
      };

      stage.position(newPos);
    },
    [stageRef]
  );

  const handleDrawing = useCallback(() => {
    const worldPos = getWorldPointerPosition();
    if (!worldPos) return;

    if (!isDrawing.current) {
      isDrawing.current = true;
      setCurrentStroke({
        tool,
        points: [worldPos],
        color: drawSettings.color,
        size: drawSettings.size,
        isDashed: drawSettings.isDashed,
        isArrowHead: drawSettings.isArrowHead,
      });
    } else {
      setCurrentStroke((prev) => {
        if (!prev || prev.points.length === 0) return prev;

        const lastPoint = prev.points[prev.points.length - 1];
        const distance = Math.sqrt(
          Math.pow(worldPos.x - lastPoint.x, 2) +
            Math.pow(worldPos.y - lastPoint.y, 2)
        );

        // Only add point if moved more than 2 pixels
        if (distance > 2) {
          return { ...prev, points: [...prev.points, worldPos] };
        }
        return prev;
      });
    }
  }, [
    drawSettings,
    getWorldPointerPosition,
    isDrawing,
    setCurrentStroke,
    tool,
  ]);

  const handleIconPlacement = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !selectedCanvasIcon) return;

    const tempDragIcon = stage.findOne(`#${TEMP_DRAG_ID}`);
    if (!tempDragIcon) return;

    const pos = tempDragIcon.position();
    const newId = getNextId(isAgent(selectedCanvasIcon) ? "agent" : "ability");

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
  }, [
    selectedCanvasIcon,
    setAbilitiesOnCanvas,
    setAgentsOnCanvas,
    setSelectedCanvasIcon,
    stageRef,
  ]);

  const handleStageClick = useCallback(() => {
    if (isDrawMode) {
      handleDrawing();
      return;
    }

    if (selectedCanvasIcon) {
      handleIconPlacement();
    }
  }, [isDrawMode, selectedCanvasIcon, handleDrawing, handleIconPlacement]);

  const handleStageMouseMove = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      const worldPos = getWorldPointerPosition();
      if (!worldPos) return;

      if (isDrawMode && isDrawing.current) {
        handleDrawing();
        return;
      }

      if (selectedCanvasIcon) {
        const stage = stageRef.current;
        const tempDragIcon = stage?.findOne(`#${TEMP_DRAG_ID}`);
        if (tempDragIcon) {
          tempDragIcon.position(worldPos);
        }
      }
    });
  }, [
    getWorldPointerPosition,
    isDrawMode,
    isDrawing,
    selectedCanvasIcon,
    handleDrawing,
    stageRef,
  ]);
  const handleStageMouseLeave = useCallback(() => {
    if (isDrawing.current && currentStroke) {
      setDrawLines((prev) => [...prev, currentStroke]);
      setCurrentStroke(null);
    }
    isDrawing.current = false;
    removeTempDragIcon();
  }, [
    isDrawing,
    currentStroke,
    removeTempDragIcon,
    setDrawLines,
    setCurrentStroke,
  ]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing.current && currentStroke) {
      setDrawLines((prev) => [...prev, currentStroke]);
      setCurrentStroke(null);
    }
    isDrawing.current = false;
  }, [isDrawing, currentStroke, setDrawLines, setCurrentStroke]);

  const handleDragEnd = useCallback(
    <T extends CanvasIconItem>(
      e: KonvaEventObject<DragEvent>,
      icon: T,
      setIconsOnCanvas: Dispatch<SetStateAction<T[]>>
    ) => {
      const newX = e.target.x();
      const newY = e.target.y();

      setIconsOnCanvas((prev) => {
        const index = prev.findIndex((item) => item.id === icon.id);
        if (index === -1) return prev;

        const updatedItems = [...prev];
        updatedItems[index] = { ...updatedItems[index], x: newX, y: newY };
        return updatedItems;
      });
    },
    []
  );

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

      if (!isAgentItem && !isAbilityItem) return;

      setContextMenu({
        open: true,
        x: containerRect.left + pointerPosition.x,
        y: containerRect.top + pointerPosition.y,
        itemId: targetId,
        itemType: isAgentItem ? "agent" : "ability",
      });

      e.cancelBubble = true;
    },
    [stageRef, agentsOnCanvas, abilitiesOnCanvas]
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
    } else {
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
    }
    closeContextMenu();
  }, [
    contextMenu,
    agentsOnCanvas,
    abilitiesOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    closeContextMenu,
  ]);

  const handleDelete = useCallback(() => {
    if (!contextMenu.open) return;

    const { itemId, itemType } = contextMenu;

    if (itemType === "agent") {
      setAgentsOnCanvas((prev) => prev.filter((agent) => agent.id !== itemId));
    } else {
      setAbilitiesOnCanvas((prev) =>
        prev.filter((ability) => ability.id !== itemId)
      );
    }
    closeContextMenu();
  }, [contextMenu, setAgentsOnCanvas, setAbilitiesOnCanvas, closeContextMenu]);

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
    handleDragEnd,
    handleContextMenu,
    handlePopoverOpenChange,
    handleDuplicate,
    handleDelete,
    handleToggleAlly,
    contextMenu,
  };
};
