import { AbilityIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { handleDragEnd } from "@/lib/utils";

export const CanvasAbilities = () => {
  const { abilitiesOnCanvas, setAbilitiesOnCanvas, isDrawMode } = useCanvas();

  const { abilitiesSettings } = useSettings();

  return abilitiesOnCanvas.map((ability) => (
    <AbilityIcon
      key={ability.id}
      id={ability.id}
      isAlly={ability.isAlly}
      action={ability.action}
      x={ability.x}
      y={ability.y}
      rotation={ability.currentRotation}
      src={ability.src}
      draggable={!isDrawMode}
      isListening={!isDrawMode}
      onDragEnd={(e) => handleDragEnd(e, ability, setAbilitiesOnCanvas)}
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
  ));
};
