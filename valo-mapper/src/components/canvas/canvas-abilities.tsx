import { AbilityIcon } from "@/components/canvas-icons";
import {
  useCanvasActions,
  useCanvasEntities,
  useCanvasUi,
} from "@/contexts/canvas-context";
import { useSetHoveredElementId } from "@/contexts/hover-context";
import { useSettings } from "@/contexts/settings-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import type { SelectionDragController } from "@/hooks/canvas/use-canvas-selection-drag";
import { TEMP_DRAG_ID } from "@/lib/consts";
import { ABILITY_LOOKUP } from "@/lib/consts/configs/agent-icon/consts";
import {
  applyVisionConeAttachment,
  canAttachVisionCone,
  findVisionConeAttachmentHost,
  findVisionConeAttachmentTarget,
  getAttachedVisionConeIds,
  isAttachedVisionCone,
  isVisionConeAction,
  syncAttachedVisionConeNodePositions,
} from "@/lib/vision-cone-utils";
import { handleDragEnd, handleDragMove } from "@/lib/utils";
import { useCommitCount } from "@/lib/perf-beacon";
import type { AbilityCanvas, IconSettings } from "@/lib/types";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Vector2d } from "konva/lib/types";
import { memo, useCallback, useMemo, useRef } from "react";
import { Group } from "react-konva";

interface CanvasAbilityProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
  mapPosition: Vector2d;
  selectionDrag: SelectionDragController;
}

interface AbilityNodeProps {
  ability: AbilityCanvas;
  x: number;
  y: number;
  isAttached: boolean;
  src?: string;
  mapPosition: Vector2d;
  abilitiesSettings: IconSettings;
  isDrawMode: boolean;
  editingTextId: string | null;
  isHoverEnabled: boolean;
  registerNode: (id: string, node: Konva.Node) => void;
  unregisterNode: (id: string) => void;
  onHoverEnter: (id: string) => void;
  onHoverLeave: () => void;
  onDragMove: (
    event: KonvaEventObject<DragEvent>,
    ability: AbilityCanvas,
  ) => void;
  onDragEnd: (event: KonvaEventObject<DragEvent>, ability: AbilityCanvas) => void;
  onInteractionEnd: (ability: AbilityCanvas, data: object) => void;
}

const AbilityNode = memo(function AbilityNode({
  ability,
  x,
  y,
  isAttached,
  src,
  mapPosition,
  abilitiesSettings,
  isDrawMode,
  editingTextId,
  isHoverEnabled,
  registerNode,
  unregisterNode,
  onHoverEnter,
  onHoverLeave,
  onDragMove,
  onDragEnd,
  onInteractionEnd,
}: AbilityNodeProps) {
  return (
    <Group
      onMouseEnter={() => isHoverEnabled && onHoverEnter(ability.id)}
      onMouseLeave={() => isHoverEnabled && onHoverLeave()}
    >
      <AbilityIcon
        id={ability.id}
        isAlly={ability.isAlly}
        action={ability.action}
        mapPosition={mapPosition}
        x={x}
        y={y}
        rotation={ability.currentRotation}
        src={src ?? ""}
        draggable={!isDrawMode && !editingTextId && !isAttached}
        isListening={!isDrawMode && !editingTextId}
        onDragMove={(event) => onDragMove(event, ability)}
        onDragEnd={(event) => onDragEnd(event, ability)}
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
        onInteractionEnd={(data) => onInteractionEnd(ability, data)}
      />
    </Group>
  );
});

