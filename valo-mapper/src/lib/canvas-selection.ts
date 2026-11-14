import {
  findAbilityDefinitionByAction,
  getAbilityVariants,
} from "@/lib/consts/configs/agent-icon/consts";
import { ARC_ABILITY_CONFIGS, CIRCLE_ABILITY_CONFIGS } from "@/lib/consts";
import {
  TEXT_MIN_HEIGHT,
  layoutRichText,
  resolveTextFontSize,
  textSpansForItem,
} from "@/lib/rich-text";
import type {
  AbilityCanvas,
  AgentCanvas,
  CanvasItemInstance,
  CanvasSelectionItem,
  IconSettings,
  ImageCanvas,
  ItemType,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import { isArcAbility, isCircleAbility } from "@/lib/utils";
import {
  getAttachedVisionConeIds,
  isVisionConeAction,
} from "@/lib/vision-cone-utils";
import Konva from "konva";
import type { Stage } from "konva/lib/Stage";

export type CanvasRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasItemCollections = {
  agentsOnCanvas: AgentCanvas[];
  abilitiesOnCanvas: AbilityCanvas[];
  textsOnCanvas: TextCanvas[];
  imagesOnCanvas: ImageCanvas[];
  toolIconsOnCanvas: ToolIconCanvas[];
};

export type ContextMenuCapabilities = {
  canDuplicate: boolean;
  canDelete: boolean;
  canToggleAlly: boolean;
  canToggleAgentDead: boolean;
  canSwapAbility: boolean;
  canToggleAbilityIconOnly: boolean;
  canToggleAbilityOuterCircle: boolean;
  canRemoveAttachedVisionCone: boolean;
  canDetachVisionCone: boolean;
  canEditNote: boolean;
  hasNote: boolean;
};

export const normalizeRect = (
  start: { x: number; y: number },
  end: { x: number; y: number },
): CanvasRect => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
});

export const isRectFullyInside = (
  inner: CanvasRect,
  outer: CanvasRect,
  epsilon = 0.5,
): boolean =>
  inner.x >= outer.x - epsilon &&
  inner.y >= outer.y - epsilon &&
  inner.x + inner.width <= outer.x + outer.width + epsilon &&
  inner.y + inner.height <= outer.y + outer.height + epsilon;

export const getSelectableCanvasItems = ({
  agentsOnCanvas,
  abilitiesOnCanvas,
  textsOnCanvas,
  imagesOnCanvas,
  toolIconsOnCanvas,
}: CanvasItemCollections): CanvasSelectionItem[] => [
  ...agentsOnCanvas.map((agent) => ({ id: agent.id, type: "agent" as const })),
  ...abilitiesOnCanvas
    .filter(
      (ability) =>
        !(isVisionConeAction(ability.action) && ability.attachedToId),
    )
    .map((ability) => ({ id: ability.id, type: "ability" as const })),
  ...textsOnCanvas.map((text) => ({ id: text.id, type: "text" as const })),
  ...imagesOnCanvas.map((image) => ({ id: image.id, type: "image" as const })),
  ...toolIconsOnCanvas
    .filter((toolIcon) => !toolIcon.attachedToId)
    .map((toolIcon) => ({ id: toolIcon.id, type: "tool" as const })),
];

export const getCanvasItemTypeById = (
  id: string,
  collections: CanvasItemCollections,
): ItemType | null => {
  if (collections.agentsOnCanvas.some((item) => item.id === id)) return "agent";
  if (collections.abilitiesOnCanvas.some((item) => item.id === id))
    return "ability";
  if (collections.textsOnCanvas.some((item) => item.id === id)) return "text";
  if (collections.imagesOnCanvas.some((item) => item.id === id)) return "image";
  if (collections.toolIconsOnCanvas.some((item) => item.id === id))
    return "tool";
  return null;
};

