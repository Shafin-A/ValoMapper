import { Vector2d } from "konva/lib/types";
import Konva from "konva";
import { WEAPONS } from "@/lib/consts";
import { AgentCanvas, IconSettings, ToolIconCanvas } from "@/lib/types";

const GUN_TOOL_ICON_NAMES = new Set(
  Object.values(WEAPONS).flatMap((weaponGroup) =>
    weaponGroup.map((weapon) => weapon.name),
  ),
);

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

export const isGunToolIcon = (name: string) => {
  return GUN_TOOL_ICON_NAMES.has(name);
};

export const isShieldToolIcon = (name: string) => {
  return name.endsWith("_shield");
};

export const canAttachToolIcon = (toolIcon: ToolIconCanvas) => {
  return isGunToolIcon(toolIcon.name) || isShieldToolIcon(toolIcon.name);
};

export const getAttachedToolIconIds = (
  toolIconsOnCanvas: ToolIconCanvas[],
  hostId: string,
) => {
  return toolIconsOnCanvas
    .filter((toolIcon) => toolIcon.attachedToId === hostId)
    .map((toolIcon) => toolIcon.id);
};

export const findToolIconAttachmentTarget = ({
  point,
  agentsOnCanvas,
  agentsSettings,
  excludeId,
}: {
  point: Vector2d;
  agentsOnCanvas: AgentCanvas[];
  agentsSettings: IconSettings;
  excludeId?: string;
}): AgentCanvas | null => {
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
      return agent;
    }
  }

  return null;
};

export const getToolIconAttachmentPosition = (
  toolIcon: ToolIconCanvas,
  hostX: number,
  hostY: number,
  agentsSettings: IconSettings,
) => {
  const agentHalfSize = agentsSettings.scale / 2;
  const CORNER_PADDING = 8;

  if (isGunToolIcon(toolIcon.name)) {
    return {
      x: hostX - agentHalfSize - CORNER_PADDING,
      y: hostY + agentHalfSize + CORNER_PADDING,
    };
  }

  if (isShieldToolIcon(toolIcon.name)) {
    return {
      x: hostX + agentHalfSize + CORNER_PADDING,
      y: hostY - agentHalfSize - CORNER_PADDING,
    };
  }

  return { x: toolIcon.x, y: toolIcon.y };
};

export const syncAttachedToolIconNodePositions = ({
  hostId,
  hostNode,
  toolIconsOnCanvas,
  agentsSettings,
  getRegisteredNode,
}: {
  hostId: string;
  hostNode: Konva.Node;
  toolIconsOnCanvas: ToolIconCanvas[];
  agentsSettings: IconSettings;
  getRegisteredNode: (id: string) => Konva.Node | undefined;
}) => {
  const hostPosition = { x: hostNode.x(), y: hostNode.y() };

  toolIconsOnCanvas
    .filter((toolIcon) => toolIcon.attachedToId === hostId)
    .forEach((toolIcon) => {
      const node = getRegisteredNode(toolIcon.id);
      if (!node) {
        return;
      }

      const nextPosition = getToolIconAttachmentPosition(
        toolIcon,
        hostPosition.x,
        hostPosition.y,
        agentsSettings,
      );

      node.position(nextPosition);
      node.getLayer()?.batchDraw();
    });
};
