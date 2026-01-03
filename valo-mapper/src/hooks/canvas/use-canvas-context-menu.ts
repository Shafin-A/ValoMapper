import {
  AbilityCanvas,
  AgentCanvas,
  ImageCanvas,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import { getNextId } from "@/lib/utils";
import { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "konva/lib/Stage";
import { Dispatch, SetStateAction, useCallback, useState } from "react";

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  itemId: string;
  itemType: "agent" | "ability" | "text" | "image" | "tool";
}

export const useCanvasContextMenu = (
  stageRef: React.RefObject<Stage | null>,
  agentsOnCanvas: AgentCanvas[],
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>,
  abilitiesOnCanvas: AbilityCanvas[],
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>,
  textsOnCanvas: TextCanvas[],
  setTextsOnCanvas: Dispatch<SetStateAction<TextCanvas[]>>,
  imagesOnCanvas: ImageCanvas[],
  setImagesOnCanvas: Dispatch<SetStateAction<ImageCanvas[]>>,
  toolIconsOnCanvas: ToolIconCanvas[],
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>
) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    itemId: "",
    itemType: "agent",
  });

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, []);

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
      else itemType = "tool";

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
    contextMenu,
    handleContextMenu,
    handlePopoverOpenChange,
    handleDuplicate,
    handleDelete,
    handleToggleAlly,
    closeContextMenu,
  };
};
