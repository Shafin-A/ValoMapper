import { CanvasIcon } from "@/components/canvas-icons";
import {
  useCanvasAbilities,
  useCanvasActions,
  useCanvasAgents,
  useCanvasConnectingLines,
  useCanvasToolIcons,
  useCanvasUi,
} from "@/contexts/canvas-context";
import { useSetHoveredElementId } from "@/contexts/hover-context";
import { useSettings } from "@/contexts/settings-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import type { SelectionDragController } from "@/hooks/canvas/use-canvas-selection-drag";
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
import { useCommitCount } from "@/lib/perf-beacon";
import type { AgentCanvas, IconSettings } from "@/lib/types";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { memo, useCallback, useRef } from "react";
import { Group } from "react-konva";

interface CanvasAgentProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
  selectionDrag: SelectionDragController;
}

interface AgentNodeProps {
  agent: AgentCanvas;
  agentsSettings: IconSettings;
  isDrawMode: boolean;
  editingTextId: string | null;
  isHoverEnabled: boolean;
  registerNode: (id: string, node: Konva.Node) => void;
  unregisterNode: (id: string) => void;
  onHoverEnter: (id: string) => void;
  onHoverLeave: () => void;
  onDragMove: (
    event: KonvaEventObject<DragEvent>,
    agent: AgentCanvas,
  ) => void;
  onDragEnd: (event: KonvaEventObject<DragEvent>, agent: AgentCanvas) => void;
}

const AgentNode = memo(function AgentNode({
  agent,
  agentsSettings,
  isDrawMode,
  editingTextId,
  isHoverEnabled,
  registerNode,
  unregisterNode,
  onHoverEnter,
  onHoverLeave,
  onDragMove,
  onDragEnd,
}: AgentNodeProps) {
  return (
    <Group
      onMouseEnter={() => isHoverEnabled && onHoverEnter(agent.id)}
      onMouseLeave={() => isHoverEnabled && onHoverLeave()}
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
        onDragMove={(event) => onDragMove(event, agent)}
        onDragEnd={(event) => onDragEnd(event, agent)}
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

export const CanvasAgents = memo(function CanvasAgents({
  deleteGroupRef,
  selectionDrag,
}: CanvasAgentProps) {
  useCommitCount("CanvasAgents");

  const { agentsOnCanvas, setAgentsOnCanvas } = useCanvasAgents();
  const { abilitiesOnCanvas, setAbilitiesOnCanvas } = useCanvasAbilities();
  const { toolIconsOnCanvas, setToolIconsOnCanvas } = useCanvasToolIcons();
  const { connectingLines, setConnectingLines } = useCanvasConnectingLines();

  const { isDrawMode, selectedCanvasIcon, isSidebarDragActive, editingTextId } =
    useCanvasUi();

  const { registerNode, unregisterNode, getRegisteredNode } =
    useCanvasActions();

  const setHoveredElementId = useSetHoveredElementId();

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
    agent: AgentCanvas,
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

  const handleAgentNodeDragMoveRef = useRef<
    ((event: KonvaEventObject<DragEvent>, agent: AgentCanvas) => void) | null
  >(null);

  handleAgentNodeDragMoveRef.current = (event, agent) => {
    handleDragMove(event, deleteGroupRef);
    syncAttachedVisionConeNodePositions({
      hostId: agent.id,
      hostNode: event.target,
      abilitiesOnCanvas,
      getRegisteredNode,
    });
    syncAttachedToolIconNodePositions({
      hostId: agent.id,
      hostNode: event.target,
      toolIconsOnCanvas,
      agentsSettings,
      getRegisteredNode,
    });
    selectionDrag.handleDragMove(event);
  };

  const handleAgentNodeDragEndRef = useRef<
    ((event: KonvaEventObject<DragEvent>, agent: AgentCanvas) => void) | null
  >(null);

  handleAgentNodeDragEndRef.current = (event, agent) => {
    if (selectionDrag.handleDragEnd(event)) return;
    handleAgentDragEnd(event, agent);
  };

  const handleAgentNodeDragMove = useCallback(
    (event: KonvaEventObject<DragEvent>, agent: AgentCanvas) => {
      handleAgentNodeDragMoveRef.current?.(event, agent);
    },
    [],
  );

  const handleAgentNodeDragEnd = useCallback(
    (event: KonvaEventObject<DragEvent>, agent: AgentCanvas) => {
      handleAgentNodeDragEndRef.current?.(event, agent);
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

  const isHoverEnabled = !selectedCanvasIcon && !editingTextId;

  return agentsOnCanvas.map((agent) => {
    if (isSidebarDragActive && agent.id === TEMP_DRAG_ID) {
      return null;
    }

    return (
      <AgentNode
        key={agent.id}
        agent={agent}
        agentsSettings={agentsSettings}
        isDrawMode={isDrawMode}
        editingTextId={editingTextId}
        isHoverEnabled={isHoverEnabled}
        registerNode={registerNode}
        unregisterNode={unregisterNode}
        onHoverEnter={handleHoverEnter}
        onHoverLeave={handleHoverLeave}
        onDragMove={handleAgentNodeDragMove}
        onDragEnd={handleAgentNodeDragEnd}
      />
    );
  });
});
