import { CanvasIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import {
  getAttachedVisionConeIds,
  syncAttachedVisionConeNodePositions,
} from "@/lib/vision-cone-utils";
import {
  canAttachToolIcon,
  findToolIconAttachmentTarget,
  getToolIconAttachmentPosition,
} from "@/lib/tool-icon";
import { handleDragEnd, handleDragMove } from "@/lib/utils";
import { TEMP_DRAG_ID } from "@/lib/consts";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group } from "react-konva";

interface CanvasToolIconsProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
}

export const CanvasToolIcons = ({ deleteGroupRef }: CanvasToolIconsProps) => {
  const {
    toolIconsOnCanvas,
    setToolIconsOnCanvas,
    agentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    isDrawMode,
    registerNode,
    unregisterNode,
    getRegisteredNode,
    setHoveredElementId,
    selectedCanvasIcon,
    editingTextId,
    isSidebarDragActive,
  } = useCanvas();

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
    toolIcon: (typeof toolIconsOnCanvas)[number],
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

  return toolIconsOnCanvas.map((toolIcon) => {
    if (isSidebarDragActive && toolIcon.id === TEMP_DRAG_ID) {
      return null;
    }

    return (
      <Group
        key={toolIcon.id}
        onMouseEnter={() =>
          !selectedCanvasIcon &&
          !editingTextId &&
          setHoveredElementId(toolIcon.id)
        }
        onMouseLeave={() =>
          !selectedCanvasIcon && !editingTextId && setHoveredElementId(null)
        }
      >
        <CanvasIcon
          id={toolIcon.id}
          isAlly={true}
          x={toolIcon.x}
          y={toolIcon.y}
          src={`/tools/${toolIcon.name}.webp`}
          draggable={!isDrawMode && !editingTextId}
          isListening={!isDrawMode && !editingTextId}
          onDragMove={(e) => {
            handleDragMove(e, deleteGroupRef);
            syncAttachedVisionConeNodePositions({
              hostId: toolIcon.id,
              hostNode: e.target,
              abilitiesOnCanvas,
              getRegisteredNode,
            });
          }}
          onDragEnd={(e) => handleToolIconDragEnd(e, toolIcon)}
          width={toolIcon.width}
          height={toolIcon.height}
          borderOpacity={0}
          strokeWidth={0}
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
};
