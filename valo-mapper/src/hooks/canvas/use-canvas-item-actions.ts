import {
  useCanvasActions,
  useCanvasEntityActions,
  useCanvasSelectionState,
} from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import {
  type CanvasItemCollections,
  getCanvasItemInstance,
  getCanvasItemTypeById,
} from "@/lib/canvas-selection";
import type { CanvasItemInstance, CanvasSelectionItem } from "@/lib/types";
import {
  getAttachedToolIconIds,
  canAttachToolIcon,
  findToolIconAttachmentTarget,
  getToolIconAttachmentPosition,
} from "@/lib/tool-icon";
import {
  applyVisionConeAttachment,
  canAttachVisionCone,
  findVisionConeAttachmentTarget,
  getAttachedVisionConeIds,
  isVisionConeAction,
} from "@/lib/vision-cone-utils";
import { useCallback } from "react";

export type CanvasItemMove = {
  entry: CanvasItemInstance;
  x: number;
  y: number;
};

export const useCanvasItemActions = () => {
  const { getLatestEntities } = useCanvasActions();
  const {
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setTextsOnCanvas,
    setImagesOnCanvas,
    setToolIconsOnCanvas,
    setConnectingLines,
  } = useCanvasEntityActions();
  const { setSelectedCanvasItems } = useCanvasSelectionState();
  const { agentsSettings, abilitiesSettings } = useSettings();
  const {
    notifyAgentMoved,
    notifyAgentRemoved,
    notifyAbilityMoved,
    notifyAbilityRemoved,
    notifyTextUpdated,
    notifyTextRemoved,
    notifyImageMoved,
    notifyImageRemoved,
    notifyToolIconMoved,
    notifyToolIconRemoved,
    notifyConnLineRemoved,
  } = useCollaborativeCanvas();

  const deleteItems = useCallback(
    (targets: CanvasSelectionItem[]) => {
      if (targets.length === 0) return;

      const {
        agentsOnCanvas,
        abilitiesOnCanvas,
        textsOnCanvas,
        imagesOnCanvas,
        toolIconsOnCanvas,
        connectingLines,
      } = getLatestEntities();

      const currentCollections: CanvasItemCollections = {
        agentsOnCanvas,
        abilitiesOnCanvas,
        textsOnCanvas,
        imagesOnCanvas,
        toolIconsOnCanvas,
      };

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
        const type = getCanvasItemTypeById(id, currentCollections);
        if (type) enqueue({ id, type });
      };

      targets.forEach(enqueue);

      while (queue.length > 0) {
        const target = queue.shift();
        if (!target) continue;

        const entry = getCanvasItemInstance(currentCollections, target);
        if (!entry) continue;

        switch (entry.type) {
          case "agent": {
            removedAgentIds.add(entry.item.id);
            getAttachedVisionConeIds(
              currentCollections.abilitiesOnCanvas,
              entry.item.id,
            ).forEach((id) => removedAbilityIds.add(id));
            getAttachedToolIconIds(
              currentCollections.toolIconsOnCanvas,
              entry.item.id,
            ).forEach((id) => removedToolIconIds.add(id));

            const connectedLine = connectingLines.find(
              (line) =>
                line.fromId === entry.item.id || line.toId === entry.item.id,
            );
            if (connectedLine) {
              removedLineIds.add(connectedLine.id);
              const connectedId =
                connectedLine.fromId === entry.item.id
                  ? connectedLine.toId
                  : connectedLine.fromId;
              enqueueById(connectedId);
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
              currentCollections.abilitiesOnCanvas,
              ability.id,
            ).forEach((id) => removedAbilityIds.add(id));

            const connectedLine = connectingLines.find(
              (line) =>
                line.fromId === ability.id || line.toId === ability.id,
            );
            if (connectedLine) {
              removedLineIds.add(connectedLine.id);
              const connectedId =
                connectedLine.fromId === ability.id
                  ? connectedLine.toId
                  : connectedLine.fromId;
              enqueueById(connectedId);
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
              currentCollections.abilitiesOnCanvas,
              entry.item.id,
            ).forEach((id) => removedAbilityIds.add(id));
            break;
        }
      }

      if (
        removedAgentIds.size === 0 &&
        removedAbilityIds.size === 0 &&
        removedTextIds.size === 0 &&
        removedImageIds.size === 0 &&
        removedToolIconIds.size === 0
      ) {
        return;
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
      getLatestEntities,
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

  const moveItems = useCallback(
    (moves: CanvasItemMove[]) => {
      if (moves.length === 0) return;

      const {
        agentsOnCanvas,
        abilitiesOnCanvas,
        textsOnCanvas,
        imagesOnCanvas,
        toolIconsOnCanvas,
      } = getLatestEntities();

      const moveById = new Map(
        moves.map((move) => [move.entry.item.id, move]),
      );

      const movedAgentIds = new Set<string>();
      const movedAbilityIds = new Set<string>();
      const movedTextIds = new Set<string>();
      const movedImageIds = new Set<string>();
      const movedToolIconIds = new Set<string>();

      const nextAgents = agentsOnCanvas.map((agent) => {
        const move = moveById.get(agent.id);
        if (!move) return agent;
        movedAgentIds.add(agent.id);
        return { ...agent, x: move.x, y: move.y };
      });

      let nextAbilities = abilitiesOnCanvas.map((ability) => {
        const move = moveById.get(ability.id);
        if (!move) return ability;
        movedAbilityIds.add(ability.id);
        return { ...ability, x: move.x, y: move.y };
      });

      const nextTexts = textsOnCanvas.map((text) => {
        const move = moveById.get(text.id);
        if (!move) return text;
        movedTextIds.add(text.id);
        return { ...text, x: move.x, y: move.y };
      });

      const nextImages = imagesOnCanvas.map((image) => {
        const move = moveById.get(image.id);
        if (!move) return image;
        movedImageIds.add(image.id);
        return { ...image, x: move.x, y: move.y };
      });

      let nextToolIcons = toolIconsOnCanvas.map((toolIcon) => {
        const move = moveById.get(toolIcon.id);
        if (!move) return toolIcon;
        movedToolIconIds.add(toolIcon.id);
        return { ...toolIcon, x: move.x, y: move.y };
      });

      const updatedToolIcons = new Map<
        string,
        (typeof toolIconsOnCanvas)[number]
      >();
      const removedAbilityIds = new Set<string>();

      nextToolIcons = nextToolIcons.map((toolIcon) => {
        if (!movedToolIconIds.has(toolIcon.id)) return toolIcon;

        if (canAttachToolIcon(toolIcon)) {
          const attachmentHost = findToolIconAttachmentTarget({
            point: { x: toolIcon.x, y: toolIcon.y },
            agentsOnCanvas: nextAgents,
            agentsSettings,
            excludeId: toolIcon.id,
          });
          const nextPosition = attachmentHost
            ? getToolIconAttachmentPosition(
                toolIcon,
                attachmentHost.x,
                attachmentHost.y,
                agentsSettings,
              )
            : { x: toolIcon.x, y: toolIcon.y };

          const updated = {
            ...toolIcon,
            x: nextPosition.x,
            y: nextPosition.y,
            attachedToId: attachmentHost?.id,
          };
          updatedToolIcons.set(updated.id, updated);
          return updated;
        }

        if (toolIcon.attachedToId) {
          const updated = { ...toolIcon, attachedToId: undefined };
          updatedToolIcons.set(updated.id, updated);
          return updated;
        }

        updatedToolIcons.set(toolIcon.id, toolIcon);
        return toolIcon;
      });

      for (const agent of nextAgents) {
        if (!movedAgentIds.has(agent.id)) continue;

        nextToolIcons = nextToolIcons.map((toolIcon) => {
          if (toolIcon.attachedToId !== agent.id) return toolIcon;
          if (movedToolIconIds.has(toolIcon.id)) return toolIcon;

          const nextPosition = getToolIconAttachmentPosition(
            toolIcon,
            agent.x,
            agent.y,
            agentsSettings,
          );
          const updated = { ...toolIcon, ...nextPosition };
          updatedToolIcons.set(updated.id, updated);
          return updated;
        });
      }

      let workingAbilities = nextAbilities;
      for (const ability of nextAbilities) {
        if (!movedAbilityIds.has(ability.id)) continue;
        if (!canAttachVisionCone(ability)) continue;

        const attachmentTarget = findVisionConeAttachmentTarget({
          point: { x: ability.x, y: ability.y },
          agentsOnCanvas: nextAgents,
          abilitiesOnCanvas: workingAbilities,
          toolIconsOnCanvas: nextToolIcons,
          agentsSettings,
          abilitiesSettings,
          excludeId: ability.id,
        });

        const updatedAbility = {
          ...ability,
          x: attachmentTarget?.x ?? ability.x,
          y: attachmentTarget?.y ?? ability.y,
          attachedToId: attachmentTarget?.id,
        };

        const { nextAbilitiesOnCanvas, removedAbilityIds: removedIds } =
          applyVisionConeAttachment({
            abilitiesOnCanvas: workingAbilities,
            previousAbilityId: ability.id,
            nextAbility: updatedAbility,
          });

        workingAbilities = nextAbilitiesOnCanvas;
        removedIds.forEach((id) => removedAbilityIds.add(id));
      }
      nextAbilities = workingAbilities;

      setAgentsOnCanvas(nextAgents);
      setAbilitiesOnCanvas(nextAbilities);
      setTextsOnCanvas(nextTexts);
      setImagesOnCanvas(nextImages);
      setToolIconsOnCanvas(nextToolIcons);

      removedAbilityIds.forEach((id) => {
        movedAbilityIds.delete(id);
        notifyAbilityRemoved(id);
      });

      nextAgents.forEach((agent) => {
        if (movedAgentIds.has(agent.id)) notifyAgentMoved(agent);
      });

      nextAbilities.forEach((ability) => {
        if (movedAbilityIds.has(ability.id)) notifyAbilityMoved(ability);
      });

      nextTexts.forEach((text) => {
        if (movedTextIds.has(text.id)) notifyTextUpdated(text);
      });

      nextImages.forEach((image) => {
        if (movedImageIds.has(image.id)) notifyImageMoved(image);
      });

      updatedToolIcons.forEach((toolIcon) => {
        notifyToolIconMoved(toolIcon);
      });
    },
    [
      abilitiesSettings,
      agentsSettings,
      getLatestEntities,
      notifyAbilityMoved,
      notifyAbilityRemoved,
      notifyAgentMoved,
      notifyImageMoved,
      notifyTextUpdated,
      notifyToolIconMoved,
      setAbilitiesOnCanvas,
      setAgentsOnCanvas,
      setImagesOnCanvas,
      setTextsOnCanvas,
      setToolIconsOnCanvas,
    ],
  );

  return { deleteItems, moveItems };
};
