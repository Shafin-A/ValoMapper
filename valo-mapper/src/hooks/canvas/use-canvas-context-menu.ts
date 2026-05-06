import { CONTEXT_MENU_DUPLICATE_OFFSET } from "@/lib/consts";
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
import {
  canAttachVisionCone,
  findVisionConeAttachmentHost,
  getAttachedVisionConeIds,
  isVisionConeAction,
} from "@/lib/vision-cone-utils";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import {
  findAbilityDefinitionByAction,
  getAbilityVariants,
} from "@/lib/consts/configs/agent-icon/consts";
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

  const removeAttachedVisionCones = useCallback(
    (hostId: string) => {
      const removedAbilityIds = getAttachedVisionConeIds(
        abilitiesOnCanvas,
        hostId,
      );
      if (removedAbilityIds.length === 0) {
        return;
      }

      const removedIds = new Set(removedAbilityIds);
      setAbilitiesOnCanvas((prev) =>
        prev.filter((ability) => !removedIds.has(ability.id)),
      );
      removedAbilityIds.forEach((abilityId) => notifyAbilityRemoved(abilityId));
    },
    [abilitiesOnCanvas, setAbilitiesOnCanvas, notifyAbilityRemoved],
  );

  const removeAbilityWithAttachedVisionCones = useCallback(
    (abilityId: string) => {
      const removedAbilityIds = [
        abilityId,
        ...getAttachedVisionConeIds(abilitiesOnCanvas, abilityId),
      ];
      const removedIds = new Set(removedAbilityIds);

      if (!abilitiesOnCanvas.some((ability) => removedIds.has(ability.id))) {
        return;
      }

      setAbilitiesOnCanvas((prev) =>
        prev.filter((ability) => !removedIds.has(ability.id)),
      );
      removedAbilityIds.forEach((removedAbilityId) =>
        notifyAbilityRemoved(removedAbilityId),
      );
    },
    [abilitiesOnCanvas, setAbilitiesOnCanvas, notifyAbilityRemoved],
  );

  const duplicateAttachedVisionConesForHost = useCallback(
    (hostId: string, duplicatedHostId: string, x: number, y: number) => {
      const attachedCone = [...abilitiesOnCanvas]
        .reverse()
        .find(
          (ability) =>
            isVisionConeAction(ability.action) &&
            ability.attachedToId === hostId,
        );

      if (!attachedCone) {
        return;
      }

      const duplicatedCone = {
        ...attachedCone,
        id: getNextId("ability"),
        x,
        y,
        attachedToId: duplicatedHostId,
      };

      setAbilitiesOnCanvas((prev) => [...prev, duplicatedCone]);
      notifyAbilityAdded(duplicatedCone);
    },
    [abilitiesOnCanvas, setAbilitiesOnCanvas, notifyAbilityAdded],
  );

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
        if (newAgent) {
          notifyAgentAdded(newAgent as AgentCanvas);
          duplicateAttachedVisionConesForHost(
            itemId,
            newAgent.id,
            newAgent.x,
            newAgent.y,
          );
        }
        break;
      }
      case "ability": {
        const ability = abilitiesOnCanvas.find((item) => item.id === itemId);
        if (!ability) {
          break;
        }

        const attachedAbilityHost =
          isVisionConeAction(ability.action) && ability.attachedToId
            ? abilitiesOnCanvas.find(
                (item) =>
                  item.id === ability.attachedToId &&
                  !isVisionConeAction(item.action),
              )
            : undefined;

        if (attachedAbilityHost) {
          const newAbility = duplicateItem(
            abilitiesOnCanvas,
            attachedAbilityHost.id,
            setAbilitiesOnCanvas,
            itemType,
          );
          if (newAbility) {
            notifyAbilityAdded(newAbility as AbilityCanvas);
            duplicateAttachedVisionConesForHost(
              attachedAbilityHost.id,
              newAbility.id,
              newAbility.x,
              newAbility.y,
            );
          }
          break;
        }

        if (isVisionConeAction(ability.action)) {
          const attachmentHost = findVisionConeAttachmentHost({
            attachedToId: ability.attachedToId,
            agentsOnCanvas,
            abilitiesOnCanvas,
            toolIconsOnCanvas,
            excludeId: ability.id,
          });
          const originX = attachmentHost?.x ?? ability.x;
          const originY = attachmentHost?.y ?? ability.y;

          const duplicatedCone: AbilityCanvas = {
            ...ability,
            id: getNextId(itemType),
            x: originX + CONTEXT_MENU_DUPLICATE_OFFSET,
            y: originY + CONTEXT_MENU_DUPLICATE_OFFSET,
            attachedToId: undefined,
          };

          setAbilitiesOnCanvas((prev) => [...prev, duplicatedCone]);
          notifyAbilityAdded(duplicatedCone);
          break;
        }

        const newAbility = duplicateItem(
          abilitiesOnCanvas,
          itemId,
          setAbilitiesOnCanvas,
          itemType,
        );
        if (newAbility) {
          notifyAbilityAdded(newAbility as AbilityCanvas);
          duplicateAttachedVisionConesForHost(
            itemId,
            newAbility.id,
            newAbility.x,
            newAbility.y,
          );
        }
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
          notifyImageAdded(newImage as ImageCanvas);
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
        if (newToolIcon) {
          notifyToolIconAdded(newToolIcon as ToolIconCanvas);
          duplicateAttachedVisionConesForHost(
            itemId,
            newToolIcon.id,
            newToolIcon.x,
            newToolIcon.y,
          );
        }
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
    notifyImageAdded,
    toolIconsOnCanvas,
    setToolIconsOnCanvas,
    notifyToolIconAdded,
    duplicateAttachedVisionConesForHost,
  ]);

  const handleDelete = useCallback(() => {
    if (!contextMenu.open) return;

    const { itemId, itemType } = contextMenu;

    const targetAbility =
      itemType === "ability"
        ? abilitiesOnCanvas.find((ability) => ability.id === itemId)
        : undefined;
    const attachedAbilityHost =
      targetAbility &&
      isVisionConeAction(targetAbility.action) &&
      targetAbility.attachedToId
        ? abilitiesOnCanvas.find(
            (ability) =>
              ability.id === targetAbility.attachedToId &&
              !isVisionConeAction(ability.action),
          )
        : undefined;
    const effectiveItemId = attachedAbilityHost?.id ?? itemId;

    const connectedLine = connectingLines.find(
      (line) =>
        line.fromId === effectiveItemId || line.toId === effectiveItemId,
    );

    switch (itemType) {
      case "agent":
        deleteItem(itemId, setAgentsOnCanvas);
        notifyAgentRemoved(itemId);
        removeAttachedVisionCones(itemId);
        if (connectedLine) {
          const connectedId =
            connectedLine.fromId === itemId
              ? connectedLine.toId
              : connectedLine.fromId;
          removeAbilityWithAttachedVisionCones(connectedId);
          setConnectingLines((prev) =>
            prev.filter((line) => line.id !== connectedLine.id),
          );
          notifyConnLineRemoved(connectedLine.id);
        }
        break;
      case "ability":
        removeAbilityWithAttachedVisionCones(effectiveItemId);
        if (connectedLine) {
          const connectedId =
            connectedLine.fromId === effectiveItemId
              ? connectedLine.toId
              : connectedLine.fromId;
          deleteItem(connectedId, setAgentsOnCanvas);
          notifyAgentRemoved(connectedId);
          removeAttachedVisionCones(connectedId);
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
        removeAttachedVisionCones(itemId);
        break;
    }
    closeContextMenu();
  }, [
    contextMenu,
    closeContextMenu,
    abilitiesOnCanvas,
    connectingLines,
    setAgentsOnCanvas,
    setConnectingLines,
    setTextsOnCanvas,
    setImagesOnCanvas,
    setToolIconsOnCanvas,
    notifyAgentRemoved,
    notifyTextRemoved,
    notifyImageRemoved,
    notifyToolIconRemoved,
    notifyConnLineRemoved,
    removeAttachedVisionCones,
    removeAbilityWithAttachedVisionCones,
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

  const handleToggleAgentDead = useCallback(() => {
    if (!contextMenu.open || contextMenu.itemType !== "agent") return;

    const agent = agentsOnCanvas.find((item) => item.id === contextMenu.itemId);
    if (!agent) return;

    const updatedAgent: AgentCanvas = {
      ...agent,
      isGray: !agent.isGray,
    };

    setAgentsOnCanvas((prev) =>
      prev.map((item) => (item.id === agent.id ? updatedAgent : item)),
    );
    notifyAgentMoved(updatedAgent);
    closeContextMenu();
  }, [
    contextMenu,
    agentsOnCanvas,
    setAgentsOnCanvas,
    notifyAgentMoved,
    closeContextMenu,
  ]);

  const handleSwapAbility = useCallback(() => {
    if (!contextMenu.open || contextMenu.itemType !== "ability") return;

    const ability = abilitiesOnCanvas.find((a) => a.id === contextMenu.itemId);
    if (!ability) return;

    const definition = findAbilityDefinitionByAction(ability.action);
    if (!definition) return;

    const variants = getAbilityVariants(definition);
    if (variants.length < 2) return;

    const currentIndex = variants.findIndex((v) => v.action === ability.action);
    const nextVariant = variants[(currentIndex + 1) % variants.length];

    const updatedAbility: AbilityCanvas = {
      ...ability,
      action: nextVariant.action,
      name: nextVariant.name,
    };
    setAbilitiesOnCanvas((prev) =>
      prev.map((a) => (a.id === ability.id ? updatedAbility : a)),
    );
    notifyAbilityMoved(updatedAbility);
    closeContextMenu();
  }, [
    contextMenu,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    notifyAbilityMoved,
    closeContextMenu,
  ]);

  const handleToggleAbilityIconOnly = useCallback(() => {
    if (!contextMenu.open || contextMenu.itemType !== "ability") return;

    const ability = abilitiesOnCanvas.find((a) => a.id === contextMenu.itemId);
    if (!ability || ability.action === "icon") return;

    const updatedAbility: AbilityCanvas = {
      ...ability,
      iconOnly: !ability.iconOnly,
    };

    if (
      isVisionConeAction(ability.action) &&
      !canAttachVisionCone(updatedAbility)
    ) {
      updatedAbility.attachedToId = undefined;
    }

    setAbilitiesOnCanvas((prev) =>
      prev.map((a) => (a.id === ability.id ? updatedAbility : a)),
    );
    notifyAbilityMoved(updatedAbility);
    closeContextMenu();
  }, [
    contextMenu,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    notifyAbilityMoved,
    closeContextMenu,
  ]);

  const handleToggleAbilityOuterCircle = useCallback(() => {
    if (!contextMenu.open || contextMenu.itemType !== "ability") return;

    const ability = abilitiesOnCanvas.find((a) => a.id === contextMenu.itemId);
    if (!ability) return;

    const updatedAbility: AbilityCanvas = {
      ...ability,
      showOuterCircle: ability.showOuterCircle === false ? true : false,
    };

    setAbilitiesOnCanvas((prev) =>
      prev.map((a) => (a.id === ability.id ? updatedAbility : a)),
    );
    notifyAbilityMoved(updatedAbility);
    closeContextMenu();
  }, [
    contextMenu,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    notifyAbilityMoved,
    closeContextMenu,
  ]);

  const handleRemoveAttachedVisionCone = useCallback(() => {
    if (!contextMenu.open) return;

    const { itemId, itemType } = contextMenu;

    const hostId =
      itemType === "agent" || itemType === "tool"
        ? itemId
        : itemType === "ability"
          ? (() => {
              const ability = abilitiesOnCanvas.find((a) => a.id === itemId);
              return ability && !isVisionConeAction(ability.action)
                ? ability.id
                : null;
            })()
          : null;

    if (
      !hostId ||
      getAttachedVisionConeIds(abilitiesOnCanvas, hostId).length === 0
    ) {
      return;
    }

    removeAttachedVisionCones(hostId);
    closeContextMenu();
  }, [
    contextMenu,
    abilitiesOnCanvas,
    removeAttachedVisionCones,
    closeContextMenu,
  ]);

  const handleDetachVisionCone = useCallback(() => {
    if (!contextMenu.open || contextMenu.itemType !== "ability") return;

    const ability = abilitiesOnCanvas.find((a) => a.id === contextMenu.itemId);
    if (
      !ability ||
      !isVisionConeAction(ability.action) ||
      !ability.attachedToId
    ) {
      return;
    }

    const attachmentHost = findVisionConeAttachmentHost({
      attachedToId: ability.attachedToId,
      agentsOnCanvas,
      abilitiesOnCanvas,
      toolIconsOnCanvas,
      excludeId: ability.id,
    });

    const updatedAbility: AbilityCanvas = {
      ...ability,
      x: attachmentHost?.x ?? ability.x,
      y: attachmentHost?.y ?? ability.y,
      attachedToId: undefined,
    };

    setAbilitiesOnCanvas((prev) =>
      prev.map((item) => (item.id === ability.id ? updatedAbility : item)),
    );
    notifyAbilityMoved(updatedAbility);
    closeContextMenu();
  }, [
    contextMenu,
    abilitiesOnCanvas,
    agentsOnCanvas,
    toolIconsOnCanvas,
    setAbilitiesOnCanvas,
    notifyAbilityMoved,
    closeContextMenu,
  ]);

  return {
    contextMenu,
    handleContextMenu,
    handlePopoverOpenChange,
    handleDuplicate,
    handleDelete,
    handleToggleAlly,
    handleToggleAgentDead,
    handleSwapAbility,
    handleToggleAbilityIconOnly,
    handleToggleAbilityOuterCircle,
    handleRemoveAttachedVisionCone,
    handleDetachVisionCone,
    closeContextMenu,
  };
};
