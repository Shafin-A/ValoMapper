import { CanvasIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { TEMP_DRAG_ID } from "@/lib/consts";
import {
  getAttachedVisionConeIds,
  syncAttachedVisionConeNodePositions,
} from "@/lib/vision-cone-utils";
import {
  getAttachedToolIconIds,
  getToolIconAttachmentPosition,
  syncAttachedToolIconNodePositions,
} from "@/lib/tool-icon";
import { getAgentImgSrc, handleDragEnd, handleDragMove } from "@/lib/utils";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group } from "react-konva";

interface CanvasAgentProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
}

export const CanvasAgents = ({ deleteGroupRef }: CanvasAgentProps) => {
  const {
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    toolIconsOnCanvas,
    setToolIconsOnCanvas,
    connectingLines,
    setConnectingLines,
    isDrawMode,
    registerNode,
    unregisterNode,
    getRegisteredNode,
    setHoveredElementId,
    selectedCanvasIcon,
    isSidebarDragActive,
    editingTextId,
  } = useCanvas();

  const { agentsSettings } = useSettings();
  const {
    notifyAgentMoved,
    notifyAgentRemoved,
    notifyAbilityRemoved,
    notifyToolIconMoved,
    notifyToolIconRemoved,
  } = useCollaborativeCanvas();

  const removeAttachedVisionCones = (hostId: string) => {
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
  };

  const removeAttachedToolIcons = (hostId: string) => {
    const removedToolIconIds = getAttachedToolIconIds(
      toolIconsOnCanvas,
      hostId,
    );
    if (removedToolIconIds.length === 0) {
      return;
    }

    const removedIds = new Set(removedToolIconIds);
    setToolIconsOnCanvas((prev) =>
      prev.filter((toolIcon) => !removedIds.has(toolIcon.id)),
    );
    removedToolIconIds.forEach((toolIconId) =>
      notifyToolIconRemoved(toolIconId),
    );
  };

  const removeAbilityWithAttachedVisionCones = (abilityId: string) => {
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
  };

  const handleAgentDragEnd = (
    e: KonvaEventObject<DragEvent>,
    agent: (typeof agentsOnCanvas)[number],
  ) => {
    handleDragEnd(
      e,
      agent,
      setAgentsOnCanvas,
      deleteGroupRef,
      connectingLines,
      setConnectingLines,
      (connectedId) => removeAbilityWithAttachedVisionCones(connectedId),
      notifyAgentRemoved,
      (movedAgent) => {
        const attachedToolIcons = toolIconsOnCanvas.filter(
          (toolIcon) => toolIcon.attachedToId === agent.id,
        );

        if (attachedToolIcons.length > 0) {
          const updatedToolIcons = attachedToolIcons.map((toolIcon) => ({
            ...toolIcon,
            ...getToolIconAttachmentPosition(
              toolIcon,
              movedAgent.x,
              movedAgent.y,
              agentsSettings,
            ),
          }));

          setToolIconsOnCanvas((prev) =>
            prev.map((toolIcon) => {
              const updated = updatedToolIcons.find(
                (updatedToolIcon) => updatedToolIcon.id === toolIcon.id,
              );
              return updated ?? toolIcon;
            }),
          );

          updatedToolIcons.forEach(notifyToolIconMoved);
        }

        notifyAgentMoved(movedAgent);
      },
      () => {
        removeAttachedVisionCones(agent.id);
        removeAttachedToolIcons(agent.id);
      },
    );
  };

  return agentsOnCanvas.map((agent) => {
    if (isSidebarDragActive && agent.id === TEMP_DRAG_ID) {
      return null;
    }

    return (
      <Group
        key={agent.id}
        onMouseEnter={() =>
          !selectedCanvasIcon && !editingTextId && setHoveredElementId(agent.id)
        }
        onMouseLeave={() =>
          !selectedCanvasIcon && !editingTextId && setHoveredElementId(null)
        }
      >
        <CanvasIcon
          id={agent.id}
          isAlly={agent.isAlly}
          x={agent.x}
          y={agent.y}
          src={getAgentImgSrc(agent.name)}
          isGray={agent.isGray}
          draggable={!isDrawMode && !editingTextId}
          isListening={!isDrawMode && !editingTextId}
          onDragMove={(e) => {
            handleDragMove(e, deleteGroupRef);
            syncAttachedVisionConeNodePositions({
              hostId: agent.id,
              hostNode: e.target,
              abilitiesOnCanvas,
              getRegisteredNode,
            });
            syncAttachedToolIconNodePositions({
              hostId: agent.id,
              hostNode: e.target,
              toolIconsOnCanvas,
              agentsSettings,
              getRegisteredNode,
            });
          }}
          onDragEnd={(e) => {
            handleAgentDragEnd(e, agent);
          }}
          width={agentsSettings.scale}
          height={agentsSettings.scale}
          borderOpacity={agentsSettings.borderOpacity}
          strokeWidth={agentsSettings.borderWidth}
          radius={agentsSettings.radius}
          allyColor={agentsSettings.allyColor}
          enemyColor={agentsSettings.enemyColor}
          registerNode={registerNode}
          unregisterNode={unregisterNode}
        />
      </Group>
    );
  });
};
