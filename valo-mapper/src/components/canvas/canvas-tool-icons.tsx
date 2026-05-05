import { CanvasIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import {
  getAttachedVisionConeIds,
  syncAttachedVisionConeNodePositions,
} from "@/lib/vision-cone-utils";
import { handleDragEnd, handleDragMove } from "@/lib/utils";
import { TEMP_DRAG_ID } from "@/lib/consts";
import Konva from "konva";
import { Group } from "react-konva";

interface CanvasToolIconsProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
}

export const CanvasToolIcons = ({ deleteGroupRef }: CanvasToolIconsProps) => {
  const {
    toolIconsOnCanvas,
    setToolIconsOnCanvas,
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
          onDragEnd={(e) => {
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
          }}
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
        />
      </Group>
    );
  });
};
