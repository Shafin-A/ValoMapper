import { CanvasIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { TEMP_DRAG_ID } from "@/lib/consts";
import { getAgentImgSrc, handleDragEnd, handleDragMove } from "@/lib/utils";
import Konva from "konva";
import { Group } from "react-konva";

interface CanvasAgentProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
}

export const CanvasAgents = ({ deleteGroupRef }: CanvasAgentProps) => {
  const {
    agentsOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    connectingLines,
    setConnectingLines,
    isDrawMode,
    registerNode,
    unregisterNode,
    setHoveredElementId,
    selectedCanvasIcon,
    isSidebarDragActive,
    editingTextId,
  } = useCanvas();

  const { agentsSettings } = useSettings();
  const { notifyAgentMoved, notifyAgentRemoved } = useCollaborativeCanvas();

  return agentsOnCanvas.map((agent) => {
    if (isSidebarDragActive && agent.id === TEMP_DRAG_ID) {
      return null;
    }

    return (
      <Group
        key={agent.id}
        onMouseEnter={() =>
          !selectedCanvasIcon && !editingTextId && setHoveredElementId(agent.id)
        }
        onMouseLeave={() =>
          !selectedCanvasIcon && !editingTextId && setHoveredElementId(null)
        }
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
          onDragMove={(e) => handleDragMove(e, deleteGroupRef)}
          onDragEnd={(e) => {
            handleDragEnd(
              e,
              agent,
              setAgentsOnCanvas,
              deleteGroupRef,
              connectingLines,
              setConnectingLines,
              (connectedId) =>
                setAbilitiesOnCanvas((prev) =>
                  prev.filter((a) => a.id !== connectedId),
                ),
              notifyAgentRemoved,
              notifyAgentMoved,
            );
          }}
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
};
