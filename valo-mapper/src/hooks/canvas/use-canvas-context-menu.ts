import { CONTEXT_MENU_DUPLICATE_OFFSET } from "@/lib/consts";
import type { CanvasEntitiesSnapshot } from "@/contexts/canvas-entity-contexts";
import {
  AbilityCanvas,
  AgentCanvas,
  BaseCanvasItem,
  CanvasSelectionItem,
  ConnectingLine,
  ImageCanvas,
  ItemType,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import {
  type CanvasItemCollections,
  filterExistingSelection,
  getCanvasItemInstance,
  getCanvasItemTypeById,
  getContextMenuCapabilities,
  resolveCanvasItemTarget,
} from "@/lib/canvas-selection";
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
import { type KonvaEventObject, type Node as KonvaNode } from "konva/lib/Node";
import { Stage } from "konva/lib/Stage";
import type { Vector2d } from "konva/lib/types";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

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

interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  targetItems: CanvasSelectionItem[];
  anchorId: string;
  anchorType: ItemType;
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
  selectedCanvasItems: CanvasSelectionItem[],
  setSelectedCanvasItems: Dispatch<SetStateAction<CanvasSelectionItem[]>>,
  getLatestEntities?: () => CanvasEntitiesSnapshot,
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

  const collections = useMemo<CanvasItemCollections>(
    () => ({
      agentsOnCanvas,
      abilitiesOnCanvas,
      textsOnCanvas,
      imagesOnCanvas,
      toolIconsOnCanvas,
    }),
    [
      agentsOnCanvas,
      abilitiesOnCanvas,
      textsOnCanvas,
      imagesOnCanvas,
      toolIconsOnCanvas,
    ],
  );

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    targetItems: [],
    anchorId: "",
    anchorType: "agent",
  });

  const capabilities = useMemo(() => {
    const targets = contextMenu.targetItems
      .map((selection) => getCanvasItemInstance(collections, selection))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return getContextMenuCapabilities(targets, collections);
  }, [collections, contextMenu.targetItems]);

  const getEntities = useCallback(
    () => {
      const latest = getLatestEntities?.();

      return {
        agentsOnCanvas: latest?.agentsOnCanvas ?? agentsOnCanvas,
        abilitiesOnCanvas: latest?.abilitiesOnCanvas ?? abilitiesOnCanvas,
        textsOnCanvas: latest?.textsOnCanvas ?? textsOnCanvas,
        imagesOnCanvas: latest?.imagesOnCanvas ?? imagesOnCanvas,
        toolIconsOnCanvas: latest?.toolIconsOnCanvas ?? toolIconsOnCanvas,
        connectingLines: latest?.connectingLines ?? connectingLines,
      };
    },
    [
      getLatestEntities,
      agentsOnCanvas,
      abilitiesOnCanvas,
      textsOnCanvas,
      imagesOnCanvas,
      toolIconsOnCanvas,
      connectingLines,
    ],
  );

  const getCollections = useCallback((): CanvasItemCollections => {
    const entities = getEntities();

    return {
      agentsOnCanvas: entities.agentsOnCanvas,
      abilitiesOnCanvas: entities.abilitiesOnCanvas,
      textsOnCanvas: entities.textsOnCanvas,
      imagesOnCanvas: entities.imagesOnCanvas,
      toolIconsOnCanvas: entities.toolIconsOnCanvas,
    };
  }, [getEntities]);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, []);

  const openContextMenu = useCallback(
    (targetNode: KonvaNode | null, pointerPosition: Vector2d | null) => {
      const stage = stageRef.current;
      if (!stage) return;

      const collections = getCollections();
      const resolvedTarget = resolveCanvasItemTarget(targetNode, collections);

      if (!resolvedTarget) {
        setSelectedCanvasItems([]);
        setContextMenu((previous) => ({ ...previous, open: false }));
        return;
      }

      const pointer = pointerPosition ?? stage.getPointerPosition();
      if (!pointer) return;

      const isAlreadySelected = selectedCanvasItems.some(
        (selection) =>
          selection.id === resolvedTarget.id &&
          selection.type === resolvedTarget.type,
      );

      const targetItems = isAlreadySelected
        ? filterExistingSelection(collections, selectedCanvasItems)
        : [resolvedTarget];

      if (targetItems.length === 0) {
        targetItems.push(resolvedTarget);
      }

      if (!isAlreadySelected) {
        setSelectedCanvasItems([resolvedTarget]);
      }

      const containerRect = stage.container().getBoundingClientRect();

      setContextMenu({
        open: true,
        x: containerRect.left + pointer.x,
        y: containerRect.top + pointer.y,
        targetItems,
        anchorId: resolvedTarget.id,
        anchorType: resolvedTarget.type,
      });
    },
    [
      getCollections,
      selectedCanvasItems,
      setSelectedCanvasItems,
      stageRef,
    ],
  );

  const handleContextMenu = useCallback(
    (e: KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      openContextMenu(
        e.target as unknown as KonvaNode,
        stageRef.current?.getPointerPosition() ?? null,
      );
      e.cancelBubble = true;
    },
    [openContextMenu, stageRef],
  );

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setContextMenu((prev) => ({ ...prev, open }));
  }, []);

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

  const getAnchorEntry = useCallback(() => {
    return getCanvasItemInstance(getCollections(), {
      id: contextMenu.anchorId,
      type: contextMenu.anchorType,
    });
  }, [getCollections, contextMenu.anchorId, contextMenu.anchorType]);

  const handleToggleAlly = useCallback(() => {
    if (!contextMenu.open) return;

    const { agentsOnCanvas, abilitiesOnCanvas } = getEntities();
    const anchor = getAnchorEntry();
    if (
      !anchor ||
      (anchor.type !== "agent" && anchor.type !== "ability")
    ) {
      return;
    }

    const nextIsAlly = !anchor.item.isAlly;
    const agentIds = new Set(
      contextMenu.targetItems
        .filter((target) => target.type === "agent")
        .map((target) => target.id),
    );
    const abilityIds = new Set(
      contextMenu.targetItems
        .filter((target) => target.type === "ability")
        .map((target) => target.id),
    );

    if (agentIds.size > 0) {
      const updatedAgents = agentsOnCanvas
        .filter((agent) => agentIds.has(agent.id))
        .map((agent) => ({ ...agent, isAlly: nextIsAlly }));

      setAgentsOnCanvas((previous) =>
        previous.map((agent) =>
          agentIds.has(agent.id)
            ? { ...agent, isAlly: nextIsAlly }
            : agent,
        ),
      );
      updatedAgents.forEach(notifyAgentMoved);
    }

    if (abilityIds.size > 0) {
      const updatedAbilities = abilitiesOnCanvas
        .filter((ability) => abilityIds.has(ability.id))
        .map((ability) => ({ ...ability, isAlly: nextIsAlly }));

      setAbilitiesOnCanvas((previous) =>
        previous.map((ability) =>
          abilityIds.has(ability.id)
            ? { ...ability, isAlly: nextIsAlly }
            : ability,
        ),
      );
      updatedAbilities.forEach(notifyAbilityMoved);
    }

    closeContextMenu();
  }, [
    closeContextMenu,
    contextMenu,
    getAnchorEntry,
    getEntities,
    notifyAbilityMoved,
    notifyAgentMoved,
    setAbilitiesOnCanvas,
    setAgentsOnCanvas,
  ]);

  const handleToggleAgentDead = useCallback(() => {
    if (!contextMenu.open) return;

    const { agentsOnCanvas } = getEntities();
    const anchor = getAnchorEntry();
    if (!anchor || anchor.type !== "agent") return;

    const nextIsGray = !anchor.item.isGray;
    const agentIds = new Set(
      contextMenu.targetItems
        .filter((target) => target.type === "agent")
        .map((target) => target.id),
    );

    const updatedAgents = agentsOnCanvas
      .filter((agent) => agentIds.has(agent.id))
      .map((agent) => ({ ...agent, isGray: nextIsGray }));

    setAgentsOnCanvas((previous) =>
      previous.map((agent) =>
        agentIds.has(agent.id) ? { ...agent, isGray: nextIsGray } : agent,
      ),
    );
    updatedAgents.forEach(notifyAgentMoved);
    closeContextMenu();
  }, [
    closeContextMenu,
    contextMenu,
    getAnchorEntry,
    getEntities,
    notifyAgentMoved,
    setAgentsOnCanvas,
  ]);

  const handleSwapAbility = useCallback(() => {
    if (!contextMenu.open) return;

    const { abilitiesOnCanvas } = getEntities();
    const updates = new Map<string, AbilityCanvas>();

    contextMenu.targetItems
      .filter((target) => target.type === "ability")
      .forEach((target) => {
        const ability = abilitiesOnCanvas.find(
          (item) => item.id === target.id,
        );
        if (!ability) return;

        const definition = findAbilityDefinitionByAction(ability.action);
        if (!definition) return;

        const variants = getAbilityVariants(definition);
        if (variants.length < 2) return;

        const currentIndex = variants.findIndex(
          (variant) => variant.action === ability.action,
        );
        const nextVariant = variants[(currentIndex + 1) % variants.length];

        updates.set(ability.id, {
          ...ability,
          action: nextVariant.action,
          name: nextVariant.name,
        });
      });

    if (updates.size === 0) {
      closeContextMenu();
      return;
    }

    setAbilitiesOnCanvas((previous) =>
      previous.map((ability) => updates.get(ability.id) ?? ability),
    );
    updates.forEach((ability) => notifyAbilityMoved(ability));
    closeContextMenu();
  }, [
    closeContextMenu,
    contextMenu,
    getEntities,
    notifyAbilityMoved,
    setAbilitiesOnCanvas,
  ]);

  const handleToggleAbilityIconOnly = useCallback(() => {
    if (!contextMenu.open) return;

    const { abilitiesOnCanvas } = getEntities();
    const anchor = getAnchorEntry();
    if (!anchor || anchor.type !== "ability" || anchor.item.action === "icon") {
      return;
    }

    const nextIconOnly = !anchor.item.iconOnly;
    const abilityIds = new Set(
      contextMenu.targetItems
        .filter((target) => target.type === "ability")
        .map((target) => target.id),
    );
    const updates = new Map<string, AbilityCanvas>();

    abilitiesOnCanvas
      .filter((ability) => abilityIds.has(ability.id))
      .forEach((ability) => {
        if (ability.action === "icon") return;

        const updated: AbilityCanvas = {
          ...ability,
          iconOnly: nextIconOnly,
        };

        if (
          isVisionConeAction(ability.action) &&
          !canAttachVisionCone(updated)
        ) {
          updated.attachedToId = undefined;
        }

        updates.set(updated.id, updated);
      });

    setAbilitiesOnCanvas((previous) =>
      previous.map((ability) => updates.get(ability.id) ?? ability),
    );
    updates.forEach((ability) => notifyAbilityMoved(ability));
    closeContextMenu();
  }, [
    closeContextMenu,
    contextMenu,
    getAnchorEntry,
    getEntities,
    notifyAbilityMoved,
    setAbilitiesOnCanvas,
  ]);

  const handleToggleAbilityOuterCircle = useCallback(() => {
    if (!contextMenu.open) return;

    const { abilitiesOnCanvas } = getEntities();
    const anchor = getAnchorEntry();
    if (!anchor || anchor.type !== "ability") return;

    const nextShowOuterCircle = anchor.item.showOuterCircle === false;
    const abilityIds = new Set(
      contextMenu.targetItems
        .filter((target) => target.type === "ability")
        .map((target) => target.id),
    );

    const updates = abilitiesOnCanvas
      .filter((ability) => abilityIds.has(ability.id))
      .map((ability) => ({
        ...ability,
        showOuterCircle: nextShowOuterCircle,
      }));

    setAbilitiesOnCanvas((previous) =>
      previous.map(
        (ability) =>
          updates.find((updated) => updated.id === ability.id) ?? ability,
      ),
    );
    updates.forEach((ability) => notifyAbilityMoved(ability));
    closeContextMenu();
  }, [
    closeContextMenu,
    contextMenu,
    getAnchorEntry,
    getEntities,
    notifyAbilityMoved,
    setAbilitiesOnCanvas,
  ]);

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

  const contextMenuWithCapabilities = useMemo(
    () => ({
      ...contextMenu,
      capabilities,
    }),
    [contextMenu, capabilities],
  );

  return {
    contextMenu: contextMenuWithCapabilities,
    openContextMenu,
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
