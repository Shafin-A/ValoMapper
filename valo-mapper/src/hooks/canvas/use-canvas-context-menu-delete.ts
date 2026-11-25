import {
  getCanvasItemInstance,
  getCanvasItemTypeById,
} from "@/lib/canvas-selection";
import {
  getAttachedVisionConeIds,
  isVisionConeAction,
} from "@/lib/vision-cone-utils";
import type {
  AbilityCanvas,
  AgentCanvas,
  CanvasSelectionItem,
  ConnectingLine,
  ImageCanvas,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import type {
  CanvasContextMenuNotifications,
  CanvasContextMenuSession,
} from "./canvas-context-menu-types";

type DeleteNotifications = Pick<
  CanvasContextMenuNotifications,
  | "notifyAgentRemoved"
  | "notifyAbilityRemoved"
  | "notifyTextRemoved"
  | "notifyImageRemoved"
  | "notifyToolIconRemoved"
  | "notifyConnLineRemoved"
>;

interface UseCanvasContextMenuDeleteOptions extends DeleteNotifications {
  session: CanvasContextMenuSession;
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
  setTextsOnCanvas: Dispatch<SetStateAction<TextCanvas[]>>;
  setImagesOnCanvas: Dispatch<SetStateAction<ImageCanvas[]>>;
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>;
  setConnectingLines: Dispatch<SetStateAction<ConnectingLine[]>>;
  setSelectedCanvasItems: Dispatch<SetStateAction<CanvasSelectionItem[]>>;
}

export const useCanvasContextMenuDelete = ({
  session,
  setAgentsOnCanvas,
  setAbilitiesOnCanvas,
  setTextsOnCanvas,
  setImagesOnCanvas,
  setToolIconsOnCanvas,
  setConnectingLines,
  setSelectedCanvasItems,
  notifyAgentRemoved,
  notifyAbilityRemoved,
  notifyTextRemoved,
  notifyImageRemoved,
  notifyToolIconRemoved,
  notifyConnLineRemoved,
}: UseCanvasContextMenuDeleteOptions) => {
  const { contextMenu, getEntities, getCollections, closeContextMenu } = session;

  const deleteTargetItems = useCallback(
    (targets: CanvasSelectionItem[]) => {
      if (targets.length === 0) return;

      const collections = getCollections();
      const { connectingLines } = getEntities();
      const queue: CanvasSelectionItem[] = [];
      const visited = new Set<string>();
      const removedAgentIds = new Set<string>();
      const removedAbilityIds = new Set<string>();
      const removedTextIds = new Set<string>();
      const removedImageIds = new Set<string>();
      const removedToolIconIds = new Set<string>();
      const removedLineIds = new Set<string>();

      const enqueue = (target: CanvasSelectionItem) => {
        const key = `${target.type}:${target.id}`;
        if (visited.has(key)) return;
        visited.add(key);
        queue.push(target);
      };

      const enqueueById = (id: string) => {
        const type = getCanvasItemTypeById(id, collections);
        if (type) enqueue({ id, type });
      };

      targets.forEach(enqueue);

      while (queue.length > 0) {
        const target = queue.shift();
        if (!target) continue;

        const entry = getCanvasItemInstance(collections, target);
        if (!entry) continue;

        switch (entry.type) {
          case "agent": {
            removedAgentIds.add(entry.item.id);
            getAttachedVisionConeIds(
              collections.abilitiesOnCanvas,
              entry.item.id,
            ).forEach((id) => removedAbilityIds.add(id));
            collections.toolIconsOnCanvas
              .filter((toolIcon) => toolIcon.attachedToId === entry.item.id)
              .forEach((toolIcon) => removedToolIconIds.add(toolIcon.id));

            const connectedLine = connectingLines.find(
              (line) =>
                line.fromId === entry.item.id || line.toId === entry.item.id,
            );
            if (connectedLine) {
              removedLineIds.add(connectedLine.id);
              enqueueById(
                connectedLine.fromId === entry.item.id
                  ? connectedLine.toId
                  : connectedLine.fromId,
              );
            }
            break;
          }
          case "ability": {
            const ability = entry.item;
            if (isVisionConeAction(ability.action) && ability.attachedToId) {
              enqueueById(ability.attachedToId);
              break;
            }

            removedAbilityIds.add(ability.id);
            getAttachedVisionConeIds(
              collections.abilitiesOnCanvas,
              ability.id,
            ).forEach((id) => removedAbilityIds.add(id));

            const connectedLine = connectingLines.find(
              (line) =>
                line.fromId === ability.id || line.toId === ability.id,
            );
            if (connectedLine) {
              removedLineIds.add(connectedLine.id);
              enqueueById(
                connectedLine.fromId === ability.id
                  ? connectedLine.toId
                  : connectedLine.fromId,
              );
            }
            break;
          }
          case "text":
            removedTextIds.add(entry.item.id);
            break;
          case "image":
            removedImageIds.add(entry.item.id);
            break;
          case "tool":
            removedToolIconIds.add(entry.item.id);
            getAttachedVisionConeIds(
              collections.abilitiesOnCanvas,
              entry.item.id,
            ).forEach((id) => removedAbilityIds.add(id));
            break;
        }
      }

      if (removedAgentIds.size > 0) {
        setAgentsOnCanvas((previous) =>
          previous.filter((agent) => !removedAgentIds.has(agent.id)),
        );
        removedAgentIds.forEach((id) => notifyAgentRemoved(id));
      }
      if (removedAbilityIds.size > 0) {
        setAbilitiesOnCanvas((previous) =>
          previous.filter((ability) => !removedAbilityIds.has(ability.id)),
        );
        removedAbilityIds.forEach((id) => notifyAbilityRemoved(id));
      }
      if (removedTextIds.size > 0) {
        setTextsOnCanvas((previous) =>
          previous.filter((text) => !removedTextIds.has(text.id)),
        );
        removedTextIds.forEach((id) => notifyTextRemoved(id));
      }
      if (removedImageIds.size > 0) {
        setImagesOnCanvas((previous) =>
          previous.filter((image) => !removedImageIds.has(image.id)),
        );
        removedImageIds.forEach((id) => notifyImageRemoved(id));
      }
      if (removedToolIconIds.size > 0) {
        setToolIconsOnCanvas((previous) =>
          previous.filter((toolIcon) => !removedToolIconIds.has(toolIcon.id)),
        );
        removedToolIconIds.forEach((id) => notifyToolIconRemoved(id));
      }
      if (removedLineIds.size > 0) {
        setConnectingLines((previous) =>
          previous.filter((line) => !removedLineIds.has(line.id)),
        );
        removedLineIds.forEach((id) => notifyConnLineRemoved(id));
      }

      setSelectedCanvasItems((previous) =>
        previous.filter(
          (selection) =>
            !removedAgentIds.has(selection.id) &&
            !removedAbilityIds.has(selection.id) &&
            !removedTextIds.has(selection.id) &&
            !removedImageIds.has(selection.id) &&
            !removedToolIconIds.has(selection.id),
        ),
      );
    },
    [
      getCollections,
      getEntities,
      notifyAbilityRemoved,
      notifyAgentRemoved,
      notifyConnLineRemoved,
      notifyImageRemoved,
      notifyTextRemoved,
      notifyToolIconRemoved,
      setAbilitiesOnCanvas,
      setAgentsOnCanvas,
      setConnectingLines,
      setImagesOnCanvas,
      setSelectedCanvasItems,
      setTextsOnCanvas,
      setToolIconsOnCanvas,
    ],
  );

  const handleDelete = useCallback(() => {
    if (!contextMenu.open) return;

    deleteTargetItems(contextMenu.targetItems);
    closeContextMenu();
  }, [contextMenu, closeContextMenu, deleteTargetItems]);

  return { handleDelete, deleteTargetItems };
};
