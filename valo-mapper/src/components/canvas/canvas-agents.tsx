import { CanvasIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { handleDragEnd } from "@/lib/utils";

export const CanvasAgents = () => {
  const { agentsOnCanvas, setAgentsOnCanvas, isDrawMode } = useCanvas();

  const { agentsSettings } = useSettings();

  return agentsOnCanvas.map((agent) => (
    <CanvasIcon
      key={agent.id}
      id={agent.id}
      isAlly={agent.isAlly}
      x={agent.x}
      y={agent.y}
      src={agent.src}
      draggable={!isDrawMode}
      isListening={!isDrawMode}
      onDragEnd={(e) => handleDragEnd(e, agent, setAgentsOnCanvas)}
      width={agentsSettings.scale}
      height={agentsSettings.scale}
      borderOpacity={agentsSettings.borderOpacity}
      strokeWidth={agentsSettings.borderWidth}
      radius={agentsSettings.radius}
      allyColor={agentsSettings.allyColor}
      enemyColor={agentsSettings.enemyColor}
    />
  ));
};
