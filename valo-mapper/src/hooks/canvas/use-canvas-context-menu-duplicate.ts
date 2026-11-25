import { CONTEXT_MENU_DUPLICATE_OFFSET } from "@/lib/consts";
import {
  findVisionConeAttachmentHost,
  isVisionConeAction,
} from "@/lib/vision-cone-utils";
import { getNextId } from "@/lib/ids";
import type {
  AbilityCanvas,
  AgentCanvas,
  BaseCanvasItem,
  ImageCanvas,
  ItemType,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import type {
  CanvasContextMenuNotifications,
  CanvasContextMenuSession,
} from "./canvas-context-menu-types";

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

type DuplicateNotifications = Pick<
  CanvasContextMenuNotifications,
  | "notifyAgentAdded"
  | "notifyAbilityAdded"
  | "notifyTextAdded"
  | "notifyImageAdded"
  | "notifyToolIconAdded"
>;

interface UseCanvasContextMenuDuplicateOptions extends DuplicateNotifications {
  session: CanvasContextMenuSession;
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
  setTextsOnCanvas: Dispatch<SetStateAction<TextCanvas[]>>;
  setImagesOnCanvas: Dispatch<SetStateAction<ImageCanvas[]>>;
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>;
}

export const useCanvasContextMenuDuplicate = ({
  session,
  setAgentsOnCanvas,
  setAbilitiesOnCanvas,
  setTextsOnCanvas,
  setImagesOnCanvas,
  setToolIconsOnCanvas,
  notifyAgentAdded,
  notifyAbilityAdded,
  notifyTextAdded,
  notifyImageAdded,
  notifyToolIconAdded,
}: UseCanvasContextMenuDuplicateOptions) => {
  const { contextMenu, getEntities, closeContextMenu } = session;

  const duplicateAttachedVisionConesForHost = useCallback(
    (hostId: string, duplicatedHostId: string, x: number, y: number) => {
      const { abilitiesOnCanvas } = getEntities();
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
    [getEntities, setAbilitiesOnCanvas, notifyAbilityAdded],
  );

  const duplicateSingleItem = useCallback(
    (itemId: string, itemType: ItemType) => {
      const {
        agentsOnCanvas,
        abilitiesOnCanvas,
        textsOnCanvas,
        imagesOnCanvas,
        toolIconsOnCanvas,
      } = getEntities();

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
    },
    [
      getEntities,
      setAgentsOnCanvas,
      notifyAgentAdded,
      setAbilitiesOnCanvas,
      notifyAbilityAdded,
      setTextsOnCanvas,
      notifyTextAdded,
      setImagesOnCanvas,
      notifyImageAdded,
      setToolIconsOnCanvas,
      notifyToolIconAdded,
      duplicateAttachedVisionConesForHost,
    ],
  );

  const handleDuplicate = useCallback(() => {
    if (!contextMenu.open) return;

    contextMenu.targetItems.forEach((target) =>
      duplicateSingleItem(target.id, target.type),
    );
    closeContextMenu();
  }, [contextMenu, closeContextMenu, duplicateSingleItem]);

  return { handleDuplicate };
};
