import { useCanvas } from "@/contexts/canvas-context";
import { SCALE_FACTOR, TEMP_DRAG_ID } from "@/lib/consts";
import { AbilityCanvas, AgentCanvas } from "@/lib/types";
import { getNextId, isAgent } from "@/lib/utils";
import { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { Dispatch, SetStateAction, useCallback, useState } from "react";

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  itemId: string;
  itemType: "agent" | "ability";
}
export const useKonva = (stageRef: React.RefObject<Stage | null>) => {
  const {
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
  } = useCanvas();

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    itemId: "",
    itemType: "agent",
  });

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

      stage.scale({ x: newScale, y: newScale });

      const newPos: Vector2d = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      stage.position(newPos);
    },
    [stageRef]
  );

  const updateIconPosition = useCallback(
    (x: number, y: number) => {
      if (!selectedCanvasIcon) return;

      if (isAgent(selectedCanvasIcon)) {
        setAgentsOnCanvas((prev) =>
          prev.map((agent) =>
            agent.id === TEMP_DRAG_ID ? { ...agent, x, y } : agent
          )
        );
      } else {
        setAbilitiesOnCanvas((prev) =>
          prev.map((ability) =>
            ability.id === TEMP_DRAG_ID ? { ...ability, x, y } : ability
          )
        );
      }
    },
    [selectedCanvasIcon, setAbilitiesOnCanvas, setAgentsOnCanvas]
  );

  const handleStageClick = useCallback(() => {
    if (!selectedCanvasIcon) return;

    if (isAgent(selectedCanvasIcon)) {
      setAgentsOnCanvas((prev) => {
        return prev.map((agent) =>
          agent.id === TEMP_DRAG_ID
            ? { ...agent, id: getNextId("agent") }
            : agent
        );
      });
    } else {
      setAbilitiesOnCanvas((prev) => {
        return prev.map((ability) =>
          ability.id === TEMP_DRAG_ID
            ? { ...ability, id: getNextId("ability") }
            : ability
        );
      });
    }

    setSelectedCanvasIcon(null);
  }, [
    selectedCanvasIcon,
    setAbilitiesOnCanvas,
    setAgentsOnCanvas,
    setSelectedCanvasIcon,
  ]);

  const handleStageMouseMove = useCallback(() => {
    if (!selectedCanvasIcon) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const stagePos = stage.position();
    const scale = stage.scaleX();

    const x = (pos.x - stagePos.x) / scale;
    const y = (pos.y - stagePos.y) / scale;

    updateIconPosition(x, y);
  }, [selectedCanvasIcon, stageRef, updateIconPosition]);

  const handleStageMouseLeave = useCallback(() => {
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

  const handleDragEnd = <T extends AgentCanvas | AbilityCanvas>(
    e: KonvaEventObject<DragEvent>,
    icon: T,
    setIconsOnCanvas: Dispatch<SetStateAction<T[]>>
  ) => {
    const newX = e.target.x();
    const newY = e.target.y();

    setIconsOnCanvas((prev) =>
      prev.map((agentInCanvas) =>
        agentInCanvas.id === icon.id
          ? { ...agentInCanvas, x: newX, y: newY }
          : agentInCanvas
      )
    );
  };

  const handleContextMenu = useCallback(
    (e: KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      if (e.target === stage) return;

      const containerRect = stage.container().getBoundingClientRect();
      const pointerPosition = stage.getPointerPosition();

      if (!pointerPosition) return;

      const targetId = e.target.id() || e.target.parent?.id();
      if (!targetId) return;

      const isAgent = agentsOnCanvas.some(
        (agent) => agent.id.toString() === targetId
      );
      const isAbility = abilitiesOnCanvas.some(
        (ability) => ability.id.toString() === targetId
      );

      if (!isAgent && !isAbility) return;

      setContextMenu({
        open: true,
        x: containerRect.left + pointerPosition.x,
        y: containerRect.top + pointerPosition.y,
        itemId: targetId,
        itemType: isAgent ? "agent" : "ability",
      });

      e.cancelBubble = true;
    },
    [stageRef, agentsOnCanvas, abilitiesOnCanvas]
  );

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setContextMenu((prev) => ({
      ...prev,
      open,
    }));
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
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, [
    contextMenu,
    agentsOnCanvas,
    abilitiesOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
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
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, [contextMenu, setAgentsOnCanvas, setAbilitiesOnCanvas]);

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
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, [contextMenu, setAgentsOnCanvas, setAbilitiesOnCanvas]);

  return {
    handleWheel,
    handleStageClick,
    handleStageMouseMove,
    handleStageMouseLeave,
    handleDragEnd,
    handleContextMenu,
    handlePopoverOpenChange,
    handleDuplicate,
    handleDelete,
    handleToggleAlly,
    contextMenu,
  };
};
