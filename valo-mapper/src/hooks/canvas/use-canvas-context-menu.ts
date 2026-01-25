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
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { useWebSocket } from "@/contexts/websocket-context";
import { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "konva/lib/Stage";
import { Dispatch, SetStateAction, useCallback, useState } from "react";

const duplicateItem = <T extends BaseCanvasItem>(
  items: T[],
  itemId: string,
  setItems: Dispatch<SetStateAction<T[]>>,
  idPrefix: ItemType,
): T | null => {
  const item = items.find((i) => i.id === itemId);
  if (item) {
    const newItem = {
      ...item,
      id: getNextId(idPrefix),
      x: item.x + CONTEXT_MENU_DUPLICATE_OFFSET,
      y: item.y + CONTEXT_MENU_DUPLICATE_OFFSET,
    };
    setItems((prev) => [...prev, newItem]);
    return newItem;
  }
  return null;
};

const deleteItem = <T extends BaseCanvasItem>(
  itemId: string,
  setItems: Dispatch<SetStateAction<T[]>>,
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
  setConnectingLines: Dispatch<SetStateAction<ConnectingLine[]>>,
  saveCanvasStateAsync?: () => Promise<void>,
) => {
  const {
    notifyAgentAdded,
    notifyAgentMoved,
    notifyAgentRemoved,
    notifyAbilityAdded,
    notifyAbilityMoved,
    notifyAbilityRemoved,
    notifyTextAdded,
    notifyTextRemoved,
    notifyImageAdded,
    notifyImageRemoved,
    notifyToolIconAdded,
    notifyToolIconRemoved,
    notifyConnLineRemoved,
  } = useCollaborativeCanvas();

  const { users } = useWebSocket();

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
        (agent) => agent.id.toString() === targetId,
      );
      const isAbilityItem = abilitiesOnCanvas.some(
        (ability) => ability.id.toString() === targetId,
      );
      const isTextItem = textsOnCanvas.some(
        (text) => text.id.toString() === targetId,
      );
      const isImageItem = imagesOnCanvas.some(
        (image) => image.id.toString() === targetId,
      );
      const isToolIconItem = toolIconsOnCanvas.some(
        (toolIcon) => toolIcon.id === targetId,
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
    ],
  );

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setContextMenu((prev) => ({ ...prev, open }));
  }, []);

  const handleDuplicate = useCallback(async () => {
    if (!contextMenu.open) return;

    const { itemId, itemType } = contextMenu;

    switch (itemType) {
      case "agent": {
        const newAgent = duplicateItem(
          agentsOnCanvas,
          itemId,
          setAgentsOnCanvas,
          itemType,
        );
        if (newAgent) notifyAgentAdded(newAgent as AgentCanvas);
        break;
      }
      case "ability": {
        const newAbility = duplicateItem(
          abilitiesOnCanvas,
          itemId,
          setAbilitiesOnCanvas,
          itemType,
        );
        if (newAbility) notifyAbilityAdded(newAbility as AbilityCanvas);
        break;
      }
      case "text": {
        const newText = duplicateItem(
          textsOnCanvas,
          itemId,
          setTextsOnCanvas,
          itemType,
        );
        if (newText) notifyTextAdded(newText as TextCanvas);
        break;
      }
      case "image": {
        const newImage = duplicateItem(
          imagesOnCanvas,
          itemId,
          setImagesOnCanvas,
          itemType,
        );
        if (newImage) {
          if (users.length > 1) await saveCanvasStateAsync?.();
          notifyImageAdded();
        }
        break;
      }
      case "tool": {
        const newToolIcon = duplicateItem(
          toolIconsOnCanvas,
          itemId,
          setToolIconsOnCanvas,
          itemType,
        );
        if (newToolIcon) notifyToolIconAdded(newToolIcon as ToolIconCanvas);
        break;
      }
    }
    closeContextMenu();
  }, [
    contextMenu,
    closeContextMenu,
    agentsOnCanvas,
    setAgentsOnCanvas,
    notifyAgentAdded,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    notifyAbilityAdded,
    textsOnCanvas,
    setTextsOnCanvas,
    notifyTextAdded,
    imagesOnCanvas,
    setImagesOnCanvas,
    users.length,
    saveCanvasStateAsync,
    notifyImageAdded,
    toolIconsOnCanvas,
    setToolIconsOnCanvas,
    notifyToolIconAdded,
  ]);

  const handleDelete = useCallback(() => {
    if (!contextMenu.open) return;

    const { itemId, itemType } = contextMenu;

    const connectedLine = connectingLines.find(
      (line) => line.fromId === itemId || line.toId === itemId,
    );

    switch (itemType) {
      case "agent":
        deleteItem(itemId, setAgentsOnCanvas);
        notifyAgentRemoved(itemId);
        if (connectedLine) {
          const connectedId =
            connectedLine.fromId === itemId
              ? connectedLine.toId
              : connectedLine.fromId;
          deleteItem(connectedId, setAbilitiesOnCanvas);
          notifyAbilityRemoved(connectedId);
          setConnectingLines((prev) =>
            prev.filter((line) => line.id !== connectedLine.id),
          );
          notifyConnLineRemoved(connectedLine.id);
        }
        break;
      case "ability":
        deleteItem(itemId, setAbilitiesOnCanvas);
        notifyAbilityRemoved(itemId);
        if (connectedLine) {
          const connectedId =
            connectedLine.fromId === itemId
              ? connectedLine.toId
              : connectedLine.fromId;
          deleteItem(connectedId, setAgentsOnCanvas);
          notifyAgentRemoved(connectedId);
          setConnectingLines((prev) =>
            prev.filter((line) => line.id !== connectedLine.id),
          );
          notifyConnLineRemoved(connectedLine.id);
        }
        break;
      case "text":
        deleteItem(itemId, setTextsOnCanvas);
        notifyTextRemoved(itemId);
        break;
      case "image":
        deleteItem(itemId, setImagesOnCanvas);
        notifyImageRemoved(itemId);
        break;
      case "tool":
        deleteItem(itemId, setToolIconsOnCanvas);
        notifyToolIconRemoved(itemId);
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
    notifyAgentRemoved,
    notifyAbilityRemoved,
    notifyTextRemoved,
    notifyImageRemoved,
    notifyToolIconRemoved,
    notifyConnLineRemoved,
  ]);

  const handleToggleAlly = useCallback(() => {
    if (!contextMenu.open) return;

    const { itemId, itemType } = contextMenu;

    if (itemType === "agent") {
      const agent = agentsOnCanvas.find((a) => a.id === itemId);
      if (agent) {
        const updatedAgent = { ...agent, isAlly: !agent.isAlly };
        setAgentsOnCanvas((prev) =>
          prev.map((a) => (a.id === itemId ? updatedAgent : a)),
        );
        notifyAgentMoved(updatedAgent);
      }
    } else if (itemType === "ability") {
      const ability = abilitiesOnCanvas.find((a) => a.id === itemId);
      if (ability) {
        const updatedAbility = { ...ability, isAlly: !ability.isAlly };
        setAbilitiesOnCanvas((prev) =>
          prev.map((a) => (a.id === itemId ? updatedAbility : a)),
        );
        notifyAbilityMoved(updatedAbility);
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
    notifyAgentMoved,
    notifyAbilityMoved,
  ]);

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
