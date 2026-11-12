import { CanvasIcon } from "@/components/canvas-icons";
import {
  useCanvasAbilities,
  useCanvasActions,
  useCanvasAgents,
  useCanvasToolIcons,
  useCanvasUi,
} from "@/contexts/canvas-context";
import { useSetHoveredElementId } from "@/contexts/hover-context";
import { useSettings } from "@/contexts/settings-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import type { SelectionDragController } from "@/hooks/canvas/use-canvas-selection-drag";
import {
  getAttachedVisionConeIds,
  syncAttachedVisionConeNodePositions,
} from "@/lib/vision-cone-utils";
import {
  canAttachToolIcon,
  findToolIconAttachmentTarget,
  getToolIconAttachmentPosition,
} from "@/lib/tool-icon";
import { handleDragEnd, handleDragMove } from "@/lib/konva-drag";
import { useCommitCount } from "@/lib/perf-beacon";
import type { ToolIconCanvas } from "@/lib/types";
import {
  TEMP_DRAG_ID,
  TOOL_ICON_CONTOUR_COLOR,
  TOOL_ICON_CONTOUR_WIDTH,
} from "@/lib/consts";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { memo, useCallback, useRef } from "react";
import { Group } from "react-konva";

interface CanvasToolIconsProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
  selectionDrag: SelectionDragController;
}

interface ToolIconNodeProps {
  toolIcon: ToolIconCanvas;
  isDrawMode: boolean;
  editingTextId: string | null;
  isHoverEnabled: boolean;
  registerNode: (id: string, node: Konva.Node) => void;
  unregisterNode: (id: string) => void;
  onHoverEnter: (id: string) => void;
  onHoverLeave: () => void;
  onDragMove: (
    event: KonvaEventObject<DragEvent>,
    toolIcon: ToolIconCanvas,
  ) => void;
  onDragEnd: (
    event: KonvaEventObject<DragEvent>,
    toolIcon: ToolIconCanvas,
  ) => void;
}

const ToolIconNode = memo(function ToolIconNode({
  toolIcon,
  isDrawMode,
  editingTextId,
  isHoverEnabled,
  registerNode,
  unregisterNode,
  onHoverEnter,
  onHoverLeave,
  onDragMove,
  onDragEnd,
}: ToolIconNodeProps) {
  return (
    <Group
      onMouseEnter={() => isHoverEnabled && onHoverEnter(toolIcon.id)}
      onMouseLeave={() => isHoverEnabled && onHoverLeave()}
    >
      <CanvasIcon
        id={toolIcon.id}
        isAlly={true}
        x={toolIcon.x}
        y={toolIcon.y}
        src={`/tools/${toolIcon.name}.webp`}
        draggable={!isDrawMode && !editingTextId}
        isListening={!isDrawMode && !editingTextId}
        onDragMove={(event) => onDragMove(event, toolIcon)}
        onDragEnd={(event) => onDragEnd(event, toolIcon)}
        width={toolIcon.width}
        height={toolIcon.height}
        borderOpacity={0}
        strokeWidth={0}
        contourColor={TOOL_ICON_CONTOUR_COLOR}
        contourWidth={TOOL_ICON_CONTOUR_WIDTH}
        radius={0}
        fill=""
        allyColor={"#ffffff"}
        enemyColor={"#ffffff"}
        registerNode={registerNode}
        unregisterNode={unregisterNode}
        hasShadow={true}
      />
    </Group>
  );
});

