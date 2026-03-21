import { AbilityIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { TEMP_DRAG_ID } from "@/lib/consts";
import { ABILITY_LOOKUP } from "@/lib/consts/configs/agent-icon/consts";
import { handleDragEnd, handleDragMove } from "@/lib/utils";
import Konva from "konva";
import { Group } from "react-konva";

interface CanvasAbilityProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
}

export const CanvasAbilities = ({ deleteGroupRef }: CanvasAbilityProps) => {
  const {
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    setAgentsOnCanvas,
    connectingLines,
    setConnectingLines,
    isDrawMode,
    setHoveredElementId,
    selectedCanvasIcon,
    isSidebarDragActive,
  } = useCanvas();

  const { abilitiesSettings } = useSettings();
  const { notifyAbilityMoved, notifyAbilityRemoved } = useCollaborativeCanvas();

  return abilitiesOnCanvas.map((ability) => {
    if (isSidebarDragActive && ability.id === TEMP_DRAG_ID) {
      return null;
    }

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
          !selectedCanvasIcon && setHoveredElementId(ability.id)
        }
        onMouseLeave={() => !selectedCanvasIcon && setHoveredElementId(null)}
      >
        <AbilityIcon
          id={ability.id}
          isAlly={ability.isAlly}
          action={ability.action}
          x={ability.x}
          y={ability.y}
          rotation={ability.currentRotation}
          src={lookupEntry?.src}
          draggable={!isDrawMode}
          isListening={!isDrawMode}
          onDragMove={(e) => handleDragMove(e, deleteGroupRef)}
          onDragEnd={(e) => {
            handleDragEnd(
              e,
              ability,
              setAbilitiesOnCanvas,
              deleteGroupRef,
              connectingLines,
              setConnectingLines,
              (connectedId) =>
                setAgentsOnCanvas((prev) =>
                  prev.filter((a) => a.id !== connectedId),
                ),
              notifyAbilityRemoved,
              notifyAbilityMoved,
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
          onInteractionEnd={(data) => {
            notifyAbilityMoved({ ...ability, ...data });
          }}
        />
      </Group>
    );
  });
};
