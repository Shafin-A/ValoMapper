import { CONTEXT_MENU_DUPLICATE_OFFSET } from "@/lib/consts/misc/consts";
import {
  AbilityCanvas,
  AgentCanvas,
  BaseCanvasItem,
  ConnectingLine,
  ImageCanvas,
  ItemType,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import { getNextId } from "@/lib/utils";
import { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "konva/lib/Stage";
import { Dispatch, SetStateAction, useCallback, useState } from "react";

const duplicateItem = <T extends BaseCanvasItem>(
  items: T[],
  itemId: string,
  setItems: Dispatch<SetStateAction<T[]>>,
  idPrefix: ItemType
): void => {
  const item = items.find((i) => i.id === itemId);
  if (item) {
    const newItem = {
      ...item,
      id: getNextId(idPrefix),
      x: item.x + CONTEXT_MENU_DUPLICATE_OFFSET,
      y: item.y + CONTEXT_MENU_DUPLICATE_OFFSET,
    };
    setItems((prev) => [...prev, newItem]);
  }
};

const deleteItem = <T extends BaseCanvasItem>(
  itemId: string,
  setItems: Dispatch<SetStateAction<T[]>>
): void => {
  setItems((prev) => prev.filter((item) => item.id !== itemId));
};

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  itemId: string;
  itemType: ItemType;
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
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>,
  connectingLines: ConnectingLine[],
  setConnectingLines: Dispatch<SetStateAction<ConnectingLine[]>>
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

      let itemType: ItemType;
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

    switch (itemType) {
      case "agent":
        duplicateItem(agentsOnCanvas, itemId, setAgentsOnCanvas, itemType);
        break;
      case "ability":
        duplicateItem(
          abilitiesOnCanvas,
          itemId,
          setAbilitiesOnCanvas,
          itemType
        );
        break;
      case "text":
        duplicateItem(textsOnCanvas, itemId, setTextsOnCanvas, itemType);
        break;
      case "image":
        duplicateItem(imagesOnCanvas, itemId, setImagesOnCanvas, itemType);
        break;
      case "tool":
        duplicateItem(
          toolIconsOnCanvas,
          itemId,
          setToolIconsOnCanvas,
          itemType
        );
        break;
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

    const connectedLine = connectingLines.find(
      (line) => line.fromId === itemId || line.toId === itemId
    );

    switch (itemType) {
      case "agent":
        deleteItem(itemId, setAgentsOnCanvas);
        if (connectedLine) {
          const connectedId =
            connectedLine.fromId === itemId
              ? connectedLine.toId
              : connectedLine.fromId;
          deleteItem(connectedId, setAbilitiesOnCanvas);
          setConnectingLines((prev) =>
            prev.filter((line) => line.id !== connectedLine.id)
          );
        }
        break;
      case "ability":
        deleteItem(itemId, setAbilitiesOnCanvas);
        if (connectedLine) {
          const connectedId =
            connectedLine.fromId === itemId
              ? connectedLine.toId
              : connectedLine.fromId;
          deleteItem(connectedId, setAgentsOnCanvas);
          setConnectingLines((prev) =>
            prev.filter((line) => line.id !== connectedLine.id)
          );
        }
        break;
      case "text":
        deleteItem(itemId, setTextsOnCanvas);
        break;
      case "image":
        deleteItem(itemId, setImagesOnCanvas);
        break;
      case "tool":
        deleteItem(itemId, setToolIconsOnCanvas);
        break;
    }
    closeContextMenu();
  }, [
    contextMenu,
    closeContextMenu,
    connectingLines,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setConnectingLines,
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
