import {
  AbilityAction,
  AbilityCanvas,
  AgentCanvas,
  IconSettings,
  ToolIconCanvas,
} from "@/lib/types";
import Konva from "konva";
import { Vector2d } from "konva/lib/types";

export type VisionConeAction = Extract<
  AbilityAction,
  "vision_cone_30" | "vision_cone_60" | "vision_cone_90"
>;

type VisionConeAttachmentTarget = {
  id: string;
  x: number;
  y: number;
};

type FindVisionConeAttachmentHostOptions = {
  attachedToId?: string;
  agentsOnCanvas: AgentCanvas[];
  abilitiesOnCanvas: AbilityCanvas[];
  toolIconsOnCanvas: ToolIconCanvas[];
  excludeId?: string;
};

type FindVisionConeAttachmentTargetOptions = {
  point: Vector2d;
  agentsOnCanvas: AgentCanvas[];
  abilitiesOnCanvas: AbilityCanvas[];
  toolIconsOnCanvas: ToolIconCanvas[];
  agentsSettings: IconSettings;
  abilitiesSettings: IconSettings;
  excludeId?: string;
};

type SyncAttachedVisionConeNodePositionsOptions = {
  hostId: string;
  hostNode: Konva.Node;
  abilitiesOnCanvas: AbilityCanvas[];
  getRegisteredNode: (id: string) => Konva.Node | undefined;
};

type ApplyVisionConeAttachmentOptions = {
  abilitiesOnCanvas: AbilityCanvas[];
  previousAbilityId: string;
  nextAbility: AbilityCanvas;
};

const isPointInsideCenteredBox = (
  point: Vector2d,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return (
    point.x >= centerX - halfWidth &&
    point.x <= centerX + halfWidth &&
    point.y >= centerY - halfHeight &&
    point.y <= centerY + halfHeight
  );
};

export const isVisionConeAction = (
  action: AbilityAction,
): action is VisionConeAction => {
  return (
    action === "vision_cone_30" ||
    action === "vision_cone_60" ||
    action === "vision_cone_90"
  );
};

export const isAttachedVisionCone = (ability: AbilityCanvas) => {
  return isVisionConeAction(ability.action) && Boolean(ability.attachedToId);
};

export const findVisionConeAttachmentHost = ({
  attachedToId,
  agentsOnCanvas,
  abilitiesOnCanvas,
  toolIconsOnCanvas,
  excludeId,
}: FindVisionConeAttachmentHostOptions): VisionConeAttachmentTarget | null => {
  if (!attachedToId) {
    return null;
  }

  const toolIcon = toolIconsOnCanvas.find(
    (item) => item.id === attachedToId && item.id !== excludeId,
  );
  if (toolIcon) {
    return { id: toolIcon.id, x: toolIcon.x, y: toolIcon.y };
  }

  const agent = agentsOnCanvas.find(
    (item) => item.id === attachedToId && item.id !== excludeId,
  );
  if (agent) {
    return { id: agent.id, x: agent.x, y: agent.y };
  }

  const ability = abilitiesOnCanvas.find(
    (item) =>
      item.id === attachedToId &&
      item.id !== excludeId &&
      !isVisionConeAction(item.action),
  );
  if (ability) {
    return { id: ability.id, x: ability.x, y: ability.y };
  }

  return null;
};

export const getAttachedVisionConeIds = (
  abilitiesOnCanvas: AbilityCanvas[],
  hostId: string,
) => {
  return abilitiesOnCanvas
    .filter(
      (ability) =>
        isVisionConeAction(ability.action) && ability.attachedToId === hostId,
    )
    .map((ability) => ability.id);
};

export const syncAttachedVisionConeNodePositions = ({
  hostId,
  hostNode,
  abilitiesOnCanvas,
  getRegisteredNode,
}: SyncAttachedVisionConeNodePositionsOptions) => {
  const nextPosition = { x: hostNode.x(), y: hostNode.y() };

  getAttachedVisionConeIds(abilitiesOnCanvas, hostId).forEach((coneId) => {
    const coneNode = getRegisteredNode(coneId);
    if (!coneNode) {
      return;
    }

    coneNode.position(nextPosition);
    coneNode.getLayer()?.batchDraw();
  });
};

export const applyVisionConeAttachment = ({
  abilitiesOnCanvas,
  previousAbilityId,
  nextAbility,
}: ApplyVisionConeAttachmentOptions) => {
  const removedAbilityIds: string[] = [];
  let didReplaceExistingAbility = false;

  const nextAbilitiesOnCanvas = abilitiesOnCanvas.flatMap((ability) => {
    if (ability.id === previousAbilityId) {
      didReplaceExistingAbility = true;
      return [nextAbility];
    }

    if (
      isVisionConeAction(nextAbility.action) &&
      nextAbility.attachedToId &&
      isVisionConeAction(ability.action) &&
      ability.attachedToId === nextAbility.attachedToId
    ) {
      removedAbilityIds.push(ability.id);
      return [];
    }

    return [ability];
  });

  if (!didReplaceExistingAbility) {
    nextAbilitiesOnCanvas.push(nextAbility);
  }

  return {
    nextAbilitiesOnCanvas,
    removedAbilityIds,
  };
};

export const findVisionConeAttachmentTarget = ({
  point,
  agentsOnCanvas,
  abilitiesOnCanvas,
  toolIconsOnCanvas,
  agentsSettings,
  abilitiesSettings,
  excludeId,
}: FindVisionConeAttachmentTargetOptions): VisionConeAttachmentTarget | null => {
  const reversedToolIcons = [...toolIconsOnCanvas].reverse();
  for (const toolIcon of reversedToolIcons) {
    if (toolIcon.id === excludeId) continue;
    if (
      isPointInsideCenteredBox(
        point,
        toolIcon.x,
        toolIcon.y,
        toolIcon.width,
        toolIcon.height,
      )
    ) {
      return { id: toolIcon.id, x: toolIcon.x, y: toolIcon.y };
    }
  }

  const reversedAgents = [...agentsOnCanvas].reverse();
  for (const agent of reversedAgents) {
    if (agent.id === excludeId) continue;
    if (
      isPointInsideCenteredBox(
        point,
        agent.x,
        agent.y,
        agentsSettings.scale,
        agentsSettings.scale,
      )
    ) {
      return { id: agent.id, x: agent.x, y: agent.y };
    }
  }

  const reversedAbilities = [...abilitiesOnCanvas].reverse();
  for (const ability of reversedAbilities) {
    if (ability.id === excludeId || isVisionConeAction(ability.action))
      continue;
    if (
      isPointInsideCenteredBox(
        point,
        ability.x,
        ability.y,
        abilitiesSettings.scale,
        abilitiesSettings.scale,
      )
    ) {
      return { id: ability.id, x: ability.x, y: ability.y };
    }
  }

  return null;
};
