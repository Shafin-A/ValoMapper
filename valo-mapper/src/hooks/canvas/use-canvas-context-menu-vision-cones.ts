import {
  findVisionConeAttachmentHost,
  getAttachedVisionConeIds,
  isVisionConeAction,
} from "@/lib/vision-cone-utils";
import type { AbilityCanvas } from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import type {
  CanvasContextMenuNotifications,
  CanvasContextMenuSession,
} from "./canvas-context-menu-types";

type VisionConeNotifications = Pick<
  CanvasContextMenuNotifications,
  "notifyAbilityAdded" | "notifyAbilityRemoved" | "notifyAbilityMoved"
>;

interface UseCanvasContextMenuVisionConesOptions
  extends VisionConeNotifications {
  session: CanvasContextMenuSession;
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
}

export const useCanvasContextMenuVisionCones = ({
  session,
  setAbilitiesOnCanvas,
  notifyAbilityRemoved,
  notifyAbilityMoved,
}: UseCanvasContextMenuVisionConesOptions) => {
  const { contextMenu, getEntities, closeContextMenu } = session;

  const removeAttachedVisionCones = useCallback(
    (hostId: string) => {
      const { abilitiesOnCanvas } = getEntities();
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
    [getEntities, setAbilitiesOnCanvas, notifyAbilityRemoved],
  );

  const handleRemoveAttachedVisionCone = useCallback(() => {
    if (!contextMenu.open) return;

    const { abilitiesOnCanvas } = getEntities();
    contextMenu.targetItems.forEach((target) => {
      let hostId: string | null = null;

      if (target.type === "agent" || target.type === "tool") {
        hostId = target.id;
      } else if (target.type === "ability") {
        const ability = abilitiesOnCanvas.find(
          (item) => item.id === target.id,
        );
        hostId =
          ability && !isVisionConeAction(ability.action) ? ability.id : null;
      }

      if (
        hostId &&
        getAttachedVisionConeIds(abilitiesOnCanvas, hostId).length > 0
      ) {
        removeAttachedVisionCones(hostId);
      }
    });

    closeContextMenu();
  }, [
    getEntities,
    contextMenu,
    removeAttachedVisionCones,
    closeContextMenu,
  ]);

  const handleDetachVisionCone = useCallback(() => {
    if (!contextMenu.open) return;

    const { abilitiesOnCanvas, agentsOnCanvas, toolIconsOnCanvas } =
      getEntities();
    const abilityIds = new Set(
      contextMenu.targetItems
        .filter((target) => target.type === "ability")
        .map((target) => target.id),
    );
    const updates = new Map<string, AbilityCanvas>();

    abilitiesOnCanvas
      .filter((ability) => abilityIds.has(ability.id))
      .forEach((ability) => {
        if (
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

        updates.set(ability.id, {
          ...ability,
          x: attachmentHost?.x ?? ability.x,
          y: attachmentHost?.y ?? ability.y,
          attachedToId: undefined,
        });
      });

    setAbilitiesOnCanvas((previous) =>
      previous.map((ability) => updates.get(ability.id) ?? ability),
    );
    updates.forEach((ability) => notifyAbilityMoved(ability));
    closeContextMenu();
  }, [
    getEntities,
    closeContextMenu,
    contextMenu,
    notifyAbilityMoved,
    setAbilitiesOnCanvas,
  ]);

  return { handleRemoveAttachedVisionCone, handleDetachVisionCone };
};