export const resolveCanvasItemTarget = (
  target: Konva.Node | null,
  collections: CanvasItemCollections,
): CanvasSelectionItem | null => {
  if (!target) return null;

  let targetNode: Konva.Node | null = target;

  while (targetNode) {
    const noteTargetId = targetNode.getAttr?.("noteTargetId");
    const noteTargetType = targetNode.getAttr?.("noteTargetType");

    if (
      typeof noteTargetId === "string" &&
      typeof noteTargetType === "string"
    ) {
      return { id: noteTargetId, type: noteTargetType as ItemType };
    }

    const id =
      typeof targetNode.id === "function" ? targetNode.id() : "";
    if (id) {
      const type = getCanvasItemTypeById(id, collections);
      return type ? { id, type } : null;
    }

    targetNode =
      typeof targetNode.getParent === "function"
        ? targetNode.getParent()
        : ((targetNode as unknown as { parent?: Konva.Node | null }).parent ??
          null);
  }

  return null;
};

export const getCanvasItemInstance = (
  collections: CanvasItemCollections,
  selection: CanvasSelectionItem,
): CanvasItemInstance | null => {
  switch (selection.type) {
    case "agent": {
      const item = collections.agentsOnCanvas.find(
        (agent) => agent.id === selection.id,
      );
      return item ? { type: "agent", item } : null;
    }
    case "ability": {
      const item = collections.abilitiesOnCanvas.find(
        (ability) => ability.id === selection.id,
      );
      return item ? { type: "ability", item } : null;
    }
    case "text": {
      const item = collections.textsOnCanvas.find(
        (text) => text.id === selection.id,
      );
      return item ? { type: "text", item } : null;
    }
    case "image": {
      const item = collections.imagesOnCanvas.find(
        (image) => image.id === selection.id,
      );
      return item ? { type: "image", item } : null;
    }
    case "tool": {
      const item = collections.toolIconsOnCanvas.find(
        (toolIcon) => toolIcon.id === selection.id,
      );
      return item ? { type: "tool", item } : null;
    }
  }
};

export const filterExistingSelection = (
  collections: CanvasItemCollections,
  selection: CanvasSelectionItem[],
): CanvasSelectionItem[] =>
  selection.filter((entry) => getCanvasItemInstance(collections, entry) !== null);

export const findCanvasItemInstanceById = (
  collections: CanvasItemCollections,
  id: string,
): CanvasItemInstance | null => {
  const type = getCanvasItemTypeById(id, collections);

  return type ? getCanvasItemInstance(collections, { id, type }) : null;
};

const getTextWorldRect = (text: TextCanvas): CanvasRect => {
  const fontSize = resolveTextFontSize(text.fontSize);
  const layout = layoutRichText(textSpansForItem(text), {
    width: text.width,
    fontSize,
  });

  return {
    x: text.x,
    y: text.y,
    width: text.width,
    height: Math.max(TEXT_MIN_HEIGHT, layout.height),
  };
};

export const getCanvasItemWorldRect = (
  stage: Stage | null,
  selection: CanvasSelectionItem,
  collections: CanvasItemCollections,
  settings: { agentsSettings: IconSettings; abilitiesSettings: IconSettings },
  getRegisteredNode?: (id: string) => Konva.Node | undefined,
): CanvasRect | null => {
  const entry = getCanvasItemInstance(collections, selection);
  if (!entry) return null;

  switch (entry.type) {
    case "agent": {
      const size = settings.agentsSettings.scale;
      return {
        x: entry.item.x - size / 2,
        y: entry.item.y - size / 2,
        width: size,
        height: size,
      };
    }
    case "tool":
      return {
        x: entry.item.x - entry.item.width / 2,
        y: entry.item.y - entry.item.height / 2,
        width: entry.item.width,
        height: entry.item.height,
      };
    case "image":
      return {
        x: entry.item.x,
        y: entry.item.y,
        width: entry.item.width,
        height: entry.item.height,
      };
    case "text":
      return getTextWorldRect(entry.item);
    case "ability": {
      const node =
        getRegisteredNode?.(entry.item.id) ??
        stage?.findOne(`#${entry.item.id}`);
      if (!node) return null;

      return node.getClientRect({
        relativeTo: stage ?? undefined,
        skipShadow: true,
      });
    }
  }
};

const hasOuterCircleConfig = (ability: AbilityCanvas): boolean => {
  const action = ability.action;
  if (isCircleAbility(action)) {
    return Boolean(CIRCLE_ABILITY_CONFIGS[action]?.activeRadius);
  }
  if (isArcAbility(action)) {
    return Boolean(ARC_ABILITY_CONFIGS[action]?.outerCircleRadius);
  }
  return false;
};

