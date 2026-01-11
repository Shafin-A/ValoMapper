import { AbilityIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
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
    agentsOnCanvas,
    setAgentsOnCanvas,
    connectingLines,
    setConnectingLines,
    isDrawMode,
    setHoveredElementId,
    selectedCanvasIcon,
  } = useCanvas();

  const { abilitiesSettings } = useSettings();

  return abilitiesOnCanvas.map((ability) => (
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
        src={ABILITY_LOOKUP[ability.name].src}
        draggable={!isDrawMode}
        isListening={!isDrawMode}
        onDragMove={(e) => handleDragMove(e, deleteGroupRef)}
        onDragEnd={(e) =>
          handleDragEnd(
            e,
            ability,
            setAbilitiesOnCanvas,
            deleteGroupRef,
            connectingLines,
            setConnectingLines,
            (connectedId) =>
              setAgentsOnCanvas((prev) =>
                prev.filter((a) => a.id !== connectedId)
              )
          )
        }
        width={abilitiesSettings.scale}
        height={abilitiesSettings.scale}
        borderOpacity={abilitiesSettings.borderOpacity}
        strokeWidth={abilitiesSettings.borderWidth}
        radius={abilitiesSettings.radius}
        allyColor={abilitiesSettings.allyColor}
        enemyColor={abilitiesSettings.enemyColor}
        currentPath={ability.currentPath}
        currentLength={ability.currentLength}
      />
    </Group>
  ));
};