export const CanvasToolIcons = memo(function CanvasToolIcons({
  deleteGroupRef,
  selectionDrag,
}: CanvasToolIconsProps) {
  useCommitCount("CanvasToolIcons");

  const { toolIconsOnCanvas, setToolIconsOnCanvas } = useCanvasToolIcons();
  const { agentsOnCanvas } = useCanvasAgents();
  const { abilitiesOnCanvas, setAbilitiesOnCanvas } = useCanvasAbilities();

  const { isDrawMode, selectedCanvasIcon, editingTextId, isSidebarDragActive } =
    useCanvasUi();

  const { registerNode, unregisterNode, getRegisteredNode } =
    useCanvasActions();

  const setHoveredElementId = useSetHoveredElementId();

  const { agentsSettings } = useSettings();
  const { notifyToolIconMoved, notifyToolIconRemoved, notifyAbilityRemoved } =
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

  const handleToolIconDragEnd = (
    e: KonvaEventObject<DragEvent>,
    toolIcon: ToolIconCanvas,
  ) => {
    const target = e.target;
    const isOverDeleteGroup = target.getAttr("isOverDeleteGroup");

    handleDragEnd(
      e,
      toolIcon,
      setToolIconsOnCanvas,
      deleteGroupRef,
      undefined,
      undefined,
      undefined,
      notifyToolIconRemoved,
      notifyToolIconMoved,
      () => removeAttachedVisionCones(toolIcon.id),
    );

    if (isOverDeleteGroup) {
      return;
    }

    const x = target.x();
    const y = target.y();
    if (!canAttachToolIcon(toolIcon)) {
      if (toolIcon.attachedToId) {
        const updatedIcon = { ...toolIcon, attachedToId: undefined };
        setToolIconsOnCanvas((prev) =>
          prev.map((icon) => (icon.id === toolIcon.id ? updatedIcon : icon)),
        );
        notifyToolIconMoved(updatedIcon);
      }
      return;
    }

    const attachmentHost = findToolIconAttachmentTarget({
      point: { x, y },
      agentsOnCanvas,
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
      : { x, y };

    const updatedIcon = {
      ...toolIcon,
      x: nextPosition.x,
      y: nextPosition.y,
      attachedToId: attachmentHost?.id,
    };

    setToolIconsOnCanvas((prev) =>
      prev.map((icon) => (icon.id === toolIcon.id ? updatedIcon : icon)),
    );
    notifyToolIconMoved(updatedIcon);
  };

  const handleNodeDragMoveRef = useRef<
    ((event: KonvaEventObject<DragEvent>, toolIcon: ToolIconCanvas) => void) | null
  >(null);

  handleNodeDragMoveRef.current = (event, toolIcon) => {
    handleDragMove(event, deleteGroupRef);
    syncAttachedVisionConeNodePositions({
      hostId: toolIcon.id,
      hostNode: event.target,
      abilitiesOnCanvas,
      getRegisteredNode,
    });
    selectionDrag.handleDragMove(event);
  };

  const handleNodeDragEndRef = useRef<
    ((event: KonvaEventObject<DragEvent>, toolIcon: ToolIconCanvas) => void) | null
  >(null);

  handleNodeDragEndRef.current = (event, toolIcon) => {
    if (selectionDrag.handleDragEnd(event)) return;
    handleToolIconDragEnd(event, toolIcon);
  };

  const handleNodeDragMove = useCallback(
    (event: KonvaEventObject<DragEvent>, toolIcon: ToolIconCanvas) => {
      handleNodeDragMoveRef.current?.(event, toolIcon);
    },
    [],
  );

  const handleNodeDragEnd = useCallback(
    (event: KonvaEventObject<DragEvent>, toolIcon: ToolIconCanvas) => {
      handleNodeDragEndRef.current?.(event, toolIcon);
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

  return toolIconsOnCanvas.map((toolIcon) => {
    if (isSidebarDragActive && toolIcon.id === TEMP_DRAG_ID) {
      return null;
    }

    return (
      <ToolIconNode
        key={toolIcon.id}
        toolIcon={toolIcon}
        isDrawMode={isDrawMode}
        editingTextId={editingTextId}
        isHoverEnabled={isHoverEnabled}
        registerNode={registerNode}
        unregisterNode={unregisterNode}
        onHoverEnter={handleHoverEnter}
        onHoverLeave={handleHoverLeave}
        onDragMove={handleNodeDragMove}
        onDragEnd={handleNodeDragEnd}
      />
    );
  });
});
