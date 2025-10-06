import { CanvasIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { handleDragEnd } from "@/lib/utils";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";

interface CanvasAgentProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
}

export const CanvasAgents = ({ deleteGroupRef }: CanvasAgentProps) => {
  const { agentsOnCanvas, setAgentsOnCanvas, isDrawMode } = useCanvas();

  const { agentsSettings } = useSettings();

  const handleDragMove = (
    e: KonvaEventObject<DragEvent>,
    deleteGroupRef: React.RefObject<Konva.Group | null>
  ) => {
    const node = e.target;
    const pos = node.position();

    if (deleteGroupRef.current) {
      const deleteGroup = deleteGroupRef.current;
      const deleteZone = {
        x: deleteGroup.x(),
        y: deleteGroup.y(),
        width: deleteGroup.width(),
        height: deleteGroup.height(),
      };

      const isOver =
        pos.x >= deleteZone.x &&
        pos.x <= deleteZone.x + deleteZone.width &&
        pos.y >= deleteZone.y &&
        pos.y <= deleteZone.y + deleteZone.height;

      deleteGroup.opacity(isOver ? 0.8 : 0.5);

      node.setAttr("isOverDeleteGroup", isOver);
    }
  };

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
      onDragMove={(e) => handleDragMove(e, deleteGroupRef)}
      onDragEnd={(e) =>
        handleDragEnd(e, agent, setAgentsOnCanvas, deleteGroupRef)
      }
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
