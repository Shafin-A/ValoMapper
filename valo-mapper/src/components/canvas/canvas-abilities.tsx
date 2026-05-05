import { AbilityIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { TEMP_DRAG_ID } from "@/lib/consts";
import { ABILITY_LOOKUP } from "@/lib/consts/configs/agent-icon/consts";
import {
  applyVisionConeAttachment,
  findVisionConeAttachmentHost,
  findVisionConeAttachmentTarget,
  getAttachedVisionConeIds,
  isAttachedVisionCone,
  isVisionConeAction,
  syncAttachedVisionConeNodePositions,
} from "@/lib/vision-cone-utils";
import { handleDragEnd, handleDragMove } from "@/lib/utils";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group } from "react-konva";

interface CanvasAbilityProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
}

export const CanvasAbilities = ({ deleteGroupRef }: CanvasAbilityProps) => {
  const {
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    agentsOnCanvas,
    setAgentsOnCanvas,
    toolIconsOnCanvas,
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

  const { agentsSettings, abilitiesSettings } = useSettings();
  const { notifyAbilityMoved, notifyAbilityRemoved, notifyAgentRemoved } =
    useCollaborativeCanvas();

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

  const removeAgentWithAttachedVisionCones = (agentId: string) => {
    if (!agentsOnCanvas.some((agent) => agent.id === agentId)) {
      return;
    }

    setAgentsOnCanvas((prev) => prev.filter((agent) => agent.id !== agentId));
    notifyAgentRemoved(agentId);
    removeAttachedVisionCones(agentId);
  };

  const handleVisionConeDragEnd = (
    e: KonvaEventObject<DragEvent>,
    ability: (typeof abilitiesOnCanvas)[number],
  ) => {
    const node = e.target;
    const isOverDeleteGroup = node.getAttr("isOverDeleteGroup") as boolean;

    if (deleteGroupRef.current) {
      deleteGroupRef.current.opacity(0.5);
    }

    node.getStage()?.container().style.setProperty("cursor", "default");
    node.setAttr("isOverDeleteGroup", false);

    if (isOverDeleteGroup) {
      const connectedLine = connectingLines.find(
        (line) => line.fromId === ability.id || line.toId === ability.id,
      );

      if (connectedLine) {
        const connectedId =
          connectedLine.fromId === ability.id
            ? connectedLine.toId
            : connectedLine.fromId;

        removeAgentWithAttachedVisionCones(connectedId);
        setConnectingLines((prev) =>
          prev.filter((line) => line.id !== connectedLine.id),
        );
      }

      removeAbilityWithAttachedVisionCones(ability.id);
      return;
    }

    const nextPoint = { x: node.x(), y: node.y() };
    const attachmentTarget = findVisionConeAttachmentTarget({
      point: nextPoint,
      agentsOnCanvas,
      abilitiesOnCanvas,
      toolIconsOnCanvas,
      agentsSettings,
      abilitiesSettings,
      excludeId: ability.id,
    });

    const updatedAbility = {
      ...ability,
      x: attachmentTarget?.x ?? nextPoint.x,
      y: attachmentTarget?.y ?? nextPoint.y,
      attachedToId: attachmentTarget?.id,
    };

    const { nextAbilitiesOnCanvas, removedAbilityIds } =
      applyVisionConeAttachment({
        abilitiesOnCanvas,
        previousAbilityId: ability.id,
        nextAbility: updatedAbility,
      });

    setAbilitiesOnCanvas(nextAbilitiesOnCanvas);
    removedAbilityIds.forEach((abilityId) => notifyAbilityRemoved(abilityId));
    notifyAbilityMoved(updatedAbility);
  };

  const orderedAbilities = [...abilitiesOnCanvas].sort((left, right) => {
    const leftAttached = isAttachedVisionCone(left);
    const rightAttached = isAttachedVisionCone(right);

    if (leftAttached === rightAttached) {
      return 0;
    }

    return leftAttached ? -1 : 1;
  });

  return orderedAbilities.map((ability) => {
    if (isSidebarDragActive && ability.id === TEMP_DRAG_ID) {
      return null;
    }

    const attachmentHost = findVisionConeAttachmentHost({
      attachedToId: ability.attachedToId,
      agentsOnCanvas,
      abilitiesOnCanvas,
      toolIconsOnCanvas,
      excludeId: ability.id,
    });
    const isAttached =
      isVisionConeAction(ability.action) && attachmentHost !== null;

    const lookupEntry = ABILITY_LOOKUP[ability.name];
    if (!lookupEntry) {
      console.warn(
        `[Canvas] ABILITY_LOOKUP missing entry for "${ability.name}", available keys:`,
        Object.keys(ABILITY_LOOKUP),
      );
    }

    return (
      <Group
        key={ability.id}
        onMouseEnter={() =>
          !selectedCanvasIcon &&
          !editingTextId &&
          setHoveredElementId(ability.id)
        }
        onMouseLeave={() =>
          !selectedCanvasIcon && !editingTextId && setHoveredElementId(null)
        }
      >
        <AbilityIcon
          id={ability.id}
          isAlly={ability.isAlly}
          action={ability.action}
          x={attachmentHost?.x ?? ability.x}
          y={attachmentHost?.y ?? ability.y}
          rotation={ability.currentRotation}
          src={lookupEntry?.src}
          draggable={!isDrawMode && !editingTextId && !isAttached}
          isListening={!isDrawMode && !editingTextId}
          onDragMove={(e) => {
            handleDragMove(e, deleteGroupRef);
            syncAttachedVisionConeNodePositions({
              hostId: ability.id,
              hostNode: e.target,
              abilitiesOnCanvas,
              getRegisteredNode,
            });
          }}
          onDragEnd={(e) => {
            if (isVisionConeAction(ability.action)) {
              handleVisionConeDragEnd(e, ability);
              return;
            }

            handleDragEnd(
              e,
              ability,
              setAbilitiesOnCanvas,
              deleteGroupRef,
              connectingLines,
              setConnectingLines,
              (connectedId) => removeAgentWithAttachedVisionCones(connectedId),
              notifyAbilityRemoved,
              notifyAbilityMoved,
              () => removeAttachedVisionCones(ability.id),
            );
          }}
          width={abilitiesSettings.scale}
          height={abilitiesSettings.scale}
          borderOpacity={abilitiesSettings.borderOpacity}
          strokeWidth={abilitiesSettings.borderWidth}
          radius={abilitiesSettings.radius}
          allyColor={abilitiesSettings.allyColor}
          enemyColor={abilitiesSettings.enemyColor}
          currentPath={ability.currentPath}
          currentLength={ability.currentLength}
          iconOnly={ability.iconOnly}
          showOuterCircle={ability.showOuterCircle}
          showCenterIcon={!isAttached}
          registerNode={registerNode}
          unregisterNode={unregisterNode}
          onInteractionEnd={(data) => {
            notifyAbilityMoved({ ...ability, ...data });
          }}
        />
      </Group>
    );
  });
};
