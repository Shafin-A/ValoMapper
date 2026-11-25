import { Layer, Stage } from "react-konva";
import { AbilityIcon, CanvasIcon } from "@/components/canvas-icons";
import { useCanvasScale } from "@/contexts/canvas-context";
import { getAgentImgSrc } from "@/lib/assets";
import { ABILITY_LOOKUP } from "@/lib/consts/configs/agent-icon/consts";
import { TEMP_DRAG_ID } from "@/lib/consts";
import { isAgent } from "@/lib/utils";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  IconSettings,
  ToolIconCanvas,
} from "@/lib/types";

interface AgentsDragPreviewProps {
  position: { x: number; y: number };
  viewportSize: { width: number; height: number };
  selectedCanvasIcon: Agent | AbilityIconItem | ToolIconCanvas;
  tempDragAgent: AgentCanvas | undefined;
  tempDragAbility: AbilityCanvas | undefined;
  agentsSettings: IconSettings;
  abilitiesSettings: IconSettings;
}

export const AgentsDragPreview = ({
  position,
  viewportSize,
  selectedCanvasIcon,
  tempDragAgent,
  tempDragAbility,
  agentsSettings,
  abilitiesSettings,
}: AgentsDragPreviewProps) => {
  const { currentStageScale } = useCanvasScale();
  const previewScale = currentStageScale > 0 ? currentStageScale : 1;
  const dragPreviewX = position.x / previewScale;
  const dragPreviewY = position.y / previewScale;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-120"
      style={{ inset: 0 }}
    >
      <Stage
        width={viewportSize.width}
        height={viewportSize.height}
        scaleX={previewScale}
        scaleY={previewScale}
      >
        <Layer listening={false}>
          {tempDragAgent && isAgent(selectedCanvasIcon) && (
            <CanvasIcon
              id={TEMP_DRAG_ID}
              isAlly={tempDragAgent.isAlly}
              x={dragPreviewX}
              y={dragPreviewY}
              src={getAgentImgSrc(selectedCanvasIcon.name)}
              isListening={false}
              draggable={false}
              width={agentsSettings.scale}
              height={agentsSettings.scale}
              borderOpacity={agentsSettings.borderOpacity}
              strokeWidth={agentsSettings.borderWidth}
              radius={agentsSettings.radius}
              allyColor={agentsSettings.allyColor}
              enemyColor={agentsSettings.enemyColor}
            />
          )}

          {tempDragAbility && !isAgent(selectedCanvasIcon) && (
            <AbilityIcon
              id={TEMP_DRAG_ID}
              isAlly={tempDragAbility.isAlly}
              action={tempDragAbility.action}
              x={dragPreviewX}
              y={dragPreviewY}
              rotation={tempDragAbility.currentRotation}
              src={ABILITY_LOOKUP[tempDragAbility.name].src}
              isListening={false}
              draggable={false}
              width={abilitiesSettings.scale}
              height={abilitiesSettings.scale}
              borderOpacity={abilitiesSettings.borderOpacity}
              strokeWidth={abilitiesSettings.borderWidth}
              radius={abilitiesSettings.radius}
              allyColor={abilitiesSettings.allyColor}
              enemyColor={abilitiesSettings.enemyColor}
              currentPath={tempDragAbility.currentPath}
              currentLength={tempDragAbility.currentLength}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};