export const CanvasAbilities = memo(function CanvasAbilities({
  deleteGroupRef,
  mapPosition,
  selectionDrag,
}: CanvasAbilityProps) {
  useCommitCount("CanvasAbilities");

  const {
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    agentsOnCanvas,
    setAgentsOnCanvas,
    toolIconsOnCanvas,
    connectingLines,
    setConnectingLines,
  } = useCanvasEntities();

  const { isDrawMode, selectedCanvasIcon, isSidebarDragActive, editingTextId } =
    useCanvasUi();

  const { registerNode, unregisterNode, getRegisteredNode } =
    useCanvasActions();

  const setHoveredElementId = useSetHoveredElementId();

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
    ability: AbilityCanvas,
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
    const attachmentTarget = canAttachVisionCone(ability)
      ? findVisionConeAttachmentTarget({
          point: nextPoint,
          agentsOnCanvas,
          abilitiesOnCanvas,
          toolIconsOnCanvas,
          agentsSettings,
          abilitiesSettings,
          excludeId: ability.id,
        })
      : null;

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

  const handleNodeDragMoveRef = useRef<
    ((event: KonvaEventObject<DragEvent>, ability: AbilityCanvas) => void) | null
  >(null);

  handleNodeDragMoveRef.current = (event, ability) => {
    handleDragMove(event, deleteGroupRef);
    syncAttachedVisionConeNodePositions({
      hostId: ability.id,
      hostNode: event.target,
      abilitiesOnCanvas,
      getRegisteredNode,
    });
    selectionDrag.handleDragMove(event);
  };

  const handleNodeDragEndRef = useRef<
    ((event: KonvaEventObject<DragEvent>, ability: AbilityCanvas) => void) | null
  >(null);

  handleNodeDragEndRef.current = (event, ability) => {
    if (selectionDrag.handleDragEnd(event)) return;

    if (isVisionConeAction(ability.action)) {
      handleVisionConeDragEnd(event, ability);
      return;
    }

    handleDragEnd(
      event,
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
  };

  const handleNodeDragMove = useCallback(
    (event: KonvaEventObject<DragEvent>, ability: AbilityCanvas) => {
      handleNodeDragMoveRef.current?.(event, ability);
    },
    [],
  );

  const handleNodeDragEnd = useCallback(
    (event: KonvaEventObject<DragEvent>, ability: AbilityCanvas) => {
      handleNodeDragEndRef.current?.(event, ability);
    },
    [],
  );

  const handleHoverEnter = useCallback(
    (id: string) => setHoveredElementId(id),
    [setHoveredElementId],
  );

  const handleHoverLeave = useCallback(
    () => setHoveredElementId(null),
    [setHoveredElementId],
  );

  const handleInteractionEnd = useCallback(
    (ability: AbilityCanvas, data: object) =>
      notifyAbilityMoved({ ...ability, ...data }),
    [notifyAbilityMoved],
  );

  const orderedAbilities = useMemo(
    () =>
      [...abilitiesOnCanvas].sort((left, right) => {
        const leftAttached = isAttachedVisionCone(left);
        const rightAttached = isAttachedVisionCone(right);

        if (leftAttached === rightAttached) {
          return 0;
        }

        return leftAttached ? -1 : 1;
      }),
    [abilitiesOnCanvas],
  );

  const isHoverEnabled = !selectedCanvasIcon && !editingTextId;

  return orderedAbilities.map((ability) => {
    if (isSidebarDragActive && ability.id === TEMP_DRAG_ID) {
      return null;
    }

    const attachmentHost = canAttachVisionCone(ability)
      ? findVisionConeAttachmentHost({
          attachedToId: ability.attachedToId,
          agentsOnCanvas,
          abilitiesOnCanvas,
          toolIconsOnCanvas,
          excludeId: ability.id,
        })
      : null;
    const isAttached = canAttachVisionCone(ability) && attachmentHost !== null;

    const lookupEntry = ABILITY_LOOKUP[ability.name];
    if (!lookupEntry) {
      console.warn(
        `[Canvas] ABILITY_LOOKUP missing entry for "${ability.name}", available keys:`,
        Object.keys(ABILITY_LOOKUP),
      );
    }

    return (
      <AbilityNode
        key={ability.id}
        ability={ability}
        x={attachmentHost?.x ?? ability.x}
        y={attachmentHost?.y ?? ability.y}
        isAttached={isAttached}
        src={lookupEntry?.src}
        mapPosition={mapPosition}
        abilitiesSettings={abilitiesSettings}
        isDrawMode={isDrawMode}
        editingTextId={editingTextId}
        isHoverEnabled={isHoverEnabled}
        registerNode={registerNode}
        unregisterNode={unregisterNode}
        onHoverEnter={handleHoverEnter}
        onHoverLeave={handleHoverLeave}
        onDragMove={handleNodeDragMove}
        onDragEnd={handleNodeDragEnd}
        onInteractionEnd={handleInteractionEnd}
      />
    );
  });
});