const isVisionConeHost = (entry: CanvasItemInstance): boolean =>
  entry.type === "agent" ||
  entry.type === "tool" ||
  (entry.type === "ability" && !isVisionConeAction(entry.item.action));

export const getContextMenuCapabilities = (
  targets: CanvasItemInstance[],
  collections: CanvasItemCollections,
): ContextMenuCapabilities => {
  if (targets.length === 0) {
    return {
      canDuplicate: false,
      canDelete: false,
      canToggleAlly: false,
      canToggleAgentDead: false,
      canSwapAbility: false,
      canToggleAbilityIconOnly: false,
      canToggleAbilityOuterCircle: false,
      canRemoveAttachedVisionCone: false,
      canDetachVisionCone: false,
      canEditNote: false,
      hasNote: false,
    };
  }

  const singleTarget = targets.length === 1 ? targets[0] : null;
  const canEditNote =
    singleTarget !== null &&
    !(
      singleTarget.type === "ability" &&
      isVisionConeAction(singleTarget.item.action) &&
      Boolean(singleTarget.item.attachedToId)
    );
  const hasNote = canEditNote && Boolean(singleTarget?.item.note?.trim());

  const allAgentsOrAbilities = targets.every(
    (entry) => entry.type === "agent" || entry.type === "ability",
  );
  const allyValues = targets
    .filter(
      (entry): entry is Extract<CanvasItemInstance, { type: "agent" | "ability" }> =>
        entry.type === "agent" || entry.type === "ability",
    )
    .map((entry) => entry.item.isAlly);
  const canToggleAlly =
    allAgentsOrAbilities &&
    allyValues.length > 0 &&
    allyValues.every((isAlly) => isAlly === allyValues[0]);

  const allAgents = targets.every((entry) => entry.type === "agent");
  const grayValues = targets
    .filter(
      (entry): entry is Extract<CanvasItemInstance, { type: "agent" }> =>
        entry.type === "agent",
    )
    .map((entry) => Boolean(entry.item.isGray));
  const canToggleAgentDead =
    allAgents &&
    grayValues.length > 0 &&
    grayValues.every((isGray) => isGray === grayValues[0]);

  const allAbilities = targets.every((entry) => entry.type === "ability");
  const abilityTargets = targets.filter(
    (entry): entry is Extract<CanvasItemInstance, { type: "ability" }> =>
      entry.type === "ability",
  );

  const canSwapAbility =
    allAbilities &&
    abilityTargets.every((entry) => {
      const definition = findAbilityDefinitionByAction(entry.item.action);
      return definition ? getAbilityVariants(definition).length > 1 : false;
    });

  const iconOnlyValues = abilityTargets.map((entry) =>
    Boolean(entry.item.iconOnly),
  );
  const canToggleAbilityIconOnly =
    allAbilities &&
    abilityTargets.every((entry) => entry.item.action !== "icon") &&
    iconOnlyValues.every((value) => value === iconOnlyValues[0]);

  const showOuterCircleValues = abilityTargets.map(
    (entry) => entry.item.showOuterCircle !== false,
  );
  const canToggleAbilityOuterCircle =
    allAbilities &&
    abilityTargets.every((entry) => hasOuterCircleConfig(entry.item)) &&
    showOuterCircleValues.every(
      (value) => value === showOuterCircleValues[0],
    );

  const canRemoveAttachedVisionCone =
    targets.every((entry) => isVisionConeHost(entry)) &&
    targets.every((entry) =>
      getAttachedVisionConeIds(
        collections.abilitiesOnCanvas,
        entry.item.id,
      ).length > 0,
    );

  const canDetachVisionCone =
    allAbilities &&
    abilityTargets.every(
      (entry) =>
        isVisionConeAction(entry.item.action) &&
        Boolean(entry.item.attachedToId),
    );

  return {
    canDuplicate: true,
    canDelete: true,
    canToggleAlly,
    canToggleAgentDead,
    canSwapAbility,
    canToggleAbilityIconOnly,
    canToggleAbilityOuterCircle,
    canRemoveAttachedVisionCone,
    canDetachVisionCone,
    canEditNote,
    hasNote,
  };
};
