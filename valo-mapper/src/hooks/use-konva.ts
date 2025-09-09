import { useCanvas } from "@/contexts/canvas-context";
import { SCALE_FACTOR, TEMP_DRAG_ID } from "@/lib/consts";
import { AbilityCanvas, AgentCanvas } from "@/lib/types";
import { getNextId, isAgent } from "@/lib/utils";
import { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { Dispatch, SetStateAction, useCallback } from "react";

export const useKonva = (stageRef: React.RefObject<Stage | null>) => {
  const {
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
  } = useCanvas();

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
          agent.id === TEMP_DRAG_ID ? { ...agent, id: getNextId(prev) } : agent
        );
      });
    } else {
      setAbilitiesOnCanvas((prev) => {
        return prev.map((ability) =>
          ability.id === TEMP_DRAG_ID
            ? { ...ability, id: getNextId(prev) }
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

  return {
    handleWheel,
    handleStageClick,
    handleStageMouseMove,
    handleStageMouseLeave,
    handleDragEnd,
  };
};
